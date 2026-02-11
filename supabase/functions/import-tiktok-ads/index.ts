import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3";

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective_type?: string;
  budget?: number;
  budget_mode?: string;
}

interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  status: string;
}

interface TikTokAd {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  campaign_id: string;
  status: string;
}

interface TikTokReportMetrics {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  video_play_actions?: string;
  video_watched_2s?: string;
  video_watched_6s?: string;
  video_views_p25?: string;
  video_views_p50?: string;
  video_views_p75?: string;
  video_views_p100?: string;
  likes?: string;
  comments?: string;
  shares?: string;
  follows?: string;
  profile_visits?: string;
  average_video_play?: string;
  average_video_play_per_user?: string;
  engagement_rate?: string;
  cost_per_1000_reached?: string;
}

interface TikTokReportRow {
  dimensions: {
    campaign_id?: string;
    adgroup_id?: string;
    ad_id?: string;
  };
  metrics: TikTokReportMetrics;
}

const fetchTikTokReport = async (
  endpoint: string,
  accessToken: string,
  advertiserId: string,
  params: Record<string, unknown>
): Promise<unknown> => {
  // TikTok report endpoint uses GET with query params + JSON body fields as query params
  const url = new URL(`${TIKTOK_API_BASE}${endpoint}`);
  url.searchParams.set("advertiser_id", advertiserId);
  // page_size as query param
  if (params.page_size) url.searchParams.set("page_size", String(params.page_size));

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const data = await response.json();
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

const num = (v?: string): number => {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const REPORT_METRICS = [
  "spend", "impressions", "reach", "clicks", "cpc", "cpm", "ctr",
  "frequency", "video_play_actions", "video_watched_2s",
  "video_views_p25", "video_views_p75", "video_views_p100",
  "likes", "comments", "shares", "follows", "profile_visits",
  "average_video_play", "engagement_rate", "cost_per_1000_reached",
];

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

    const { spaceId, startDate, endDate } = await req.json();
    
    // Default date range: last 12 months
    const resolvedStartDate = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const resolvedEndDate = endDate || new Date().toISOString().split("T")[0];
    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let importedCampaigns = 0;
    let importedAdGroups = 0;
    let importedAds = 0;
    const errors: string[] = [];

    // Step 1: Fetch campaigns
    console.log(`Fetching TikTok campaigns for advertiser: ${advertiserId}`);
    const campaignsData = (await fetchTikTokGet("/campaign/get/", tiktokAccessToken, {
      advertiser_id: advertiserId,
      page_size: 1000,
    })) as { list: TikTokCampaign[] };

    const campaigns = campaignsData?.list || [];
    console.log(`Found ${campaigns.length} TikTok campaigns`);

    // Step 2: Fetch campaign-level reporting
    const campaignIds = campaigns.map((c) => c.campaign_id);
    let campaignReportMap: Record<string, TikTokReportMetrics> = {};

    if (campaignIds.length > 0) {
      try {
        const reportData = (await fetchTikTokReport("/report/integrated/get/", tiktokAccessToken, advertiserId, {
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: ["campaign_id"],
          metrics: REPORT_METRICS,
          start_date: resolvedStartDate,
          end_date: resolvedEndDate,
          page_size: 1000,
        })) as { list: TikTokReportRow[] };

        for (const row of reportData?.list || []) {
          if (row.dimensions.campaign_id) {
            campaignReportMap[row.dimensions.campaign_id] = row.metrics;
          }
        }
      } catch (e) {
        console.error("Campaign report fetch error:", e);
      }
    }

    // Step 3: Upsert campaigns & drill down
    for (const campaign of campaigns) {
      try {
        const m = campaignReportMap[campaign.campaign_id] || {};
        const campaignRecord = {
          space_id: spaceId,
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          status: campaign.status,
          objective: campaign.objective_type || null,
          daily_budget: campaign.budget_mode === "BUDGET_MODE_DAY" && campaign.budget ? campaign.budget : null,
          lifetime_budget: campaign.budget_mode === "BUDGET_MODE_TOTAL" && campaign.budget ? campaign.budget : null,
          amount_spent: num(m.spend),
          reach: num(m.reach),
          impressions: num(m.impressions),
          frequency: num(m.frequency),
          cpm: num(m.cpm),
          cpc: num(m.cpc),
          ctr: num(m.ctr),
          clicks: num(m.clicks),
        };

        const { data: upsertedCampaign, error: campError } = await supabase
          .from("tiktok_campaigns")
          .upsert(campaignRecord, { onConflict: "space_id,campaign_id" })
          .select("id")
          .single();

        if (campError) {
          errors.push(`Campaign ${campaign.campaign_id}: ${campError.message}`);
          continue;
        }
        importedCampaigns++;

        // Fetch ad groups
        const adGroupsData = (await fetchTikTokGet("/adgroup/get/", tiktokAccessToken, {
          advertiser_id: advertiserId,
          campaign_ids: JSON.stringify([campaign.campaign_id]),
          page_size: 1000,
        })) as { list: TikTokAdGroup[] };

        const adGroups = adGroupsData?.list || [];

        // Ad group level reporting
        let adGroupReportMap: Record<string, TikTokReportMetrics> = {};
        if (adGroups.length > 0) {
          try {
            const agReportData = (await fetchTikTokReport("/report/integrated/get/", tiktokAccessToken, advertiserId, {
              report_type: "BASIC",
              data_level: "AUCTION_ADGROUP",
              dimensions: ["adgroup_id"],
              metrics: REPORT_METRICS,
              filtering: [{ field_name: "campaign_id", filter_type: "IN", filter_value: JSON.stringify([campaign.campaign_id]) }],
              start_date: resolvedStartDate,
              end_date: resolvedEndDate,
              page_size: 1000,
            })) as { list: TikTokReportRow[] };

            for (const row of agReportData?.list || []) {
              if (row.dimensions.adgroup_id) {
                adGroupReportMap[row.dimensions.adgroup_id] = row.metrics;
              }
            }
          } catch (e) {
            console.error("Ad group report fetch error:", e);
          }
        }

        for (const adGroup of adGroups) {
          try {
            const agm = adGroupReportMap[adGroup.adgroup_id] || {};
            const impressions = num(agm.impressions);
            const spend = num(agm.spend);
            const thruplays = num(agm.video_views_p100);
            const video3s = num(agm.video_play_actions);
            const totalEng = num(agm.likes) + num(agm.comments) + num(agm.shares) + num(agm.follows);

            const adGroupRecord = {
              space_id: spaceId,
              tiktok_campaign_id: upsertedCampaign.id,
              adgroup_id: adGroup.adgroup_id,
              adgroup_name: adGroup.adgroup_name,
              status: adGroup.status,
              amount_spent: spend,
              reach: num(agm.reach),
              impressions,
              frequency: num(agm.frequency),
              cpm: num(agm.cpm),
              cpc: num(agm.cpc),
              ctr: num(agm.ctr),
              clicks: num(agm.clicks),
              thruplays,
              thruplay_rate: impressions > 0 ? (thruplays / impressions) * 100 : 0,
              cost_per_thruplay: thruplays > 0 ? spend / thruplays : 0,
              video_3s_plays: video3s,
              view_rate_3s: impressions > 0 ? (video3s / impressions) * 100 : 0,
              cost_per_3s_play: video3s > 0 ? spend / video3s : 0,
              engagement_rate: num(agm.engagement_rate),
              cpe: totalEng > 0 ? spend / totalEng : 0,
              likes: num(agm.likes),
              comments: num(agm.comments),
              shares: num(agm.shares),
              follows: num(agm.follows),
            };

            const { data: upsertedAdGroup, error: agError } = await supabase
              .from("tiktok_ad_groups")
              .upsert(adGroupRecord, { onConflict: "space_id,adgroup_id" })
              .select("id")
              .single();

            if (agError) {
              errors.push(`Ad Group ${adGroup.adgroup_id}: ${agError.message}`);
              continue;
            }
            importedAdGroups++;

            // Fetch ads
            const adsData = (await fetchTikTokGet("/ad/get/", tiktokAccessToken, {
              advertiser_id: advertiserId,
              adgroup_ids: JSON.stringify([adGroup.adgroup_id]),
              page_size: 1000,
            })) as { list: TikTokAd[] };

            const ads = adsData?.list || [];

            // Ad level reporting
            let adReportMap: Record<string, TikTokReportMetrics> = {};
            if (ads.length > 0) {
              try {
                const adReportData = (await fetchTikTokReport("/report/integrated/get/", tiktokAccessToken, advertiserId, {
                  report_type: "BASIC",
                  data_level: "AUCTION_AD",
                  dimensions: ["ad_id"],
                  metrics: REPORT_METRICS,
                  filtering: [{ field_name: "adgroup_id", filter_type: "IN", filter_value: JSON.stringify([adGroup.adgroup_id]) }],
                  start_date: resolvedStartDate,
                  end_date: resolvedEndDate,
                  page_size: 1000,
                })) as { list: TikTokReportRow[] };

                for (const row of adReportData?.list || []) {
                  if (row.dimensions.ad_id) {
                    adReportMap[row.dimensions.ad_id] = row.metrics;
                  }
                }
              } catch (e) {
                console.error("Ad report fetch error:", e);
              }
            }

            for (const ad of ads) {
              try {
                const am = adReportMap[ad.ad_id] || {};
                const adImpressions = num(am.impressions);
                const adSpend = num(am.spend);
                const adThruplays = num(am.video_views_p100);
                const adVideo3s = num(am.video_play_actions);
                const adTotalEng = num(am.likes) + num(am.comments) + num(am.shares) + num(am.follows);

                const adRecord = {
                  space_id: spaceId,
                  tiktok_ad_group_id: upsertedAdGroup.id,
                  ad_id: ad.ad_id,
                  ad_name: ad.ad_name,
                  status: ad.status,
                  amount_spent: adSpend,
                  reach: num(am.reach),
                  impressions: adImpressions,
                  frequency: num(am.frequency),
                  cpm: num(am.cpm),
                  cpc: num(am.cpc),
                  ctr: num(am.ctr),
                  clicks: num(am.clicks),
                  thruplays: adThruplays,
                  thruplay_rate: adImpressions > 0 ? (adThruplays / adImpressions) * 100 : 0,
                  cost_per_thruplay: adThruplays > 0 ? adSpend / adThruplays : 0,
                  video_3s_plays: adVideo3s,
                  view_rate_3s: adImpressions > 0 ? (adVideo3s / adImpressions) * 100 : 0,
                  cost_per_3s_play: adVideo3s > 0 ? adSpend / adVideo3s : 0,
                  engagement_rate: num(am.engagement_rate),
                  cpe: adTotalEng > 0 ? adSpend / adTotalEng : 0,
                  likes: num(am.likes),
                  comments: num(am.comments),
                  shares: num(am.shares),
                  follows: num(am.follows),
                  link_clicks: num(am.clicks),
                };

                const { error: adError } = await supabase
                  .from("tiktok_ads")
                  .upsert(adRecord, { onConflict: "space_id,ad_id" });

                if (adError) {
                  errors.push(`Ad ${ad.ad_id}: ${adError.message}`);
                } else {
                  importedAds++;
                }
              } catch (adErr) {
                errors.push(`Ad ${ad.ad_id}: ${adErr instanceof Error ? adErr.message : "Unknown"}`);
              }
            }
          } catch (agErr) {
            errors.push(`Ad Group ${adGroup.adgroup_id}: ${agErr instanceof Error ? agErr.message : "Unknown"}`);
          }
        }
      } catch (campErr) {
        errors.push(`Campaign ${campaign.campaign_id}: ${campErr instanceof Error ? campErr.message : "Unknown"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          campaigns: importedCampaigns,
          adGroups: importedAdGroups,
          ads: importedAds,
          totalCampaignsFound: campaigns.length,
        },
        errors: errors.length > 0 ? errors : undefined,
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
