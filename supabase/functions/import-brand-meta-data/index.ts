import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MetaInsightAction {
  action_type: string;
  value: string;
}

interface MetaVideoAction {
  action_type?: string;
  value: string;
}

interface MetaCostAction {
  action_type?: string;
  value: string;
}

interface MetaInsight {
  campaign_id?: string;
  campaign_name?: string;
  adset_name?: string;
  adset_id?: string;
  ad_name?: string;
  ad_id?: string;
  date_start?: string;
  date_stop?: string;
  spend?: string;
  reach?: string;
  impressions?: string;
  frequency?: string;
  cpm?: string;
  ctr?: string;
  cpc?: string;
  cost_per_thruplay?: MetaCostAction[];
  video_avg_time_watched_actions?: MetaVideoAction[];
  video_thruplay_watched_actions?: MetaVideoAction[];
  actions?: MetaInsightAction[];
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaCreative {
  id?: string;
  image_url?: string;
  thumbnail_url?: string;
  asset_feed_spec?: {
    videos?: { thumbnail_url?: string }[];
  };
  object_story_spec?: {
    video_data?: { image_url?: string };
  };
}

const getBestAdImage = (creative?: MetaCreative): string | null => {
  if (!creative) return null;
  return (
    creative.object_story_spec?.video_data?.image_url ||
    creative.image_url ||
    creative.asset_feed_spec?.videos?.[0]?.thumbnail_url ||
    creative.thumbnail_url ||
    null
  );
};

const getActionValue = (actions: MetaInsightAction[] | undefined, type: string): number => {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === type);
  return action ? parseInt(action.value) : 0;
};

