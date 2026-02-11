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

const fetchTikTokReport = async (
  accessToken: string,
  advertiserId: string,
  params: Record<string, unknown>
): Promise<unknown> => {
  const url = new URL(`${TIKTOK_API_BASE}/report/integrated/get/`);
  url.searchParams.set("advertiser_id", advertiserId);
  
  // TikTok report API uses GET with JSON-encoded params as query strings
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
  try {
    data = JSON.parse(text);
  } catch {
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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { spaceId, campaignId, startDate, endDate } = await req.json();

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedStartDate = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const resolvedEndDate = endDate || new Date().toISOString().split("T")[0];

    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("tiktok_id")
      .eq("id", spaceId)
      .single();

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

    // Step 1: Fetch campaign info
    console.log(`Fetching TikTok campaign ${campaignId} for advertiser: ${advertiserId}`);
    const campaignsData = (await fetchTikTokGet("/campaign/get/", tiktokAccessToken, {
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ campaign_ids: [campaignId] }),
      page_size: 10,
    })) as { list: Array<{ campaign_id: string; campaign_name: string; status: string; objective_type?: string; budget?: number; budget_mode?: string }> };

    const campaign = campaignsData?.list?.[0];
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: `Campaign ${campaignId} not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch campaign-level reporting with filtering
    console.log(`Fetching report for campaign ${campaignId}`);
    const reportData = (await fetchTikTokReport(tiktokAccessToken, advertiserId, {
      report_type: "BASIC",
      data_level: "AUCTION_CAMPAIGN",
      dimensions: ["campaign_id"],
      metrics: REPORT_METRICS,
      filtering: [
        {
          field_name: "campaign_ids",
          filter_type: "IN",
          filter_value: JSON.stringify([campaignId]),
        },
      ],
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      page: 1,
      page_size: 1000,
    })) as { list: Array<{ dimensions: { campaign_id: string }; metrics: Record<string, string> }> };

    const m = reportData?.list?.[0]?.metrics || {};

    const impressions = num(m.impressions);
    const videoPlayActions = num(m.video_play_actions);
    const spend = num(m.spend);
    const paidLikes = num(m.likes);
    const paidComments = num(m.comments);
    const paidShares = num(m.shares);
    const totalPaidEng = paidLikes + paidComments + paidShares;

    const campaignRecord = {
      space_id: spaceId,
      campaign_id: String(campaignId),
      campaign_name: campaign.campaign_name,
      status: campaign.status,
      amount_spent: spend,
      reach: num(m.reach),
      impressions,
      frequency: num(m.frequency),
      cpm: num(m.cpm),
      cpc: num(m.cpc),
      ctr: num(m.ctr),
      clicks: num(m.clicks),
      video_play_actions: videoPlayActions,
      video_view_rate: impressions > 0 ? (videoPlayActions / impressions) * 100 : 0,
      video_watched_2s: num(m.video_watched_2s),
      video_watched_6s: num(m.video_watched_6s),
      video_views_p25: num(m.video_views_p25),
      video_views_p50: num(m.video_views_p50),
      video_views_p100: num(m.video_views_p100),
      average_video_play: num(m.average_video_play),
      average_video_play_per_user: num(m.average_video_play_per_user),
      likes: paidLikes,
      comments: paidComments,
      shares: paidShares,
      profile_visits: num(m.profile_visits),
      follows: num(m.follows),
      interactive_addon_clicks: num(m.interactive_add_on_destination_clicks),
      cost_per_engagement: totalPaidEng > 0 ? spend / totalPaidEng : 0,
      age: null,
      gender: null,
      location: null,
    };

    const { error: upsertError } = await supabase
      .from("tiktok_campaigns")
      .upsert(campaignRecord, { onConflict: "space_id,campaign_id,age,gender,location" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign: {
          campaign_id: campaignRecord.campaign_id,
          campaign_name: campaignRecord.campaign_name,
          amount_spent: campaignRecord.amount_spent,
          impressions: campaignRecord.impressions,
          reach: campaignRecord.reach,
        },
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
