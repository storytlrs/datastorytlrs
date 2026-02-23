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

    // Step 1: Sync data from APIs (fire-and-forget, unless skipSync is true)
    if (!skipSync) {
      // Fire Meta sync (don't await)
      try {
        console.log(`Triggering Meta sync for space ${spaceId}...`);
        fetch(`${supabaseUrl}/functions/v1/import-brand-meta-data`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spaceId }),
        }).then(r => r.json()).then(res => {
          console.log("Meta sync completed:", JSON.stringify(res).substring(0, 300));
        }).catch(e => {
          console.error("Meta sync failed:", e);
        });
        syncResults.meta = { status: "triggered" };
      } catch (e) {
        console.error("Meta sync trigger failed:", e);
        syncResults.meta = { error: e instanceof Error ? e.message : "Unknown error" };
      }

      // Fire TikTok sync (don't await)
      try {
        console.log(`Triggering TikTok sync for space ${spaceId}...`);
        fetch(`${supabaseUrl}/functions/v1/import-tiktok-ads`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spaceId }),
        }).then(r => r.json()).then(res => {
          console.log("TikTok sync completed:", JSON.stringify(res).substring(0, 300));
        }).catch(e => {
          console.error("TikTok sync failed:", e);
        });
        syncResults.tiktok = { status: "triggered" };
      } catch (e) {
        console.error("TikTok sync trigger failed:", e);
        syncResults.tiktok = { error: e instanceof Error ? e.message : "Unknown error" };
      }
    }

    // Step 2: Take snapshots of current state using SQL aggregation
    // This sums metrics across all breakdown rows (platform, age, gender) per entity
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

    // Meta Campaigns – aggregate across platform breakdowns (age="" gender="" rows)
    // These rows have publisher_platform like "facebook", "instagram" etc.
    const { data: metaCampaigns } = await supabase
      .from("brand_campaigns")
      .select("campaign_id, campaign_name, amount_spent, reach, impressions, frequency, cpm, cpc, ctr, clicks, date_start, date_stop")
      .eq("space_id", spaceId)
      .eq("age", "")
      .eq("gender", "");

    // Deduplicate by campaign_id – sum metrics across platform breakdowns
    const metaCampaignMap = new Map<string, { name: string | null; metrics: Record<string, number> }>();
    for (const c of metaCampaigns || []) {
      const existing = metaCampaignMap.get(c.campaign_id);
      const rowMetrics = extractMetrics(c as Record<string, unknown>, METRIC_KEYS_META);
      if (!existing) {
        metaCampaignMap.set(c.campaign_id, { name: c.campaign_name, metrics: rowMetrics });
      } else {
        // Sum numeric metrics
        for (const key of METRIC_KEYS_META) {
          if (rowMetrics[key] !== undefined) {
            existing.metrics[key] = (existing.metrics[key] || 0) + rowMetrics[key];
          }
        }
      }
    }

    for (const [campaignId, data] of metaCampaignMap) {
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_campaign",
        entity_id: campaignId,
        entity_name: data.name,
        parent_entity_id: null,
        snapshot_date: today,
        metrics: data.metrics,
      });
    }

    // Meta Ad Sets – aggregate across breakdowns
    const { data: metaAdSets } = await supabase
      .from("brand_ad_sets")
      .select("adset_id, adset_name, brand_campaign_id, amount_spent, reach, impressions, frequency, cpm, cpc, ctr, clicks, thruplays, thruplay_rate, cost_per_thruplay, video_3s_plays, view_rate_3s, cost_per_3s_play, engagement_rate, cpe, date_start, date_stop")
      .eq("space_id", spaceId)
      .eq("age", "")
      .eq("gender", "");

    // Get campaign mapping for parent_entity_id
    const { data: campaignIdMap } = await supabase
      .from("brand_campaigns")
      .select("id, campaign_id")
      .eq("space_id", spaceId);
    const dbIdToCampaignId = new Map((campaignIdMap || []).map(c => [c.id, c.campaign_id]));

    const metaAdSetMap = new Map<string, { name: string | null; parentCampaignId: string | null; metrics: Record<string, number> }>();
    for (const as of metaAdSets || []) {
      const existing = metaAdSetMap.get(as.adset_id);
      const rowMetrics = extractMetrics(as as Record<string, unknown>, METRIC_KEYS_META);
      if (!existing) {
        metaAdSetMap.set(as.adset_id, {
          name: as.adset_name,
          parentCampaignId: dbIdToCampaignId.get(as.brand_campaign_id) || null,
          metrics: rowMetrics,
        });
      } else {
        for (const key of METRIC_KEYS_META) {
          if (rowMetrics[key] !== undefined) {
            existing.metrics[key] = (existing.metrics[key] || 0) + rowMetrics[key];
          }
        }
      }
    }

    for (const [adsetId, data] of metaAdSetMap) {
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_ad_set",
        entity_id: adsetId,
        entity_name: data.name,
        parent_entity_id: data.parentCampaignId,
        snapshot_date: today,
        metrics: data.metrics,
      });
    }

    // Meta Ads – aggregate across breakdowns
    const { data: metaAds } = await supabase
      .from("brand_ads")
      .select("ad_id, ad_name, brand_ad_set_id, amount_spent, reach, impressions, frequency, cpm, cpc, ctr, clicks, thruplays, thruplay_rate, cost_per_thruplay, video_3s_plays, view_rate_3s, cost_per_3s_play, engagement_rate, cpe, post_reactions, post_comments, post_shares, post_saves, link_clicks, date_start, date_stop")
      .eq("space_id", spaceId)
      .eq("age", "")
      .eq("gender", "");

    // Get adset mapping
    const { data: adsetIdMap } = await supabase
      .from("brand_ad_sets")
      .select("id, adset_id")
      .eq("space_id", spaceId);
    const dbIdToAdsetId = new Map((adsetIdMap || []).map(a => [a.id, a.adset_id]));

    const metaAdMap = new Map<string, { name: string | null; parentAdsetId: string | null; metrics: Record<string, number> }>();
    for (const a of metaAds || []) {
      const existing = metaAdMap.get(a.ad_id);
      const rowMetrics = extractMetrics(a as Record<string, unknown>, METRIC_KEYS_META);
      if (!existing) {
        metaAdMap.set(a.ad_id, {
          name: a.ad_name,
          parentAdsetId: dbIdToAdsetId.get(a.brand_ad_set_id) || null,
          metrics: rowMetrics,
        });
      } else {
        for (const key of METRIC_KEYS_META) {
          if (rowMetrics[key] !== undefined) {
            existing.metrics[key] = (existing.metrics[key] || 0) + rowMetrics[key];
          }
        }
      }
    }

    for (const [adId, data] of metaAdMap) {
      snapshotRows.push({
        space_id: spaceId,
        entity_type: "meta_ad",
        entity_id: adId,
        entity_name: data.name,
        parent_entity_id: data.parentAdsetId,
        snapshot_date: today,
        metrics: data.metrics,
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
