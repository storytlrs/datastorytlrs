import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

const REPORT_METRICS = [
  "spend", "impressions", "reach", "clicks", "cpc", "cpm", "ctr",
  "frequency", "video_play_actions", "video_watched_2s", "video_watched_6s",
  "video_views_p25", "video_views_p50", "video_views_p100",
  "average_video_play", "average_video_play_per_user",
  "engagements", "likes", "comments", "shares",
  "profile_visits", "follows", "interactive_add_on_destination_clicks",
];

const num = (v?: string): number => {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const computeEngagement = (m: Record<string, string>) => {
  const likes = num(m.likes);
  const comments = num(m.comments);
  const shares = num(m.shares);
  const total = likes + comments + shares;
  const spend = num(m.spend);
  return {
    likes, comments, shares,
    cost_per_engagement: total > 0 ? spend / total : 0,
  };
};

const computeVideoMetrics = (m: Record<string, string>) => {
  const impressions = num(m.impressions);
  const videoPlayActions = num(m.video_play_actions);
  return {
    video_play_actions: videoPlayActions,
    video_view_rate: impressions > 0 ? (videoPlayActions / impressions) * 100 : 0,
    video_watched_2s: num(m.video_watched_2s),
    video_watched_6s: num(m.video_watched_6s),
    video_views_p25: num(m.video_views_p25),
    video_views_p50: num(m.video_views_p50),
    video_views_p100: num(m.video_views_p100),
    average_video_play: num(m.average_video_play),
    average_video_play_per_user: num(m.average_video_play_per_user),
  };
};

const fetchTikTokReport = async (
  accessToken: string,
  advertiserId: string,
  params: Record<string, unknown>
): Promise<unknown> => {
  const url = new URL(`${TIKTOK_API_BASE}/report/integrated/get/`);
  url.searchParams.set("advertiser_id", advertiserId);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  console.log("TikTok report request URL:", url.toString().substring(0, 300));
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Access-Token": accessToken },
  });
  const text = await response.text();
  console.log("TikTok report response status:", response.status, "body preview:", text.substring(0, 500));
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error(`TikTok API returned non-JSON response: ${text.substring(0, 200)}`);
  }
  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message} (code: ${data.code})`);
  }
  return data.data;
};

const fetchTikTokGet = async (
  endpoint: string,
  accessToken: string,
  params: Record<string, string | number>
): Promise<unknown> => {
  const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Access-Token": accessToken },
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API error: ${data.message} (code: ${data.code})`);
  }
  return data.data;
};

