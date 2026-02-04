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

    const { reportId, adsetId, adId, platform = "facebook", adAccountId: providedAdAccountId } = await req.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "reportId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get report to find space_id for meta_id lookup
    const { data: reportData } = await supabase
      .from("reports")
      .select("space_id")
      .eq("id", reportId)
      .single();

    // Get meta_id from spaces table if needed
    let adAccountId = providedAdAccountId;
    if (!adAccountId && reportData?.space_id) {
      const { data: spaceData } = await supabase
        .from("spaces")
        .select("meta_id")
        .eq("id", reportData.space_id)
        .single();

      adAccountId = spaceData?.meta_id;
    }

    const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaAccessToken) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let importedAdSets = 0;
    let importedAds = 0;

    // Helper to extract action value
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

    // Fetch adset insights if adsetId provided
    if (adsetId) {
      const adsetUrl = `https://graph.facebook.com/v21.0/${adsetId}/insights?fields=account_name,account_id,campaign_id,campaign_name,adset_name,adset_id,date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,instagram_profile_visits,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
      
      console.log(`Fetching adset insights: ${adsetId}`);
      const adsetResponse = await fetch(adsetUrl);
      const adsetData = await adsetResponse.json();

      if (adsetData.error) {
        console.error("Meta API error:", adsetData.error);
        return new Response(
          JSON.stringify({ error: `Meta API error: ${adsetData.error.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const insight: MetaInsight = adsetData.data?.[0];
      if (insight) {
        // Calculate derived metrics
        const impressions = insight.impressions ? parseInt(insight.impressions) : 0;
        const spend = insight.spend ? parseFloat(insight.spend) : 0;
        
        // Get action values
        const actions = insight.actions || [];

        // ThruPlays come from video_thruplay_watched_actions field with action_type "video_view"
        const thruplayAction = insight.video_thruplay_watched_actions?.find(
          (a) => a.action_type === "video_view"
        );
        const thruplays = thruplayAction ? parseInt(thruplayAction.value) : 0;

        // 3-second video plays come from actions with action_type "video_view"
        const video3sPlays = getActionValue(actions, "video_view");

        const postReactions = getActionValue(actions, "post_reaction");
        const postComments = getActionValue(actions, "comment");
        const postShares = getActionValue(actions, "post");
        const postSaves = getActionValue(actions, "onsite_conversion.post_save");
        const linkClicks = getActionValue(actions, "link_click");

        // ThruPlay rate = ThruPlays / Impressions
        const thruplayRate = impressions > 0 ? (thruplays / impressions) * 100 : 0;
        
        // View rate (3s) = 3-second video plays / Impressions
        const viewRate3s = impressions > 0 ? (video3sPlays / impressions) * 100 : 0;
        
        // Cost per 3-second video play = Amount spent / 3-second video plays
        const costPer3sPlay = video3sPlays > 0 ? spend / video3sPlays : 0;
        
        // Engagement = Post reactions + Post comments + Post shares + Post saves
        const totalEngagement = postReactions + postComments + postShares + postSaves;
        
        // Engagement rate = Engagement / Impressions
        const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;
        
        // CPE = Amount spent / Engagement
        const cpe = totalEngagement > 0 ? spend / totalEngagement : 0;

        // Get video avg time watched
        const videoAvgPlayTime = insight.video_avg_time_watched_actions?.[0]?.value 
          ? parseFloat(insight.video_avg_time_watched_actions[0].value) : 0;

        // Insert into ad_sets
        const adSetData = {
          report_id: reportId,
          platform: platform as "facebook" | "instagram",
          ad_id: insight.adset_id || null,
          ad_name: insight.adset_name || null,
          campaign_id: insight.campaign_id || null,
          campaign_name: insight.campaign_name || null,
          impressions: impressions,
          reach: insight.reach ? parseInt(insight.reach) : 0,
          amount_spent: spend,
          cpm: insight.cpm ? parseFloat(insight.cpm) : 0,
          cpc: insight.cpc ? parseFloat(insight.cpc) : 0,
          ctr: insight.ctr ? parseFloat(insight.ctr) : 0,
          frequency: insight.frequency ? parseFloat(insight.frequency) : 0,
          thruplays: thruplays,
          thruplay_rate: thruplayRate,
          cost_per_thruplay: getCostValue(insight.cost_per_thruplay, "video_view"),
          video_3s_plays: video3sPlays,
          view_rate_3s: viewRate3s,
          cost_per_3s_play: costPer3sPlay,
          video_avg_play_time: videoAvgPlayTime,
          engagement_rate: engagementRate,
          cpe: cpe,
          post_reactions: postReactions,
          post_comments: postComments,
          post_shares: postShares,
          post_saves: postSaves,
          link_clicks: linkClicks,
          instagram_profile_visits: insight.instagram_profile_visits 
            ? parseInt(insight.instagram_profile_visits) : 0,
          date_start: insight.date_start || null,
          date_stop: insight.date_stop || null,
        };

        const { error: adSetError } = await supabase
          .from("ad_sets")
          .upsert(adSetData, { onConflict: "report_id,ad_id" });

        if (!adSetError) {
          importedAdSets++;
        } else {
          console.error("Ad set upsert error:", adSetError);
        }
      }
    }

    // Fetch individual ad insights if adId provided
    if (adId) {
      const adUrl = `https://graph.facebook.com/v21.0/${adId}/insights?fields=account_name,account_id,campaign_id,campaign_name,adset_name,adset_id,ad_name,ad_id,date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc,instagram_profile_visits,cost_per_thruplay,video_avg_time_watched_actions,video_thruplay_watched_actions,actions&date_preset=maximum&action_breakdowns=action_type&access_token=${metaAccessToken}`;
      
      console.log(`Fetching ad insights: ${adId}`);
      const adResponse = await fetch(adUrl);
      const adData = await adResponse.json();

      if (adData.error) {
        console.error("Meta API error for ad:", adData.error);
      } else {
        const insight: MetaInsight & { ad_name?: string; ad_id?: string } = adData.data?.[0];
        if (insight) {
          // Find parent ad_set
          const { data: adSetRecord } = await supabase
            .from("ad_sets")
            .select("id")
            .eq("report_id", reportId)
            .eq("ad_id", insight.adset_id)
            .single();

          if (adSetRecord) {
            // Calculate derived metrics for ad
            const impressions = insight.impressions ? parseInt(insight.impressions) : 0;
            const spend = insight.spend ? parseFloat(insight.spend) : 0;
            
            const actions = insight.actions || [];

            // ThruPlays come from video_thruplay_watched_actions field with action_type "video_view"
            const thruplayAction = insight.video_thruplay_watched_actions?.find(
              (a) => a.action_type === "video_view"
            );
            const thruplays = thruplayAction ? parseInt(thruplayAction.value) : 0;

            // 3-second video plays come from actions with action_type "video_view"
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

            const adsData = {
              ad_set_id: adSetRecord.id,
              report_id: reportId,
              platform: platform as "facebook" | "instagram",
              ad_id: insight.ad_id || adId,
              ad_name: insight.ad_name || "Unknown Ad",
              impressions: impressions,
              reach: insight.reach ? parseInt(insight.reach) : 0,
              amount_spent: spend,
              cpm: insight.cpm ? parseFloat(insight.cpm) : 0,
              cpc: insight.cpc ? parseFloat(insight.cpc) : 0,
              ctr: insight.ctr ? parseFloat(insight.ctr) : 0,
              frequency: insight.frequency ? parseFloat(insight.frequency) : 0,
              thruplays: thruplays,
              thruplay_rate: thruplayRate,
              cost_per_thruplay: getCostValue(insight.cost_per_thruplay, "video_view"),
              video_3s_plays: video3sPlays,
              view_rate_3s: viewRate3s,
              cost_per_3s_play: costPer3sPlay,
              video_avg_play_time: videoAvgPlayTime,
              engagement_rate: engagementRate,
              cpe: cpe,
              post_reactions: postReactions,
              post_comments: postComments,
              post_shares: postShares,
              post_saves: postSaves,
              link_clicks: linkClicks,
              instagram_profile_visits: insight.instagram_profile_visits 
                ? parseInt(insight.instagram_profile_visits) : 0,
              date_start: insight.date_start || null,
              date_stop: insight.date_stop || null,
            };

            const { error: adsError } = await supabase
              .from("ads")
              .upsert(adsData, { onConflict: "report_id,ad_id" });

            if (adsError) {
              console.error("Ads upsert error:", adsError);
            } else {
              importedAds++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: {
          adSets: importedAdSets,
          ads: importedAds,
        },
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
