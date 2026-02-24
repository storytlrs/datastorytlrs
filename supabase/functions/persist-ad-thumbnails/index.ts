import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

const fetchTikTokGet = async (path: string, token: string, params: Record<string, string>) => {
  const url = new URL(`${TIKTOK_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { "Access-Token": token },
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || `TikTok API error: ${data.code}`);
  return data.data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { spaceId, reportId } = await req.json();
    if (!spaceId) {
      return new Response(JSON.stringify({ error: "spaceId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tiktokAccessToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
    let persisted = 0;
    let failed = 0;

    // Download image and upload to storage
    const downloadAndPersist = async (
      table: string,
      id: string,
      adId: string,
      imageUrl: string
    ): Promise<boolean> => {
      try {
        // Try proxy first
        const proxyUrl = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const proxyRes = await fetch(proxyUrl, {
          headers: { Authorization: `Bearer ${serviceKey}` },
        });

        if (!proxyRes.ok) {
          console.warn(`Download failed for ${adId}: ${proxyRes.status}`);
          return false;
        }

        const contentType = proxyRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const blob = await proxyRes.blob();
        const arrayBuf = await blob.arrayBuffer();

        if (arrayBuf.byteLength < 100) {
          console.warn(`Image too small for ${adId}, likely invalid`);
          return false;
        }

        const storagePath = `brand-ads/${spaceId}/${adId}.${ext}`;
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("content-thumbnails")
          .upload(storagePath, arrayBuf, { contentType, upsert: true });

        if (uploadErr) {
          console.warn(`Upload failed for ${adId}: ${uploadErr.message}`);
          return false;
        }

        const { data: publicData } = supabaseAdmin.storage
          .from("content-thumbnails")
          .getPublicUrl(storagePath);

        const newUrl = publicData?.publicUrl;
        if (!newUrl) return false;

        const { error: updateErr } = await supabaseAdmin
          .from(table)
          .update({ thumbnail_url: newUrl })
          .eq("id", id);

        if (updateErr) {
          console.warn(`DB update failed for ${adId}: ${updateErr.message}`);
          return false;
        }

        return true;
      } catch (e) {
        console.warn(`Persist failed for ${adId}: ${e}`);
        return false;
      }
    };

    // --- TIKTOK ADS: Fetch fresh thumbnail URLs from TikTok API ---
    let tiktokAdsToProcess: any[] = [];
    
    // Get TikTok ads needing persistence
    let tiktokAdsQuery = supabaseAdmin
      .from("tiktok_ads")
      .select("id, ad_id, thumbnail_url, tiktok_ad_group_id")
      .eq("space_id", spaceId)
      .not("thumbnail_url", "is", null);

    if (reportId) {
      const { data: tiktokLinks } = await supabaseAdmin
        .from("report_tiktok_campaigns")
        .select("tiktok_campaign_id")
        .eq("report_id", reportId);
      const tiktokCampaignIds = (tiktokLinks || []).map((l: any) => l.tiktok_campaign_id);
      
      if (tiktokCampaignIds.length > 0) {
        const { data: adGroups } = await supabaseAdmin
          .from("tiktok_ad_groups")
          .select("id")
          .in("tiktok_campaign_id", tiktokCampaignIds);
        const adGroupIds = (adGroups || []).map((a: any) => a.id);
        if (adGroupIds.length > 0) {
          tiktokAdsQuery = tiktokAdsQuery.in("tiktok_ad_group_id", adGroupIds);
        }
      }
    }

    const { data: tiktokAds } = await tiktokAdsQuery;
    const externalTiktokAds = (tiktokAds || []).filter(
      (a: any) => a.thumbnail_url && !a.thumbnail_url.includes("supabase")
    );

    // For TikTok ads, get fresh thumbnail URLs from TikTok API
    if (externalTiktokAds.length > 0 && tiktokAccessToken) {
      // Get the space's tiktok_id (advertiser ID)
      const { data: space } = await supabaseAdmin
        .from("spaces")
        .select("tiktok_id")
        .eq("id", spaceId)
        .single();
      
      const advertiserId = space?.tiktok_id;
      if (advertiserId) {
        console.log(`Fetching fresh TikTok thumbnails for ${externalTiktokAds.length} ads`);
        
        // Fetch ad info in batches of 100
        const tiktokAdIds = externalTiktokAds.map((a: any) => a.ad_id);
        for (let i = 0; i < tiktokAdIds.length; i += 100) {
          const batch = tiktokAdIds.slice(i, i + 100);
          try {
            const adData = await fetchTikTokGet("/ad/get/", tiktokAccessToken, {
              advertiser_id: advertiserId,
              filtering: JSON.stringify({ ad_ids: batch }),
              fields: JSON.stringify(["ad_id", "video_id", "image_ids", "tiktok_item_id"]),
              page_size: "100",
            });

            // Group by video_id for poster lookup
            const videoIdToAdIds = new Map<string, string[]>();
            const itemIdToAdIds = new Map<string, string[]>();
            
            for (const ad of adData?.list || []) {
              const adIdStr = String(ad.ad_id);
              if (ad.video_id) {
                const vids = videoIdToAdIds.get(ad.video_id) || [];
                vids.push(adIdStr);
                videoIdToAdIds.set(ad.video_id, vids);
              }
              if (ad.tiktok_item_id) {
                const items = itemIdToAdIds.get(ad.tiktok_item_id) || [];
                items.push(adIdStr);
                itemIdToAdIds.set(ad.tiktok_item_id, items);
              }
            }

            // Fetch video posters
            const freshUrls = new Map<string, string>();
            
            for (const [videoId, adIds] of videoIdToAdIds) {
              try {
                const videoInfo = await fetchTikTokGet("/file/video/ad/info/", tiktokAccessToken, {
                  advertiser_id: advertiserId,
                  video_ids: JSON.stringify([videoId]),
                });
                const posterUrl = videoInfo?.list?.[0]?.poster_url;
                if (posterUrl) {
                  adIds.forEach(id => freshUrls.set(id, posterUrl));
                }
              } catch (e) {
                console.warn(`Failed to get poster for video ${videoId}: ${e}`);
              }
            }

            // For ads without video posters, try oEmbed
            for (const [itemId, adIds] of itemIdToAdIds) {
              const needsThumb = adIds.some(id => !freshUrls.has(id));
              if (!needsThumb) continue;
              try {
                const resp = await fetch(`https://www.tiktok.com/oembed?url=https://www.tiktok.com/@_/video/${itemId}`);
                if (resp.ok) {
                  const data = await resp.json();
                  if (data.thumbnail_url) {
                    adIds.forEach(id => { if (!freshUrls.has(id)) freshUrls.set(id, data.thumbnail_url); });
                  }
                }
              } catch (_) { /* skip */ }
            }

            // Build processing list with fresh URLs
            for (const ad of externalTiktokAds) {
              const freshUrl = freshUrls.get(ad.ad_id);
              if (freshUrl) {
                tiktokAdsToProcess.push({ ...ad, freshUrl, table: "tiktok_ads" });
              }
            }
          } catch (e) {
            console.error(`TikTok API batch fetch failed: ${e}`);
          }
        }
      }
    }

    // --- META ADS ---
    let metaAdsToProcess: any[] = [];
    
    let metaAdsQuery = supabaseAdmin
      .from("brand_ads")
      .select("id, ad_id, thumbnail_url, brand_ad_set_id")
      .eq("space_id", spaceId)
      .not("thumbnail_url", "is", null);

    if (reportId) {
      const { data: links } = await supabaseAdmin
        .from("report_campaigns")
        .select("brand_campaign_id")
        .eq("report_id", reportId);
      const campaignIds = (links || []).map((l: any) => l.brand_campaign_id);
      
      if (campaignIds.length > 0) {
        const { data: adSets } = await supabaseAdmin
          .from("brand_ad_sets")
          .select("id")
          .in("brand_campaign_id", campaignIds);
        const adSetIds = (adSets || []).map((a: any) => a.id);
        if (adSetIds.length > 0) {
          metaAdsQuery = metaAdsQuery.in("brand_ad_set_id", adSetIds);
        }
      }
    }

    const { data: metaAds } = await metaAdsQuery;
    const externalMetaAds = (metaAds || []).filter(
      (a: any) => a.thumbnail_url && !a.thumbnail_url.includes("supabase")
    );
    metaAdsToProcess = externalMetaAds.map((a: any) => ({ ...a, table: "brand_ads" }));

    console.log(`Processing: ${metaAdsToProcess.length} Meta + ${tiktokAdsToProcess.length} TikTok ads`);

    // Process Meta ads (use existing thumbnail_url, may still be valid)
    for (let i = 0; i < metaAdsToProcess.length; i += 5) {
      const batch = metaAdsToProcess.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((ad: any) => downloadAndPersist(ad.table, ad.id, ad.ad_id, ad.thumbnail_url))
      );
      results.forEach((ok) => (ok ? persisted++ : failed++));
    }

    // Process TikTok ads (use fresh URLs from API)
    for (let i = 0; i < tiktokAdsToProcess.length; i += 5) {
      const batch = tiktokAdsToProcess.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((ad: any) => downloadAndPersist(ad.table, ad.id, ad.ad_id, ad.freshUrl))
      );
      results.forEach((ok) => (ok ? persisted++ : failed++));
    }

    // Also update ai_insights_structured thumbnail URLs in all post arrays
    if (reportId) {
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("ai_insights_structured")
        .eq("id", reportId)
        .single();

      if (report?.ai_insights_structured) {
        const structured = report.ai_insights_structured as any;
        let updated = false;

        // All possible keys that contain post arrays with thumbnail_url
        const postArrayKeys = [
          "top_content",
          "tiktok_top_posts", "tiktok_improve_posts",
          "tiktok_top_reach", "tiktok_improve_reach",
          "tiktok_top_engagement", "tiktok_improve_engagement",
          "facebook_top_posts", "facebook_improve_posts",
          "facebook_top_reach", "facebook_improve_reach",
          "facebook_top_engagement", "facebook_improve_engagement",
          "instagram_top_posts", "instagram_improve_posts",
          "instagram_top_reach", "instagram_improve_reach",
          "instagram_top_engagement", "instagram_improve_engagement",
          "meta_top_reach", "meta_improve_reach",
          "meta_top_engagement", "meta_improve_engagement",
        ];

        const resolveThumb = async (adName: string): Promise<string | null> => {
          const { data: t } = await supabaseAdmin
            .from("tiktok_ads").select("thumbnail_url")
            .eq("space_id", spaceId).eq("ad_name", adName).limit(1);
          if (t?.[0]?.thumbnail_url?.includes("supabase")) return t[0].thumbnail_url;

          const { data: m } = await supabaseAdmin
            .from("brand_ads").select("thumbnail_url")
            .eq("space_id", spaceId).eq("ad_name", adName).limit(1);
          if (m?.[0]?.thumbnail_url?.includes("supabase")) return m[0].thumbnail_url;
          return null;
        };

        for (const key of postArrayKeys) {
          const arr = structured[key];
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (item.thumbnail_url && !item.thumbnail_url.includes("supabase")) {
              const resolved = await resolveThumb(item.name);
              if (resolved) {
                item.thumbnail_url = resolved;
                updated = true;
              }
            }
          }
        }

        if (updated) {
          await supabaseAdmin
            .from("reports")
            .update({ ai_insights_structured: structured })
            .eq("id", reportId);
          console.log("Updated report structured thumbnail URLs");
        }
      }
    }

    return new Response(
      JSON.stringify({ persisted, failed, total: metaAdsToProcess.length + tiktokAdsToProcess.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
