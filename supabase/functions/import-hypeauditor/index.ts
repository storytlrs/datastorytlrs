import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedData {
  campaign?: {
    name: string;
    brand: string;
    market: string;
    startDate: string;
    endDate: string;
    budget: number;
    currency: string;
  };
  influencers: Array<{
    platform: string;
    handle: string;
    name: string;
    followers: number;
    aqs: number;
    audienceJSON?: string;
  }>;
  media: Array<{
    platform: string;
    handle: string;
    postURL: string;
    postID: string;
    contentType: string;
    publishedAt: string;
    impressions: number;
    reach: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    totalEng: number;
    er: number;
    watchTime?: number;
    positiveCommentsPercent?: number;
    negativeCommentsPercent?: number;
    neutralCommentsPercent?: number;
  }>;
  ecom: Array<{
    platform: string;
    handle: string;
    postURL: string;
    promoCode: string;
    clicks: number;
    purchases: number;
    revenue: number;
    conversion: number;
  }>;
}

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

    const body = await req.json();
    const { reportId, fileName, parsedData } = body as {
      reportId: string;
      fileName: string;
      parsedData: ParsedData;
    };

    if (!reportId || !parsedData) {
      return new Response(JSON.stringify({ error: "Missing reportId or parsedData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("data_imports")
      .insert({
        report_id: reportId,
        file_name: fileName || "upload.xlsx",
        file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        source: "hypeauditor",
        status: "processing",
        uploaded_by: user.id,
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
      // Update campaign info if provided
      if (parsedData.campaign) {
        await supabase
          .from("reports")
          .update({
            name: parsedData.campaign.name,
            start_date: parsedData.campaign.startDate,
            end_date: parsedData.campaign.endDate,
          })
          .eq("id", reportId);
      }

      // Process Influencers
      for (const influencer of parsedData.influencers) {
        try {
          const platform = influencer.platform.toLowerCase() as any;
          
          let audienceBreakdown = null;
          if (influencer.audienceJSON) {
            try {
              audienceBreakdown = JSON.parse(influencer.audienceJSON);
            } catch (e) {
              warnings.push(`Invalid audience JSON for ${influencer.handle}`);
            }
          }

          await supabase
            .from("creators")
            .upsert({
              report_id: reportId,
              handle: influencer.handle,
              platform: platform,
              followers: influencer.followers,
              audience_breakdown: audienceBreakdown,
            }, {
              onConflict: "report_id,handle,platform"
            });

          rowsImported++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to import influencer ${influencer.handle}: ${errMsg}`);
          rowsFailed++;
        }
      }

      // Process Media
      for (const media of parsedData.media) {
        try {
          const platform = media.platform.toLowerCase() as any;
          
          // Find or create creator
          let creatorId: string | undefined;
          const { data: creator } = await supabase
            .from("creators")
            .select("id")
            .eq("report_id", reportId)
            .eq("handle", media.handle)
            .eq("platform", platform)
            .maybeSingle();

          if (creator) {
            creatorId = creator.id;
          } else {
            const { data: newCreator } = await supabase
              .from("creators")
              .insert({
                report_id: reportId,
                handle: media.handle,
                platform: platform,
              })
              .select("id")
              .single();
            creatorId = newCreator?.id;
          }

          if (!creatorId) {
            throw new Error("Failed to get or create creator");
          }

          // Determine sentiment
          let sentiment = null;
          if (media.positiveCommentsPercent !== undefined) {
            const pos = media.positiveCommentsPercent || 0;
            const neg = media.negativeCommentsPercent || 0;
            if (pos > neg) sentiment = "positive";
            else if (neg > pos) sentiment = "negative";
            else sentiment = "neutral";
          }

          // Map content type
          const contentTypeMap: Record<string, string> = {
            "post": "post",
            "reel": "reel",
            "story": "story",
            "video": "video",
            "short": "short",
          };
          const contentType = contentTypeMap[media.contentType?.toLowerCase()] || "post";

          await supabase
            .from("content")
            .insert({
              report_id: reportId,
              creator_id: creatorId,
              content_type: contentType,
              platform: platform,
              url: media.postURL,
              published_date: media.publishedAt,
              views: media.views || 0,
              impressions: media.impressions || 0,
              likes: media.likes || 0,
              comments: media.comments || 0,
              shares: media.shares || 0,
              saves: media.saves || 0,
              engagement_rate: media.er || 0,
              watch_time: media.watchTime || null,
              sentiment: sentiment,
            });

          rowsImported++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to import media ${media.postURL}: ${errMsg}`);
          rowsFailed++;
        }
      }

      // Process E-com
      for (const ecom of parsedData.ecom) {
        try {
          const platform = ecom.platform.toLowerCase() as any;
          
          const { data: creator } = await supabase
            .from("creators")
            .select("id")
            .eq("report_id", reportId)
            .eq("handle", ecom.handle)
            .eq("platform", platform)
            .maybeSingle();

          await supabase
            .from("promo_codes")
            .upsert({
              report_id: reportId,
              creator_id: creator?.id,
              code: ecom.promoCode,
              clicks: ecom.clicks || 0,
              purchases: ecom.purchases || 0,
              revenue: ecom.revenue || 0,
              conversion_rate: ecom.conversion || 0,
            }, {
              onConflict: "report_id,code"
            });

          rowsImported++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to import promo code ${ecom.promoCode}: ${errMsg}`);
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
            source: "hypeauditor",
            rows_imported: rowsImported,
            rows_failed: rowsFailed,
            errors: errors,
            warnings: warnings,
          },
        });

      // Update import record
      await supabase
        .from("data_imports")
        .update({
          status: errors.length > 0 && rowsImported === 0 ? "failed" : "completed",
          processed_at: new Date().toISOString(),
          rows_total: rowsImported + rowsFailed,
          rows_imported: rowsImported,
          rows_failed: rowsFailed,
          errors: errors.length > 0 ? errors : null,
          warnings: warnings.length > 0 ? warnings : null,
        })
        .eq("id", importRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          importId: importRecord.id,
          rowsImported,
          rowsFailed,
          errors,
          warnings,
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
