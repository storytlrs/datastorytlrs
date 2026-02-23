import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const METRIC_KEYS_META = [
  "amount_spent", "reach", "impressions", "frequency", "cpm", "cpc", "ctr", "clicks",
  "thruplays", "thruplay_rate", "cost_per_thruplay", "video_3s_plays", "view_rate_3s",
  "cost_per_3s_play", "engagement_rate", "cpe", "post_reactions", "post_comments",
  "post_shares", "post_saves", "link_clicks",
];

const METRIC_KEYS_TIKTOK = [
  "amount_spent", "reach", "impressions", "frequency", "cpm", "cpc", "ctr", "clicks",
  "video_play_actions", "video_view_rate", "video_watched_2s", "video_watched_6s",
  "video_views_p25", "video_views_p50", "video_views_p100",
  "average_video_play", "average_video_play_per_user",
  "likes", "comments", "shares", "profile_visits", "follows",
  "interactive_addon_clicks", "cost_per_engagement",
];

const extractMetrics = (entity: Record<string, unknown>, keys: string[]): Record<string, number> => {
  const metrics: Record<string, number> = {};
  for (const key of keys) {
    const val = entity[key];
    if (val !== null && val !== undefined) {
      metrics[key] = typeof val === "number" ? val : parseFloat(String(val)) || 0;
    }
  }
  return metrics;
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

    // Service role client for DB operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { spaceId, skipSync } = await req.json();

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const today = new Date().toISOString().split("T")[0];
    const syncResults: Record<string, unknown> = {};

    // Step 1: Sync data from APIs (unless skipSync is true)
    if (!skipSync) {
      // Sync Meta data
      try {
        console.log(`Syncing Meta data for space ${spaceId}...`);
        const metaResponse = await fetch(`${supabaseUrl}/functions/v1/import-brand-meta-data`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spaceId }),
        });
        const metaResult = await metaResponse.json();
        syncResults.meta = metaResult;
        console.log("Meta sync result:", JSON.stringify(metaResult).substring(0, 300));
      } catch (e) {
        console.error("Meta sync failed:", e);
        syncResults.meta = { error: e instanceof Error ? e.message : "Unknown error" };
      }

      // Sync TikTok data
      try {
        console.log(`Syncing TikTok data for space ${spaceId}...`);
        const tiktokResponse = await fetch(`${supabaseUrl}/functions/v1/import-tiktok-ads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spaceId }),
        });
        const tiktokResult = await tiktokResponse.json();
        syncResults.tiktok = tiktokResult;
        console.log("TikTok sync result:", JSON.stringify(tiktokResult).substring(0, 300));
      } catch (e) {
        console.error("TikTok sync failed:", e);
        syncResults.tiktok = { error: e instanceof Error ? e.message : "Unknown error" };
      }
    }

    // Step 2: Take snapshots of current state
    let snapshotCount = 0;
    const snapshotRows: Array<{
      space_id: string;
      entity_type: string;
      entity_id: string;
      entity_name: string | null;
      parent_entity_id: string | null;
      snapshot_date: string;
      metrics: Record<string, number>;
    }> = [];

    // Meta Campaigns
    const { data: metaCampaigns } = await supabase
      .from("brand_campaigns")
      .select("*")
      .eq("space_id", spaceId)
      .eq("age", "").eq("gender", "").eq("publisher_platform", "unknown");
    
    for (const c of metaCampaigns || []) {
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_campaign",
        entity_id: c.campaign_id,
        entity_name: c.campaign_name,
        parent_entity_id: null,
        snapshot_date: today,
        metrics: extractMetrics(c as Record<string, unknown>, METRIC_KEYS_META),
      });
    }

    // Meta Ad Sets
    const { data: metaAdSets } = await supabase
      .from("brand_ad_sets")
      .select("*")
      .eq("space_id", spaceId)
      .eq("age", "").eq("gender", "").eq("publisher_platform", "unknown");
    
    for (const as of metaAdSets || []) {
      // Find parent campaign_id
      const parentCampaign = metaCampaigns?.find(c => c.id === as.brand_campaign_id);
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_ad_set",
        entity_id: as.adset_id,
        entity_name: as.adset_name,
        parent_entity_id: parentCampaign?.campaign_id || null,
        snapshot_date: today,
        metrics: extractMetrics(as as Record<string, unknown>, METRIC_KEYS_META),
      });
    }

    // Meta Ads
    const { data: metaAds } = await supabase
      .from("brand_ads")
      .select("*")
      .eq("space_id", spaceId)
      .eq("age", "").eq("gender", "").eq("publisher_platform", "unknown");
    
    for (const a of metaAds || []) {
      const parentAdSet = metaAdSets?.find(as => as.id === a.brand_ad_set_id);
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_ad",
        entity_id: a.ad_id,
        entity_name: a.ad_name,
        parent_entity_id: parentAdSet?.adset_id || null,
        snapshot_date: today,
        metrics: extractMetrics(a as Record<string, unknown>, METRIC_KEYS_META),
      });
    }

    // TikTok Campaigns
    const { data: tiktokCampaigns } = await supabase
      .from("tiktok_campaigns")
      .select("*")
      .eq("space_id", spaceId)
      .eq("age", "").eq("gender", "").eq("location", "");
    
    for (const c of tiktokCampaigns || []) {
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "tiktok_campaign",
        entity_id: c.campaign_id,
        entity_name: c.campaign_name,
        parent_entity_id: null,
        snapshot_date: today,
        metrics: extractMetrics(c as Record<string, unknown>, METRIC_KEYS_TIKTOK),
      });
    }

    // TikTok Ad Groups
    const { data: tiktokAdGroups } = await supabase
      .from("tiktok_ad_groups")
      .select("*")
      .eq("space_id", spaceId);
    
    for (const ag of tiktokAdGroups || []) {
      const parentCampaign = tiktokCampaigns?.find(c => c.id === ag.tiktok_campaign_id);
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "tiktok_ad_group",
        entity_id: ag.adgroup_id,
        entity_name: ag.adgroup_name,
        parent_entity_id: parentCampaign?.campaign_id || null,
        snapshot_date: today,
        metrics: extractMetrics(ag as Record<string, unknown>, METRIC_KEYS_TIKTOK),
      });
    }

    // TikTok Ads
    const { data: tiktokAds } = await supabase
      .from("tiktok_ads")
      .select("*")
      .eq("space_id", spaceId);
    
    for (const a of tiktokAds || []) {
      const parentAdGroup = tiktokAdGroups?.find(ag => ag.id === a.tiktok_ad_group_id);
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "tiktok_ad",
        entity_id: a.ad_id,
        entity_name: a.ad_name,
        parent_entity_id: parentAdGroup?.adgroup_id || null,
        snapshot_date: today,
        metrics: extractMetrics(a as Record<string, unknown>, METRIC_KEYS_TIKTOK),
      });
    }

    // Upsert snapshots in batches of 100
    for (let i = 0; i < snapshotRows.length; i += 100) {
      const batch = snapshotRows.slice(i, i + 100);
      const { error: snapErr } = await supabase
        .from("ads_metric_snapshots")
        .upsert(batch, { onConflict: "space_id,entity_type,entity_id,snapshot_date" });
      
      if (snapErr) {
        console.error(`Snapshot batch ${i / 100 + 1} error:`, snapErr);
      } else {
        snapshotCount += batch.length;
      }
    }

    console.log(`Created ${snapshotCount} snapshots for space ${spaceId} on ${today}`);

    return new Response(
      JSON.stringify({
        success: true,
        snapshot_date: today,
        snapshots_created: snapshotCount,
        sync_results: syncResults,
        breakdown: {
          meta_campaigns: metaCampaigns?.length || 0,
          meta_ad_sets: metaAdSets?.length || 0,
          meta_ads: metaAds?.length || 0,
          tiktok_campaigns: tiktokCampaigns?.length || 0,
          tiktok_ad_groups: tiktokAdGroups?.length || 0,
          tiktok_ads: tiktokAds?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync and snapshot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