// Import a single campaign with its ad groups and ads
const importCampaign = async (
  supabase: ReturnType<typeof createClient>,
  tiktokAccessToken: string,
  advertiserId: string,
  spaceId: string,
  campaignId: string,
  campaignName: string,
  campaignStatus: string,
  resolvedStartDate: string,
  resolvedEndDate: string,
) => {
  const filteringByCampaign = [
    { field_name: "campaign_ids", filter_type: "IN", filter_value: JSON.stringify([campaignId]) },
  ];
  const reportParams = {
    start_date: resolvedStartDate,
    end_date: resolvedEndDate,
    page: 1,
    page_size: 1000,
  };

  // Campaign report
  const campaignReport = (await fetchTikTokReport(tiktokAccessToken, advertiserId, {
    report_type: "BASIC", data_level: "AUCTION_CAMPAIGN", dimensions: ["campaign_id"],
    metrics: REPORT_METRICS, filtering: filteringByCampaign, ...reportParams,
  })) as { list: Array<{ dimensions: { campaign_id: string }; metrics: Record<string, string> }> };

  const cm = campaignReport?.list?.[0]?.metrics || {};
  const cEng = computeEngagement(cm);
  const cVid = computeVideoMetrics(cm);

  const { error: upsertCampaignErr } = await supabase
    .from("tiktok_campaigns")
    .upsert({
      space_id: spaceId, campaign_id: String(campaignId),
      campaign_name: campaignName, status: campaignStatus,
      amount_spent: num(cm.spend), reach: num(cm.reach), impressions: num(cm.impressions),
      frequency: num(cm.frequency), cpm: num(cm.cpm), cpc: num(cm.cpc),
      ctr: num(cm.ctr), clicks: num(cm.clicks),
      ...cVid, ...cEng,
      profile_visits: num(cm.profile_visits), follows: num(cm.follows),
      interactive_addon_clicks: num(cm.interactive_add_on_destination_clicks),
      age: "", gender: "", location: "",
    }, { onConflict: "space_id,campaign_id,age,gender,location" });

  if (upsertCampaignErr) {
    console.error("Campaign upsert error:", upsertCampaignErr);
    throw new Error(upsertCampaignErr.message);
  }

  // Get the tiktok_campaigns row id for FK
  const { data: campaignRow } = await supabase
    .from("tiktok_campaigns")
    .select("id")
    .eq("space_id", spaceId)
    .eq("campaign_id", String(campaignId))
    .eq("age", "").eq("gender", "").eq("location", "")
    .single();

  const tiktokCampaignId = campaignRow?.id;
  let adGroupCount = 0;
  let adCount = 0;

  if (!tiktokCampaignId) {
    console.warn(`Could not find tiktok_campaigns row for campaign ${campaignId}`);
    return { adGroupCount, adCount };
  }

  // Ad Groups report
  console.log(`Fetching ad groups for campaign ${campaignId}`);
  const adGroupReport = (await fetchTikTokReport(tiktokAccessToken, advertiserId, {
    report_type: "BASIC", data_level: "AUCTION_ADGROUP", dimensions: ["adgroup_id"],
    metrics: REPORT_METRICS, filtering: filteringByCampaign, ...reportParams,
  })) as { list: Array<{ dimensions: { adgroup_id: string }; metrics: Record<string, string> }> };

  const adGroupIds: string[] = [];
  for (const row of adGroupReport?.list || []) {
    const agId = row.dimensions.adgroup_id;
    const m = row.metrics;
    const eng = computeEngagement(m);
    const vid = computeVideoMetrics(m);

    const { error: agErr } = await supabase
      .from("tiktok_ad_groups")
      .upsert({
        space_id: spaceId, tiktok_campaign_id: tiktokCampaignId,
        adgroup_id: agId, adgroup_name: agId, status: null,
        amount_spent: num(m.spend), reach: num(m.reach), impressions: num(m.impressions),
        frequency: num(m.frequency), cpm: num(m.cpm), cpc: num(m.cpc),
        ctr: num(m.ctr), clicks: num(m.clicks),
        ...vid, ...eng,
        profile_visits: num(m.profile_visits), follows: num(m.follows),
        interactive_addon_clicks: num(m.interactive_add_on_destination_clicks),
      }, { onConflict: "space_id,adgroup_id" });

    if (agErr) console.error(`Ad group ${agId} upsert error:`, agErr);
    else { adGroupIds.push(agId); adGroupCount++; }
  }

  // Fetch ad group names
  if (adGroupIds.length > 0) {
    try {
      const agInfo = (await fetchTikTokGet("/adgroup/get/", tiktokAccessToken, {
        advertiser_id: advertiserId,
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        page_size: 1000,
      })) as { list: Array<{ adgroup_id: string; adgroup_name: string; status: string }> };

      for (const ag of agInfo?.list || []) {
        await supabase
          .from("tiktok_ad_groups")
          .update({ adgroup_name: ag.adgroup_name, status: ag.status })
          .eq("space_id", spaceId)
          .eq("adgroup_id", String(ag.adgroup_id));
      }
    } catch (e) { console.error("Failed to fetch ad group names:", e); }
  }

  // Ads report
  console.log(`Fetching ads for campaign ${campaignId}`);
  const adReport = (await fetchTikTokReport(tiktokAccessToken, advertiserId, {
    report_type: "BASIC", data_level: "AUCTION_AD", dimensions: ["ad_id"],
    metrics: REPORT_METRICS, filtering: filteringByCampaign, ...reportParams,
  })) as { list: Array<{ dimensions: { ad_id: string }; metrics: Record<string, string> }> };

  // Ad info mapping
  const adInfoMap = new Map<string, { ad_name: string; adgroup_id: string; status: string; thumbnail_url: string | null }>();
  try {
    const adInfo = (await fetchTikTokGet("/ad/get/", tiktokAccessToken, {
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      page_size: 1000,
    })) as { list: Array<{ ad_id: string; ad_name: string; adgroup_id: string; status: string; video_id?: string; image_ids?: string[] }> };

    // Collect video IDs for thumbnail fetching
    const videoIdToAdIds = new Map<string, string[]>();
    for (const ad of adInfo?.list || []) {
      const adIdStr = String(ad.ad_id);
      adInfoMap.set(adIdStr, {
        ad_name: ad.ad_name,
        adgroup_id: String(ad.adgroup_id),
        status: ad.status,
        thumbnail_url: null,
      });
      if (ad.video_id) {
        const existing = videoIdToAdIds.get(ad.video_id) || [];
        existing.push(adIdStr);
        videoIdToAdIds.set(ad.video_id, existing);
      }
    }

    // Fetch video poster URLs via /tt_video/list/ endpoint
    if (videoIdToAdIds.size > 0) {
      try {
        const videoIds = Array.from(videoIdToAdIds.keys());
        // Fetch in batches of 50
        for (let i = 0; i < videoIds.length; i += 50) {
          const batch = videoIds.slice(i, i + 50);
          const videoInfo = (await fetchTikTokGet("/tt_video/list/", tiktokAccessToken, {
            advertiser_id: advertiserId,
            video_ids: JSON.stringify(batch),
          })) as { list: Array<{ video_id: string; video_info?: { poster_url?: string } }> };

          for (const video of videoInfo?.list || []) {
            const posterUrl = video.video_info?.poster_url || null;
            if (posterUrl) {
              const relatedAdIds = videoIdToAdIds.get(String(video.video_id)) || [];
              for (const adId of relatedAdIds) {
                const info = adInfoMap.get(adId);
                if (info) info.thumbnail_url = posterUrl;
              }
            }
          }
          console.log(`Fetched batch ${i / 50 + 1}: ${videoInfo?.list?.length || 0} video thumbnails`);
        }
      } catch (e) { console.error("Failed to fetch video thumbnails:", e); }
    }

    // For image ads, try to get image URLs
    for (const ad of adInfo?.list || []) {
      const adIdStr = String(ad.ad_id);
      const info = adInfoMap.get(adIdStr);
      if (info && !info.thumbnail_url && ad.image_ids?.length) {
        try {
          const imgInfo = (await fetchTikTokGet("/file/image/ad/info/", tiktokAccessToken, {
            advertiser_id: advertiserId,
            image_ids: JSON.stringify(ad.image_ids.slice(0, 1)),
          })) as { list: Array<{ image_id: string; image_url?: string }> };
          const imgUrl = imgInfo?.list?.[0]?.image_url;
          if (imgUrl) info.thumbnail_url = imgUrl;
        } catch (_) { /* skip */ }
      }
    }
  } catch (e) { console.error("Failed to fetch ad info:", e); }

  for (const row of adReport?.list || []) {
    const adId = row.dimensions.ad_id;
    const m = row.metrics;
    const eng = computeEngagement(m);
    const vid = computeVideoMetrics(m);
    const info = adInfoMap.get(adId);

    let parentAdGroupId: string | null = null;
    if (info?.adgroup_id) {
      const { data: agRow } = await supabase
        .from("tiktok_ad_groups")
        .select("id")
        .eq("space_id", spaceId)
        .eq("adgroup_id", info.adgroup_id)
        .single();
      parentAdGroupId = agRow?.id || null;
    }

    if (!parentAdGroupId) {
      console.warn(`Skipping ad ${adId}: no parent ad group found`);
      continue;
    }

    const { error: adErr } = await supabase
      .from("tiktok_ads")
      .upsert({
        space_id: spaceId, tiktok_ad_group_id: parentAdGroupId,
        ad_id: adId, ad_name: info?.ad_name || adId, status: info?.status || null,
        thumbnail_url: info?.thumbnail_url || null,
        amount_spent: num(m.spend), reach: num(m.reach), impressions: num(m.impressions),
        frequency: num(m.frequency), cpm: num(m.cpm), cpc: num(m.cpc),
        ctr: num(m.ctr), clicks: num(m.clicks),
        ...vid, ...eng,
        profile_visits: num(m.profile_visits), follows: num(m.follows),
        interactive_addon_clicks: num(m.interactive_add_on_destination_clicks),
        link_clicks: num(m.clicks),
      }, { onConflict: "space_id,ad_id" });

    if (adErr) console.error(`Ad ${adId} upsert error:`, adErr);
    else adCount++;
  }

  console.log(`Campaign ${campaignId}: imported ${adGroupCount} ad groups, ${adCount} ads`);
  return { adGroupCount, adCount };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to verify user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for DB operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { spaceId, campaignId, startDate, endDate } = await req.json();

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedStartDate = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const resolvedEndDate = endDate || new Date().toISOString().split("T")[0];

    const { data: space, error: spaceError } = await supabase
      .from("spaces").select("tiktok_id").eq("id", spaceId).single();

    if (spaceError || !space?.tiktok_id) {
      return new Response(
        JSON.stringify({ error: "Brand has no TikTok Advertiser ID configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const advertiserId = space.tiktok_id;
    const tiktokAccessToken = Deno.env.get("TIKTOK_ACCESS_TOKEN");
    if (!tiktokAccessToken) {
      return new Response(
        JSON.stringify({ error: "TIKTOK_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If a specific campaignId is provided, import only that campaign
    // Otherwise, fetch ALL campaigns for this advertiser
    let campaignsToImport: Array<{ campaign_id: string; campaign_name: string; status: string }> = [];

    if (campaignId) {
      console.log(`Fetching single TikTok campaign ${campaignId} for advertiser: ${advertiserId}`);
      const campaignsData = (await fetchTikTokGet("/campaign/get/", tiktokAccessToken, {
        advertiser_id: advertiserId,
        filtering: JSON.stringify({ campaign_ids: [campaignId] }),
        page_size: 10,
      })) as { list: Array<{ campaign_id: string; campaign_name: string; status: string }> };

      const campaign = campaignsData?.list?.[0];
      if (!campaign) {
        return new Response(
          JSON.stringify({ error: `Campaign ${campaignId} not found` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      campaignsToImport = [campaign];
    } else {
      console.log(`Fetching ALL TikTok campaigns for advertiser: ${advertiserId}`);
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const campaignsData = (await fetchTikTokGet("/campaign/get/", tiktokAccessToken, {
          advertiser_id: advertiserId,
          page: page,
          page_size: 1000,
        })) as { list: Array<{ campaign_id: string; campaign_name: string; status: string }>; page_info?: { total_number: number; page: number; page_size: number } };

        const list = campaignsData?.list || [];
        campaignsToImport.push(...list);
        
        const totalNumber = campaignsData?.page_info?.total_number || 0;
        hasMore = campaignsToImport.length < totalNumber;
        page++;
      }
      console.log(`Found ${campaignsToImport.length} campaigns to import`);
    }

    if (campaignsToImport.length === 0) {
      return new Response(
        JSON.stringify({ success: true, campaigns_imported: 0, message: "No campaigns found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalAdGroups = 0;
    let totalAds = 0;
    const importedCampaigns: Array<{ campaign_id: string; campaign_name: string }> = [];

    for (const campaign of campaignsToImport) {
      try {
        console.log(`Importing campaign: ${campaign.campaign_name} (${campaign.campaign_id})`);
        const result = await importCampaign(
          supabase, tiktokAccessToken, advertiserId, spaceId,
          String(campaign.campaign_id), campaign.campaign_name, campaign.status,
          resolvedStartDate, resolvedEndDate,
        );
        totalAdGroups += result.adGroupCount;
        totalAds += result.adCount;
        importedCampaigns.push({
          campaign_id: String(campaign.campaign_id),
          campaign_name: campaign.campaign_name,
        });
      } catch (err) {
        console.error(`Failed to import campaign ${campaign.campaign_id}:`, err);
      }
    }

    console.log(`Total: ${importedCampaigns.length} campaigns, ${totalAdGroups} ad groups, ${totalAds} ads`);

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_imported: importedCampaigns.length,
        campaigns: importedCampaigns,
        ad_groups_imported: totalAdGroups,
        ads_imported: totalAds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TikTok import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
