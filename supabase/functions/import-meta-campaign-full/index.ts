import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  account_name?: string;
  account_id?: string;
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
  instagram_profile_visits?: string;
  cost_per_thruplay?: MetaCostAction[];
  video_avg_time_watched_actions?: MetaVideoAction[];
  video_thruplay_watched_actions?: MetaVideoAction[];
  actions?: MetaInsightAction[];
}

interface MetaAdSet {
  id: string;
  name: string;
}

interface MetaAd {
  id: string;
  name: string;
}

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reportId, campaignId, platform = "facebook" } = await req.json();

    if (!reportId || !campaignId) {
      return new Response(
        JSON.stringify({ error: "reportId and campaignId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaAccessToken) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper functions
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
      const viewRate3s = video3sPlays;
      const costPer3sPlay = video3sPlays > 0 ? spend / video3sPlays : 0;
      const totalEngagement = postReactions + postComments + postShares + postSaves;
      const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;
      const cpe = totalEngagement > 0 ? spend / totalEngagement : 0;
      const videoAvgPlayTime = insight.video_avg_time_watched_actions?.[0]?.value
        ? parseFloat(insight.video_avg_time_watched_actions[0].value) : 0;

      return {
        impressions,
        spend,
        thruplays,
        video3sPlays,
        postReactions,
        postComments,
        postShares,
        postSaves,
        linkClicks,
        thruplayRate,
        viewRate3s,
        costPer3sPlay,
        totalEngagement,
        engagementRate,
        cpe,
        videoAvgPlayTime,
      };
    };

    let importedCampaignMeta = 0;
    let importedAdSets = 0;
    let importedAds = 0;
    const errors: string[] = [];

    // Step 1: Get campaign insights first
    console.log(`Fetching campaign insights for: ${campaignId}`);
    const campaignInsightsUrl = `https://graph.facebook.com/v21.0/${campaignId}/insights?fields=account_name,account_id,campaign_id,campaign_name,date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,instagram_profile_visits,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
    
    const campaignInsightsResponse = await fetch(campaignInsightsUrl);
    const campaignInsightsData = await campaignInsightsResponse.json();

    if (campaignInsightsData.error) {
      return new Response(
        JSON.stringify({ error: `Meta API error: ${campaignInsightsData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert campaign into campaign_meta
    const campaignInsight: MetaInsight = campaignInsightsData.data?.[0];
    if (campaignInsight) {
      const campaignMetrics = calculateMetrics(campaignInsight);
      
      const campaignMetaData = {
        report_id: reportId,
        platform: platform as "facebook" | "instagram",
        account_name: campaignInsight.account_name || null,
        account_id: campaignInsight.account_id || null,
        campaign_id: campaignInsight.campaign_id || campaignId,
        campaign_name: campaignInsight.campaign_name || null,
        impressions: campaignMetrics.impressions,
        reach: campaignInsight.reach ? parseInt(campaignInsight.reach) : 0,
        amount_spent: campaignMetrics.spend,
        cpm: campaignInsight.cpm ? parseFloat(campaignInsight.cpm) : 0,
        cpc: campaignInsight.cpc ? parseFloat(campaignInsight.cpc) : 0,
        ctr: campaignInsight.ctr ? parseFloat(campaignInsight.ctr) : 0,
        frequency: campaignInsight.frequency ? parseFloat(campaignInsight.frequency) : 0,
        thruplays: campaignMetrics.thruplays,
        thruplay_rate: campaignMetrics.thruplayRate,
        cost_per_thruplay: getCostValue(campaignInsight.cost_per_thruplay, "video_view"),
        video_3s_plays: campaignMetrics.video3sPlays,
        view_rate_3s: campaignMetrics.viewRate3s,
        cost_per_3s_play: campaignMetrics.costPer3sPlay,
        video_avg_play_time: campaignMetrics.videoAvgPlayTime,
        engagement_rate: campaignMetrics.engagementRate,
        cpe: campaignMetrics.cpe,
        post_reactions: campaignMetrics.postReactions,
        post_comments: campaignMetrics.postComments,
        post_shares: campaignMetrics.postShares,
        post_saves: campaignMetrics.postSaves,
        link_clicks: campaignMetrics.linkClicks,
        instagram_profile_visits: campaignInsight.instagram_profile_visits
          ? parseInt(campaignInsight.instagram_profile_visits) : 0,
        date_start: campaignInsight.date_start || null,
        date_stop: campaignInsight.date_stop || null,
      };

      const { error: campaignMetaError } = await supabase
        .from("campaign_meta")
        .insert(campaignMetaData);

      if (campaignMetaError) {
        errors.push(`Campaign meta: ${campaignMetaError.message}`);
      } else {
        importedCampaignMeta++;
      }
    }

    // Step 2: Get all ad sets from campaign
    console.log(`Fetching ad sets for campaign: ${campaignId}`);
    const adSetsUrl = `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name&access_token=${metaAccessToken}`;
    const adSetsResponse = await fetch(adSetsUrl);
    const adSetsData = await adSetsResponse.json();

    if (adSetsData.error) {
      return new Response(
        JSON.stringify({ error: `Meta API error: ${adSetsData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adSets: MetaAdSet[] = adSetsData.data || [];
    console.log(`Found ${adSets.length} ad sets`);

    // Step 2: Process each ad set
    for (const adSet of adSets) {
      try {
        // Get ad set insights
        const adsetInsightsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/insights?fields=account_name,account_id,campaign_id,campaign_name,adset_name,adset_id,date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,instagram_profile_visits,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
        
        const adsetInsightsResponse = await fetch(adsetInsightsUrl);
        const adsetInsightsData = await adsetInsightsResponse.json();

        if (adsetInsightsData.error) {
          errors.push(`Ad Set ${adSet.id}: ${adsetInsightsData.error.message}`);
          continue;
        }

        const insight: MetaInsight = adsetInsightsData.data?.[0];
        if (insight) {
          const metrics = calculateMetrics(insight);

          const adSetData = {
            report_id: reportId,
            platform: platform as "facebook" | "instagram",
            ad_id: insight.adset_id || adSet.id,
            ad_name: insight.adset_name || adSet.name,
            campaign_id: insight.campaign_id || campaignId,
            campaign_name: insight.campaign_name || null,
            impressions: metrics.impressions,
            reach: insight.reach ? parseInt(insight.reach) : 0,
            amount_spent: metrics.spend,
            cpm: insight.cpm ? parseFloat(insight.cpm) : 0,
            cpc: insight.cpc ? parseFloat(insight.cpc) : 0,
            ctr: insight.ctr ? parseFloat(insight.ctr) : 0,
            frequency: insight.frequency ? parseFloat(insight.frequency) : 0,
            thruplays: metrics.thruplays,
            thruplay_rate: metrics.thruplayRate,
            cost_per_thruplay: getCostValue(insight.cost_per_thruplay, "video_view"),
            video_3s_plays: metrics.video3sPlays,
            view_rate_3s: metrics.viewRate3s,
            cost_per_3s_play: metrics.costPer3sPlay,
            video_avg_play_time: metrics.videoAvgPlayTime,
            engagement_rate: metrics.engagementRate,
            cpe: metrics.cpe,
            post_reactions: metrics.postReactions,
            post_comments: metrics.postComments,
            post_shares: metrics.postShares,
            post_saves: metrics.postSaves,
            link_clicks: metrics.linkClicks,
            instagram_profile_visits: insight.instagram_profile_visits
              ? parseInt(insight.instagram_profile_visits) : 0,
            date_start: insight.date_start || null,
            date_stop: insight.date_stop || null,
          };

          const { data: upsertedAdSet, error: adSetError } = await supabase
            .from("ad_sets")
            .upsert(adSetData, { onConflict: "report_id,ad_id" })
            .select("id")
            .single();

          if (adSetError) {
            errors.push(`Ad Set ${adSet.id} insert: ${adSetError.message}`);
          } else {
            importedAdSets++;

            // Step 3: Get all ads from this ad set
            const adsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name&access_token=${metaAccessToken}`;
            const adsResponse = await fetch(adsUrl);
            const adsData = await adsResponse.json();

            if (adsData.error) {
              errors.push(`Ads for ${adSet.id}: ${adsData.error.message}`);
              continue;
            }

            const ads: MetaAd[] = adsData.data || [];
            console.log(`Found ${ads.length} ads for ad set ${adSet.id}`);

            // Step 4: Process each ad
            for (const ad of ads) {
              try {
                const adInsightsUrl = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=account_name,account_id,campaign_id,campaign_name,adset_name,adset_id,ad_name,ad_id,date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,instagram_profile_visits,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
                
                const adInsightsResponse = await fetch(adInsightsUrl);
                const adInsightsData = await adInsightsResponse.json();

                if (adInsightsData.error) {
                  errors.push(`Ad ${ad.id}: ${adInsightsData.error.message}`);
                  continue;
                }

                const adInsight: MetaInsight = adInsightsData.data?.[0];
                if (adInsight) {
                  const adMetrics = calculateMetrics(adInsight);

                  const adRecord = {
                    ad_set_id: upsertedAdSet.id,
                    report_id: reportId,
                    platform: platform as "facebook" | "instagram",
                    ad_id: adInsight.ad_id || ad.id,
                    ad_name: adInsight.ad_name || ad.name,
                    impressions: adMetrics.impressions,
                    reach: adInsight.reach ? parseInt(adInsight.reach) : 0,
                    amount_spent: adMetrics.spend,
                    cpm: adInsight.cpm ? parseFloat(adInsight.cpm) : 0,
                    cpc: adInsight.cpc ? parseFloat(adInsight.cpc) : 0,
                    ctr: adInsight.ctr ? parseFloat(adInsight.ctr) : 0,
                    frequency: adInsight.frequency ? parseFloat(adInsight.frequency) : 0,
                    thruplays: adMetrics.thruplays,
                    thruplay_rate: adMetrics.thruplayRate,
                    cost_per_thruplay: getCostValue(adInsight.cost_per_thruplay, "video_view"),
                    video_3s_plays: adMetrics.video3sPlays,
                    view_rate_3s: adMetrics.viewRate3s,
                    cost_per_3s_play: adMetrics.costPer3sPlay,
                    video_avg_play_time: adMetrics.videoAvgPlayTime,
                    engagement_rate: adMetrics.engagementRate,
                    cpe: adMetrics.cpe,
                    post_reactions: adMetrics.postReactions,
                    post_comments: adMetrics.postComments,
                    post_shares: adMetrics.postShares,
                    post_saves: adMetrics.postSaves,
                    link_clicks: adMetrics.linkClicks,
                    instagram_profile_visits: adInsight.instagram_profile_visits
                      ? parseInt(adInsight.instagram_profile_visits) : 0,
                    date_start: adInsight.date_start || null,
                    date_stop: adInsight.date_stop || null,
                  };

                  const { error: adError } = await supabase
                    .from("ads")
                    .upsert(adRecord, { onConflict: "report_id,ad_id" });

                  if (adError) {
                    errors.push(`Ad ${ad.id} insert: ${adError.message}`);
                  } else {
                    importedAds++;
                  }
                }
              } catch (adErr) {
                errors.push(`Ad ${ad.id}: ${adErr instanceof Error ? adErr.message : "Unknown error"}`);
              }
            }
          }
        }
      } catch (adSetErr) {
        errors.push(`Ad Set ${adSet.id}: ${adSetErr instanceof Error ? adSetErr.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          campaignMeta: importedCampaignMeta,
          adSets: importedAdSets,
          ads: importedAds,
          totalAdSetsFound: adSets.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
