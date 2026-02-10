import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

const METRICS = [
  "spend", "reach", "impressions", "frequency", "cpm",
  "clicks", "ctr", "cpc",
  "video_play_actions", "video_watched_2s", "video_watched_6s",
  "video_views_p25", "video_views_p50", "video_views_p100",
  "average_video_play_per_user", "average_video_play",
  "cost_per_result", "engagement_rate",
  "paid_likes", "paid_comments", "paid_shares",
  "paid_profile_visits_rate", "paid_follows",
  "interactive_add_on_destination_clicks",
];

interface ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
}

const num = (v?: string): number => {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const int = (v?: string): number => {
  if (!v) return 0;
  const n = parseInt(v);
  return Number.isFinite(n) ? n : 0;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { spaceId, campaignName } = await req.json();
    if (!spaceId || !campaignName) {
      return new Response(
        JSON.stringify({ error: "spaceId and campaignName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tiktok_id from space
    const { data: space } = await supabase
      .from("spaces")
      .select("tiktok_id")
      .eq("id", spaceId)
      .single();

    if (!space?.tiktok_id) {
      return new Response(
        JSON.stringify({ error: "No TikTok Advertiser ID configured" }),
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

    // Find campaign by name in our DB
    const { data: campaign } = await supabase
      .from("tiktok_campaigns")
      .select("id, campaign_id")
      .eq("space_id", spaceId)
      .eq("campaign_name", campaignName)
      .single();

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: `Campaign '${campaignName}' not found. Import campaigns first.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching demographic breakdowns for campaign: ${campaignName} (${campaign.campaign_id})`);

    // Delete existing demographics for this campaign
    await supabase
      .from("tiktok_ad_demographics")
      .delete()
      .eq("tiktok_campaign_id", campaign.id);

    let totalInserted = 0;
    const errors: string[] = [];

    // Fetch breakdowns by age, gender, and province (location)
    const breakdownDimensions = [
      ["age", "gender"],
      ["country_code"],
    ];

    for (const dimensions of breakdownDimensions) {
      try {
        const url = `${TIKTOK_API_BASE}/report/integrated/get/`;
        const body = {
          advertiser_id: advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: ["campaign_id", ...dimensions],
          metrics: METRICS,
          filtering: [{
            field_name: "campaign_id",
            filter_type: "IN",
            filter_value: JSON.stringify([campaign.campaign_id]),
          }],
          lifetime: true,
          page_size: 1000,
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Access-Token": tiktokAccessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (data.code !== 0) {
          errors.push(`Breakdown ${dimensions.join(",")}: ${data.message}`);
          continue;
        }

        const rows: ReportRow[] = data.data?.list || [];
        console.log(`Got ${rows.length} rows for dimensions: ${dimensions.join(",")}`);

        for (const row of rows) {
          const m = row.metrics;
          const d = row.dimensions;

          const record = {
            space_id: spaceId,
            tiktok_campaign_id: campaign.id,
            campaign_id: campaign.campaign_id,
            age: d.age || null,
            gender: d.gender || null,
            location: d.country_code || null,
            amount_spent: num(m.spend),
            reach: int(m.reach),
            impressions: int(m.impressions),
            frequency: num(m.frequency),
            cpm: num(m.cpm),
            clicks: int(m.clicks),
            ctr: num(m.ctr),
            cpc: num(m.cpc),
            video_views: int(m.video_play_actions),
            video_view_rate: num(m.engagement_rate),
            video_watched_2s: int(m.video_watched_2s),
            video_watched_6s: int(m.video_watched_6s),
            video_views_p25: int(m.video_views_p25),
            video_views_p50: int(m.video_views_p50),
            video_views_p100: int(m.video_views_p100),
            average_play_time_per_user: num(m.average_video_play_per_user),
            average_play_time_per_view: num(m.average_video_play),
            cost_per_engagement: num(m.cost_per_result),
            paid_likes: int(m.paid_likes),
            paid_comments: int(m.paid_comments),
            paid_shares: int(m.paid_shares),
            paid_profile_visits: int(m.paid_profile_visits_rate),
            paid_follows: int(m.paid_follows),
            interactive_addon_clicks: int(m.interactive_add_on_destination_clicks),
          };

          const { error: insertErr } = await supabase
            .from("tiktok_ad_demographics")
            .insert(record);

          if (insertErr) {
            errors.push(`Insert ${d.age || ""}/${d.gender || ""}/${d.country_code || ""}: ${insertErr.message}`);
          } else {
            totalInserted++;
          }
        }
      } catch (e) {
        errors.push(`Breakdown ${dimensions.join(",")}: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignName,
        imported: totalInserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TikTok demographics import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
