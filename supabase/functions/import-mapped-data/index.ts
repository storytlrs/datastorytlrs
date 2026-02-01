import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ColumnMapping {
  sourceColumn: string;
  targetTable: "creators" | "content" | "promo_codes";
  targetField: string;
}

interface ImportRequest {
  reportId: string;
  fileName: string;
  mappings: ColumnMapping[];
  rows: Record<string, any>[];
}

// Extract handle from markdown link [handle](url)
const extractHandle = (value: any): string => {
  if (!value) return "";
  const str = String(value);
  const match = str.match(/\[([^\]]+)\]/);
  return match ? match[1] : str.trim();
};

// Infer platform from URL
const inferPlatform = (url: string): string => {
  if (!url) return "instagram";
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("facebook.com")) return "facebook";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  return "instagram";
};

// Infer content type from value
const inferContentType = (value: any): string => {
  if (!value) return "post";
  const str = String(value).toLowerCase();
  if (str.includes("reel")) return "reel";
  if (str.includes("story") || str.includes("stories")) return "story";
  if (str.includes("short")) return "short";
  if (str.includes("video")) return "video";
  return "post";
};

// Parse numeric value
const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

// Parse date value
const parseDate = (value: any): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    const { reportId, fileName, mappings, rows } = body;

    if (!reportId || !mappings || !rows) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting import for report ${reportId}: ${rows.length} rows, ${mappings.length} mappings`);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("data_imports")
      .insert({
        report_id: reportId,
        file_name: fileName || "upload.xlsx",
        file_type: fileName?.endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        source: "xlsx",
        status: "processing",
        uploaded_by: user.id,
        mapping_config: { mappings },
      })
      .select()
      .single();

    if (importError) {
      console.error("Import record error:", importError);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let rowsImported = 0;
    let rowsFailed = 0;

    try {
      // Group mappings by table
      const creatorMappings = mappings.filter(m => m.targetTable === "creators");
      const contentMappings = mappings.filter(m => m.targetTable === "content");
      const promoMappings = mappings.filter(m => m.targetTable === "promo_codes");

      // Find key columns for linking
      const creatorHandleColumn = creatorMappings.find(m => m.targetField === "handle")?.sourceColumn;
      const creatorPlatformColumn = creatorMappings.find(m => m.targetField === "platform")?.sourceColumn;
      const contentCreatorColumn = contentMappings.find(m => m.targetField === "creator_handle")?.sourceColumn;
      const contentPlatformColumn = contentMappings.find(m => m.targetField === "content_platform")?.sourceColumn;
      const promoCreatorColumn = promoMappings.find(m => m.targetField === "promo_creator_handle")?.sourceColumn;

      // Track created creators for linking
      const creatorCache = new Map<string, string>(); // "handle|platform" -> creator_id

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 for 1-indexed + header row

        try {
          // --- Process Creators ---
          if (creatorMappings.length > 0 && creatorHandleColumn) {
            const handle = extractHandle(row[creatorHandleColumn]);
            if (handle) {
              // Determine platform
              let platform = "instagram";
              if (creatorPlatformColumn && row[creatorPlatformColumn]) {
                platform = String(row[creatorPlatformColumn]).toLowerCase().trim();
              } else {
                // Try to infer from profile_url if mapped
                const profileUrlColumn = creatorMappings.find(m => m.targetField === "profile_url")?.sourceColumn;
                if (profileUrlColumn && row[profileUrlColumn]) {
                  platform = inferPlatform(row[profileUrlColumn]);
                }
              }

              const cacheKey = `${handle}|${platform}`;
              
              if (!creatorCache.has(cacheKey)) {
                // Build creator data
                const creatorData: Record<string, any> = {
                  report_id: reportId,
                  handle,
                  platform,
                };

                // Map other fields
                creatorMappings.forEach(mapping => {
                  if (mapping.targetField !== "handle" && mapping.targetField !== "platform") {
                    const value = row[mapping.sourceColumn];
                    if (value !== null && value !== undefined && value !== "") {
                      // Handle numeric fields
                      if (["followers", "posts_count", "reels_count", "stories_count", "avg_reach", "avg_views"].includes(mapping.targetField)) {
                        creatorData[mapping.targetField] = parseNumber(value);
                      } else if (["posts_cost", "reels_cost", "stories_cost", "avg_engagement_rate"].includes(mapping.targetField)) {
                        creatorData[mapping.targetField] = parseNumber(value);
                      } else {
                        creatorData[mapping.targetField] = String(value).trim();
                      }
                    }
                  }
                });

                // Upsert creator
                const { data: creator, error: creatorError } = await supabase
                  .from("creators")
                  .upsert(creatorData, { onConflict: "report_id,handle,platform" })
                  .select("id")
                  .single();

                if (creatorError) {
                  console.error(`Row ${rowNum} creator error:`, creatorError);
                  warnings.push(`Row ${rowNum}: Failed to create/update creator ${handle}`);
                } else if (creator) {
                  creatorCache.set(cacheKey, creator.id);
                  rowsImported++;
                }
              }
            }
          }

          // --- Process Content ---
          if (contentMappings.length > 0) {
            const creatorHandle = contentCreatorColumn ? extractHandle(row[contentCreatorColumn]) : null;
            
            if (creatorHandle) {
              // Determine platform for content
              let platform = "instagram";
              if (contentPlatformColumn && row[contentPlatformColumn]) {
                platform = String(row[contentPlatformColumn]).toLowerCase().trim();
              } else {
                // Try to infer from URL
                const urlColumn = contentMappings.find(m => m.targetField === "url")?.sourceColumn;
                if (urlColumn && row[urlColumn]) {
                  platform = inferPlatform(row[urlColumn]);
                }
              }

              // Find or create creator
              const cacheKey = `${creatorHandle}|${platform}`;
              let creatorId = creatorCache.get(cacheKey);

              if (!creatorId) {
                // Try to find existing creator
                const { data: existingCreator } = await supabase
                  .from("creators")
                  .select("id")
                  .eq("report_id", reportId)
                  .eq("handle", creatorHandle)
                  .eq("platform", platform)
                  .maybeSingle();

                if (existingCreator) {
                  creatorId = existingCreator.id;
                  creatorCache.set(cacheKey, creatorId as string);
                } else {
                  // Create new creator
                  const { data: newCreator, error: newCreatorError } = await supabase
                    .from("creators")
                    .insert({
                      report_id: reportId,
                      handle: creatorHandle,
                      platform,
                    })
                    .select("id")
                    .single();

                  if (newCreatorError) {
                    warnings.push(`Row ${rowNum}: Failed to create creator for content`);
                  } else if (newCreator) {
                    creatorId = newCreator.id;
                    creatorCache.set(cacheKey, creatorId as string);
                  }
                }
              }

              if (creatorId) {
                // Determine content type
                let contentType = "post";
                const typeColumn = contentMappings.find(m => m.targetField === "content_type")?.sourceColumn;
                if (typeColumn && row[typeColumn]) {
                  contentType = inferContentType(row[typeColumn]);
                } else {
                  // Try to infer from URL
                  const urlColumn = contentMappings.find(m => m.targetField === "url")?.sourceColumn;
                  if (urlColumn && row[urlColumn]) {
                    contentType = inferContentType(row[urlColumn]);
                  }
                }

                // Build content data
                const contentData: Record<string, any> = {
                  report_id: reportId,
                  creator_id: creatorId,
                  platform,
                  content_type: contentType,
                };

                // Map other fields
                contentMappings.forEach(mapping => {
                  if (!["creator_handle", "content_platform", "content_type"].includes(mapping.targetField)) {
                    const value = row[mapping.sourceColumn];
                    if (value !== null && value !== undefined && value !== "") {
                      const field = mapping.targetField;
                      
                      // Handle numeric fields
                      if (["reach", "impressions", "views", "likes", "comments", "shares", "saves", "reposts", "sticker_clicks", "link_clicks", "watch_time", "avg_watch_time"].includes(field)) {
                        contentData[field] = parseNumber(value);
                      } else if (["engagement_rate", "views_3s"].includes(field)) {
                        contentData[field] = parseNumber(value);
                      } else if (field === "published_date") {
                        contentData[field] = parseDate(value);
                      } else if (field === "sentiment") {
                        const sentiment = String(value).toLowerCase().trim();
                        if (["positive", "negative", "neutral"].includes(sentiment)) {
                          contentData[field] = sentiment;
                        }
                      } else {
                        contentData[field] = String(value).trim();
                      }
                    }
                  }
                });

                // Insert content
                const { error: contentError } = await supabase
                  .from("content")
                  .insert(contentData);

                if (contentError) {
                  console.error(`Row ${rowNum} content error:`, contentError);
                  warnings.push(`Row ${rowNum}: Failed to create content`);
                  rowsFailed++;
                } else {
                  rowsImported++;
                }
              }
            }
          }

          // --- Process Promo Codes ---
          if (promoMappings.length > 0) {
            const codeColumn = promoMappings.find(m => m.targetField === "code")?.sourceColumn;
            const code = codeColumn ? String(row[codeColumn] || "").trim() : null;

            if (code) {
              // Find creator if mapped
              let creatorId = null;
              if (promoCreatorColumn && row[promoCreatorColumn]) {
                const handle = extractHandle(row[promoCreatorColumn]);
                if (handle) {
                  // Try to find creator
                  const { data: creator } = await supabase
                    .from("creators")
                    .select("id")
                    .eq("report_id", reportId)
                    .eq("handle", handle)
                    .maybeSingle();
                  
                  if (creator) {
                    creatorId = creator.id;
                  }
                }
              }

              // Build promo code data
              const promoData: Record<string, any> = {
                report_id: reportId,
                code,
                creator_id: creatorId,
              };

              // Map other fields
              promoMappings.forEach(mapping => {
                if (!["code", "promo_creator_handle"].includes(mapping.targetField)) {
                  const value = row[mapping.sourceColumn];
                  if (value !== null && value !== undefined && value !== "") {
                    const field = mapping.targetField;
                    
                    if (["clicks", "purchases"].includes(field)) {
                      promoData[field] = parseNumber(value);
                    } else if (["revenue", "conversion_rate"].includes(field)) {
                      promoData[field] = parseNumber(value);
                    } else {
                      promoData[field] = String(value).trim();
                    }
                  }
                }
              });

              // Upsert promo code
              const { error: promoError } = await supabase
                .from("promo_codes")
                .upsert(promoData, { onConflict: "report_id,code" });

              if (promoError) {
                console.error(`Row ${rowNum} promo code error:`, promoError);
                warnings.push(`Row ${rowNum}: Failed to create promo code ${code}`);
                rowsFailed++;
              } else {
                rowsImported++;
              }
            }
          }
        } catch (rowError) {
          console.error(`Row ${rowNum} error:`, rowError);
          errors.push(`Row ${rowNum}: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
          rowsFailed++;
        }
      }

      // Create audit log
      await supabase
        .from("audit_log")
        .insert({
          report_id: reportId,
          action_type: "import",
          user_id: user.id,
          details: {
            file_name: fileName,
            source: "mapped_import",
            rows_imported: rowsImported,
            rows_failed: rowsFailed,
            errors: errors.slice(0, 20),
            warnings: warnings.slice(0, 20),
          },
        });

      // Update import record
      await supabase
        .from("data_imports")
        .update({
          status: errors.length > 0 && rowsImported === 0 ? "failed" : "completed",
          processed_at: new Date().toISOString(),
          rows_total: rows.length,
          rows_imported: rowsImported,
          rows_failed: rowsFailed,
          errors: errors.length > 0 ? errors.slice(0, 50) : null,
          warnings: warnings.length > 0 ? warnings.slice(0, 50) : null,
        })
        .eq("id", importRecord.id);

      console.log(`Import completed: ${rowsImported} imported, ${rowsFailed} failed`);

      return new Response(
        JSON.stringify({
          success: true,
          importId: importRecord.id,
          rowsImported,
          rowsFailed,
          errors: errors.slice(0, 10),
          warnings: warnings.slice(0, 10),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Import processing error:", error);
      const errMsg = error instanceof Error ? error.message : String(error);

      await supabase
        .from("data_imports")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          errors: [errMsg],
        })
        .eq("id", importRecord.id);

      return new Response(
        JSON.stringify({ error: "Import failed", details: errMsg }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Request error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