const getCostValue = (costs: MetaCostAction[] | undefined, type: string): number => {
  if (!costs || costs.length === 0) return 0;
  const row = costs.find((c) => c.action_type === type) ?? costs[0];
  const parsed = parseFloat(row?.value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateMetrics = (insight: MetaInsight) => {
  const impressions = insight.impressions ? parseInt(insight.impressions) : 0;
  const spend = insight.spend ? parseFloat(insight.spend) : 0;
  const actions = insight.actions || [];

  const thruplayAction = insight.video_thruplay_watched_actions?.find(
    (a) => a.action_type === "video_view"
  );
  const thruplays = thruplayAction ? parseInt(thruplayAction.value) : 0;
  const video3sPlays = getActionValue(actions, "video_view");
  const postReactions = getActionValue(actions, "post_reaction");
  const postComments = getActionValue(actions, "comment");
  const postShares = getActionValue(actions, "post");
  const postSaves = getActionValue(actions, "onsite_conversion.post_save");
  const linkClicks = getActionValue(actions, "link_click");

  const thruplayRate = impressions > 0 ? (thruplays / impressions) * 100 : 0;
  const viewRate3s = impressions > 0 ? (video3sPlays / impressions) * 100 : 0;
  const costPer3sPlay = video3sPlays > 0 ? spend / video3sPlays : 0;
  const totalEngagement = postReactions + postComments + postShares + postSaves;
  const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;
  const cpe = totalEngagement > 0 ? spend / totalEngagement : 0;
  const videoAvgPlayTime = insight.video_avg_time_watched_actions?.[0]?.value
    ? parseFloat(insight.video_avg_time_watched_actions[0].value) : 0;

  return {
    impressions, spend, thruplays, video3sPlays,
    postReactions, postComments, postShares, postSaves, linkClicks,
    thruplayRate, viewRate3s, costPer3sPlay, engagementRate, cpe, videoAvgPlayTime,
  };
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

    const { spaceId, thumbnailsOnly } = await req.json();
    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up meta_id from space
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("meta_id")
      .eq("id", spaceId)
      .single();

    if (spaceError || !space?.meta_id) {
      return new Response(
        JSON.stringify({ error: "Brand has no Meta Ad Account ID configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adAccountId = space.meta_id;
    const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaAccessToken) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── THUMBNAILS-ONLY FAST PATH ──
    if (thumbnailsOnly) {
      console.log("Thumbnails-only mode: fetching creative images for existing ads");
      const { data: existingAds, error: adsErr } = await supabase
        .from("brand_ads")
        .select("id, ad_id")
        .eq("space_id", spaceId);

      if (adsErr) {
        return new Response(JSON.stringify({ error: adsErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      const errors: string[] = [];

      // Process in batches of 50 to stay within timeout
      for (const ad of (existingAds || [])) {
        try {
          const adUrl = `https://graph.facebook.com/v21.0/${ad.ad_id}?fields=creative{id,image_url,thumbnail_url,asset_feed_spec,object_story_spec}&access_token=${metaAccessToken}`;
          const res = await fetch(adUrl);
          const data = await res.json();

          if (data.error) {
            errors.push(`Ad ${ad.ad_id}: ${data.error.message}`);
            continue;
          }

          const imageUrl = getBestAdImage(data.creative as MetaCreative);
          if (imageUrl) {
            const { error: upErr } = await supabase
              .from("brand_ads")
              .update({ thumbnail_url: imageUrl })
              .eq("id", ad.id);
            if (upErr) errors.push(`Update ${ad.ad_id}: ${upErr.message}`);
            else updated++;
          }
        } catch (e) {
          errors.push(`Ad ${ad.ad_id}: ${e instanceof Error ? e.message : "Unknown"}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        imported: { ads: updated, totalAds: existingAds?.length || 0 },
        errors: errors.length > 0 ? errors : undefined,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── FULL IMPORT PATH ──
    let importedCampaigns = 0;
    let importedAdSets = 0;
    let importedAds = 0;
    const errors: string[] = [];

    // Step 1: Get all campaigns from ad account
    console.log(`Fetching campaigns for ad account: ${adAccountId}`);
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=500&access_token=${metaAccessToken}`;
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      return new Response(
        JSON.stringify({ error: `Meta API error: ${campaignsData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaigns: MetaCampaign[] = campaignsData.data || [];
    console.log(`Found ${campaigns.length} campaigns`);

    const insightFields = "date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions";

    for (const campaign of campaigns) {
      try {
        // Get campaign insights
        const insightsUrl = `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=${insightFields}&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
        const insightsRes = await fetch(insightsUrl);
        const insightsData = await insightsRes.json();

        const insight: MetaInsight | undefined = insightsData.data?.[0];
        const metrics = insight ? calculateMetrics(insight) : null;

        // Upsert campaign
        const campaignRecord = {
          space_id: spaceId,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          objective: campaign.objective || null,
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          amount_spent: metrics?.spend || 0,
          reach: insight?.reach ? parseInt(insight.reach) : 0,
          impressions: metrics?.impressions || 0,
          frequency: insight?.frequency ? parseFloat(insight.frequency) : 0,
          cpm: insight?.cpm ? parseFloat(insight.cpm) : 0,
          cpc: insight?.cpc ? parseFloat(insight.cpc) : 0,
          ctr: insight?.ctr ? parseFloat(insight.ctr) : 0,
          clicks: metrics?.linkClicks || 0,
          date_start: insight?.date_start || null,
          date_stop: insight?.date_stop || null,
        };

        const { data: upsertedCampaign, error: campError } = await supabase
          .from("brand_campaigns")
          .upsert(campaignRecord, { onConflict: "space_id,campaign_id" })
          .select("id")
          .single();

        if (campError) {
          errors.push(`Campaign ${campaign.id}: ${campError.message}`);
          continue;
        }
        importedCampaigns++;

        // Step 2: Get ad sets for this campaign
        const adSetsUrl = `https://graph.facebook.com/v21.0/${campaign.id}/adsets?fields=id,name,status&limit=500&access_token=${metaAccessToken}`;
        const adSetsRes = await fetch(adSetsUrl);
        const adSetsData = await adSetsRes.json();

        if (adSetsData.error) {
          errors.push(`Ad sets for campaign ${campaign.id}: ${adSetsData.error.message}`);
          continue;
        }

        const adSets = adSetsData.data || [];

        for (const adSet of adSets) {
          try {
            const asInsightsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/insights?fields=${insightFields}&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
            const asInsightsRes = await fetch(asInsightsUrl);
            const asInsightsData = await asInsightsRes.json();

            const asInsight: MetaInsight | undefined = asInsightsData.data?.[0];
            const asMetrics = asInsight ? calculateMetrics(asInsight) : null;


            const adSetRecord = {
              space_id: spaceId,
              brand_campaign_id: upsertedCampaign.id,
              adset_id: adSet.id,
              adset_name: adSet.name,
              status: adSet.status,
              amount_spent: asMetrics?.spend || 0,
              reach: asInsight?.reach ? parseInt(asInsight.reach) : 0,
              impressions: asMetrics?.impressions || 0,
              frequency: asInsight?.frequency ? parseFloat(asInsight.frequency) : 0,
              cpm: asInsight?.cpm ? parseFloat(asInsight.cpm) : 0,
              cpc: asInsight?.cpc ? parseFloat(asInsight.cpc) : 0,
              ctr: asInsight?.ctr ? parseFloat(asInsight.ctr) : 0,
              clicks: asMetrics?.linkClicks || 0,
              thruplays: asMetrics?.thruplays || 0,
              thruplay_rate: asMetrics?.thruplayRate || 0,
              cost_per_thruplay: asInsight ? getCostValue(asInsight.cost_per_thruplay, "video_view") : 0,
              video_3s_plays: asMetrics?.video3sPlays || 0,
              view_rate_3s: asMetrics?.viewRate3s || 0,
              cost_per_3s_play: asMetrics?.costPer3sPlay || 0,
              engagement_rate: asMetrics?.engagementRate || 0,
              cpe: asMetrics?.cpe || 0,
              date_start: asInsight?.date_start || null,
              date_stop: asInsight?.date_stop || null,
            };

            const { data: upsertedAdSet, error: asError } = await supabase
              .from("brand_ad_sets")
              .upsert(adSetRecord, { onConflict: "space_id,adset_id" })
              .select("id")
              .single();

            if (asError) {
              errors.push(`Ad Set ${adSet.id}: ${asError.message}`);
              continue;
            }
            importedAdSets++;

            // Step 3: Get ads for this ad set
            const adsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name,status,creative{id,image_url,thumbnail_url,asset_feed_spec,object_story_spec}&limit=500&access_token=${metaAccessToken}`;
            const adsRes = await fetch(adsUrl);
            const adsData = await adsRes.json();

            if (adsData.error) {
              errors.push(`Ads for adset ${adSet.id}: ${adsData.error.message}`);
              continue;
            }

            for (const ad of (adsData.data || [])) {
              try {
                const adInsightsUrl = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=${insightFields}&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
                const adInsightsRes = await fetch(adInsightsUrl);
                const adInsightsData = await adInsightsRes.json();

                const adInsight: MetaInsight | undefined = adInsightsData.data?.[0];
                const adMetrics = adInsight ? calculateMetrics(adInsight) : null;

                const previewUrl = getBestAdImage(ad.creative as MetaCreative);

                const adRecord = {
                  space_id: spaceId,
                  brand_ad_set_id: upsertedAdSet.id,
                  ad_id: ad.id,
                  ad_name: ad.name,
                  status: ad.status,
                  thumbnail_url: previewUrl,
                  amount_spent: adMetrics?.spend || 0,
                  reach: adInsight?.reach ? parseInt(adInsight.reach) : 0,
                  impressions: adMetrics?.impressions || 0,
                  frequency: adInsight?.frequency ? parseFloat(adInsight.frequency) : 0,
                  cpm: adInsight?.cpm ? parseFloat(adInsight.cpm) : 0,
                  cpc: adInsight?.cpc ? parseFloat(adInsight.cpc) : 0,
                  ctr: adInsight?.ctr ? parseFloat(adInsight.ctr) : 0,
                  clicks: adMetrics?.linkClicks || 0,
                  thruplays: adMetrics?.thruplays || 0,
                  thruplay_rate: adMetrics?.thruplayRate || 0,
                  cost_per_thruplay: adInsight ? getCostValue(adInsight.cost_per_thruplay, "video_view") : 0,
                  video_3s_plays: adMetrics?.video3sPlays || 0,
                  view_rate_3s: adMetrics?.viewRate3s || 0,
                  cost_per_3s_play: adMetrics?.costPer3sPlay || 0,
                  engagement_rate: adMetrics?.engagementRate || 0,
                  cpe: adMetrics?.cpe || 0,
                  post_reactions: adMetrics?.postReactions || 0,
                  post_comments: adMetrics?.postComments || 0,
                  post_shares: adMetrics?.postShares || 0,
                  post_saves: adMetrics?.postSaves || 0,
                  link_clicks: adMetrics?.linkClicks || 0,
                  date_start: adInsight?.date_start || null,
                  date_stop: adInsight?.date_stop || null,
                };

                const { error: adError } = await supabase
                  .from("brand_ads")
                  .upsert(adRecord, { onConflict: "space_id,ad_id" });

                if (adError) {
                  errors.push(`Ad ${ad.id}: ${adError.message}`);
                } else {
                  importedAds++;
                }
              } catch (adErr) {
                errors.push(`Ad ${ad.id}: ${adErr instanceof Error ? adErr.message : "Unknown error"}`);
              }
            }
          } catch (asErr) {
            errors.push(`Ad Set ${adSet.id}: ${asErr instanceof Error ? asErr.message : "Unknown error"}`);
          }
        }
      } catch (campErr) {
        errors.push(`Campaign ${campaign.id}: ${campErr instanceof Error ? campErr.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          campaigns: importedCampaigns,
          adSets: importedAdSets,
          ads: importedAds,
          totalCampaignsFound: campaigns.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
