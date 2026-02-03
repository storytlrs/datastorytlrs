import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  campaign: { id: string; name: string };
  insights?: {
    data: Array<{
      impressions?: string;
      reach?: string;
      spend?: string;
      cpm?: string;
      cpc?: string;
      ctr?: string;
      frequency?: string;
      actions?: Array<{ action_type: string; value: string }>;
      video_thruplay_watched_actions?: Array<{ value: string }>;
      video_p25_watched_actions?: Array<{ value: string }>;
      cost_per_thruplay?: Array<{ value: string }>;
      video_play_actions?: Array<{ value: string }>;
      video_avg_time_watched_actions?: Array<{ value: string }>;
      date_start?: string;
      date_stop?: string;
    }>;
  };
}

interface MetaAd {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  insights?: {
    data: Array<{
      impressions?: string;
      reach?: string;
      spend?: string;
      cpm?: string;
      cpc?: string;
      ctr?: string;
      frequency?: string;
      actions?: Array<{ action_type: string; value: string }>;
      video_thruplay_watched_actions?: Array<{ value: string }>;
      cost_per_thruplay?: Array<{ value: string }>;
      video_play_actions?: Array<{ value: string }>;
      video_avg_time_watched_actions?: Array<{ value: string }>;
      date_start?: string;
      date_stop?: string;
      age?: string;
      gender?: string;
    }>;
  };
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

    const { reportId, adAccountId, platform = "facebook", datePreset = "last_30d" } = await req.json();

    if (!reportId || !adAccountId) {
      return new Response(
        JSON.stringify({ error: "reportId and adAccountId are required" }),
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

    // Fetch ad sets from Meta API
    const adSetsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adsets?fields=id,name,campaign{id,name},insights.date_preset(${datePreset}){impressions,reach,spend,cpm,cpc,ctr,frequency,video_thruplay_watched_actions,cost_per_thruplay,video_play_actions,video_avg_time_watched_actions,date_start,date_stop}&access_token=${metaAccessToken}&limit=500`;
    
    const adSetsResponse = await fetch(adSetsUrl);
    const adSetsData = await adSetsResponse.json();

    if (adSetsData.error) {
      return new Response(
        JSON.stringify({ error: `Meta API error: ${adSetsData.error.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adSets: MetaAdSet[] = adSetsData.data || [];
    let importedAdSets = 0;
    let importedAds = 0;

    // Import ad sets
    for (const adSet of adSets) {
      const insights = adSet.insights?.data?.[0];
      
      const adSetData = {
        report_id: reportId,
        platform: platform as "facebook" | "instagram",
        ad_id: adSet.id,
        ad_name: adSet.name,
        campaign_id: adSet.campaign?.id || null,
        campaign_name: adSet.campaign?.name || null,
        impressions: insights?.impressions ? parseInt(insights.impressions) : 0,
        reach: insights?.reach ? parseInt(insights.reach) : 0,
        amount_spent: insights?.spend ? parseFloat(insights.spend) : 0,
        cpm: insights?.cpm ? parseFloat(insights.cpm) : 0,
        cpc: insights?.cpc ? parseFloat(insights.cpc) : 0,
        ctr: insights?.ctr ? parseFloat(insights.ctr) : 0,
        frequency: insights?.frequency ? parseFloat(insights.frequency) : 0,
        thruplays: insights?.video_thruplay_watched_actions?.[0]?.value 
          ? parseInt(insights.video_thruplay_watched_actions[0].value) : 0,
        cost_per_thruplay: insights?.cost_per_thruplay?.[0]?.value 
          ? parseFloat(insights.cost_per_thruplay[0].value) : 0,
        video_3s_plays: insights?.video_play_actions?.[0]?.value 
          ? parseInt(insights.video_play_actions[0].value) : 0,
        date_start: insights?.date_start || null,
        date_stop: insights?.date_stop || null,
      };

      const { error: upsertError } = await supabase
        .from("ad_sets")
        .upsert(adSetData, { onConflict: "report_id,ad_id" });

      if (!upsertError) {
        importedAdSets++;
      }
    }

    // Fetch individual ads from Meta API
    const adsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=id,name,adset_id,campaign_id,insights.date_preset(${datePreset}){impressions,reach,spend,cpm,cpc,ctr,frequency,video_thruplay_watched_actions,cost_per_thruplay,video_play_actions,video_avg_time_watched_actions,date_start,date_stop,actions}&access_token=${metaAccessToken}&limit=500`;
    
    const adsResponse = await fetch(adsUrl);
    const adsData = await adsResponse.json();

    if (!adsData.error) {
      const ads: MetaAd[] = adsData.data || [];

      for (const ad of ads) {
        const insights = ad.insights?.data?.[0];
        
        // Find the corresponding ad_set in our database
        const { data: adSetRecord } = await supabase
          .from("ad_sets")
          .select("id")
          .eq("report_id", reportId)
          .eq("ad_id", ad.adset_id)
          .single();

        if (!adSetRecord) continue;

        // Extract engagement metrics from actions
        const actions = insights?.actions || [];
        const getActionValue = (type: string) => {
          const action = actions.find((a: { action_type: string; value: string }) => a.action_type === type);
          return action ? parseInt(action.value) : 0;
        };

        const adData = {
          ad_set_id: adSetRecord.id,
          report_id: reportId,
          platform: platform as "facebook" | "instagram",
          ad_id: ad.id,
          ad_name: ad.name,
          impressions: insights?.impressions ? parseInt(insights.impressions) : 0,
          reach: insights?.reach ? parseInt(insights.reach) : 0,
          amount_spent: insights?.spend ? parseFloat(insights.spend) : 0,
          cpm: insights?.cpm ? parseFloat(insights.cpm) : 0,
          cpc: insights?.cpc ? parseFloat(insights.cpc) : 0,
          ctr: insights?.ctr ? parseFloat(insights.ctr) : 0,
          frequency: insights?.frequency ? parseFloat(insights.frequency) : 0,
          thruplays: insights?.video_thruplay_watched_actions?.[0]?.value 
            ? parseInt(insights.video_thruplay_watched_actions[0].value) : 0,
          cost_per_thruplay: insights?.cost_per_thruplay?.[0]?.value 
            ? parseFloat(insights.cost_per_thruplay[0].value) : 0,
          video_3s_plays: insights?.video_play_actions?.[0]?.value 
            ? parseInt(insights.video_play_actions[0].value) : 0,
          date_start: insights?.date_start || null,
          date_stop: insights?.date_stop || null,
          post_reactions: getActionValue("post_reaction"),
          post_comments: getActionValue("comment"),
          post_shares: getActionValue("post"),
          post_saves: getActionValue("onsite_conversion.post_save"),
          link_clicks: getActionValue("link_click"),
        };

        const { error: adUpsertError } = await supabase
          .from("ads")
          .upsert(adData, { onConflict: "report_id,ad_id" });

        if (!adUpsertError) {
          importedAds++;
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
