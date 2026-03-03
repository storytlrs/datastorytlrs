import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CampaignContext {
  mainGoal: string;
  actions: string;
  highlights: string;
}

// ── Thumbnail persistence utility ──
// Downloads CDN thumbnails (TikTok, Meta) and uploads to Supabase Storage
// to prevent expiring signed URLs from breaking report previews.
async function persistThumbnails(
  supabase: any,
  reportId: string,
  postArrays: { key: string; posts: any[] }[]
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  for (const { key, posts } of postArrays) {
    if (!posts || posts.length === 0) continue;

    await Promise.all(
      posts.map(async (post: any, index: number) => {
        const url = post.thumbnail_url;
        if (!url || typeof url !== "string") return;

        // Skip if already a Supabase Storage URL
        if (url.includes("supabase") && url.includes("content-thumbnails")) return;

        try {
          // Fetch image via proxy to bypass CORS/hotlink protection
          const proxyUrl = `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          const imgResponse = await fetch(proxyUrl, {
            headers: {
              Authorization: `Bearer ${serviceKey}`,
            },
          });

          if (!imgResponse.ok) {
            console.warn(`Failed to proxy thumbnail for ${key}[${index}]: ${imgResponse.status}`);
            return;
          }

          const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          const imageData = await imgResponse.arrayBuffer();

          // Upload to storage
          const storagePath = `reports/${reportId}/${key}_${index}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("content-thumbnails")
            .upload(storagePath, imageData, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.warn(`Failed to upload thumbnail ${storagePath}:`, uploadError.message);
            return;
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("content-thumbnails")
            .getPublicUrl(storagePath);

          if (publicUrlData?.publicUrl) {
            post.thumbnail_url = publicUrlData.publicUrl;
            console.log(`Persisted thumbnail: ${storagePath}`);
          }
        } catch (err) {
          console.warn(`Error persisting thumbnail for ${key}[${index}]:`, err);
        }
      })
    );
  }
}

// ── Media Plan context builder ──
function formatMediaPlanContext(mediaPlanItems: any[]): string {
  if (!mediaPlanItems || mediaPlanItems.length === 0) return "";

  const totalPlannedBudget = mediaPlanItems.reduce((s: number, i: any) => s + (i.budget || 0), 0);
  const totalPlannedImpressions = mediaPlanItems.reduce((s: number, i: any) => s + (i.impressions || 0), 0);
  const totalPlannedReach = mediaPlanItems.reduce((s: number, i: any) => s + (i.reach || 0), 0);

  const itemLines = mediaPlanItems.map((item: any) => {
    const parts: string[] = [];
    if (item.type) parts.push(`Type: ${item.type}`);
    if (item.platform) parts.push(`Platform: ${item.platform}`);
    if (item.target_group) parts.push(`Target: ${item.target_group}`);
    if (item.placements) parts.push(`Placements: ${item.placements}`);
    if (item.media_buying_type) parts.push(`Buying: ${item.media_buying_type}`);
    if (item.creatives) parts.push(`Creatives: ${item.creatives}`);
    if (item.impressions) parts.push(`Impressions: ${item.impressions.toLocaleString()}`);
    if (item.reach) parts.push(`Reach: ${item.reach.toLocaleString()}`);
    if (item.frequency) parts.push(`Frequency: ${item.frequency}`);
    if (item.cpm) parts.push(`CPM: ${item.cpm}`);
    if (item.budget) parts.push(`Budget: ${item.budget}`);
    return `  - ${parts.join(", ")}`;
  }).join("\n");

  return `

MEDIA PLÁN (plánované hodnoty):
- Celkový plánovaný budget: ${totalPlannedBudget.toLocaleString()} CZK
- Celkové plánované impressions: ${totalPlannedImpressions.toLocaleString()}
- Celkový plánovaný reach: ${totalPlannedReach.toLocaleString()}
- Počet položek: ${mediaPlanItems.length}
Položky:
${itemLines}

INSTRUKCE PRO MEDIA PLÁN: Porovnej plánované hodnoty z media plánu s reálnými výsledky kampaní. Identifikuj odchylky, vyhodnoť plnění plánu a zahrň toto srovnání do analýzy.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report_id, campaign_context } = (await req.json()) as {
      report_id: string;
      campaign_context: CampaignContext;
    };

    console.log("Generating Ads AI insights for report:", report_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch report with space info
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, spaces(name)")
      .eq("id", report_id)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    const spaceId = report.space_id;
    const period = report.period || "campaign";

    // Fetch linked campaign IDs for this report (Meta)
    const { data: links } = await supabase
      .from("report_campaigns")
      .select("brand_campaign_id")
      .eq("report_id", report_id);

    const linkedCampaignIds = (links || []).map((l: any) => l.brand_campaign_id);

    // Fetch linked TikTok campaign IDs for this report
    const { data: tiktokLinks } = await supabase
      .from("report_tiktok_campaigns")
      .select("tiktok_campaign_id")
      .eq("report_id", report_id);

    const linkedTiktokCampaignIds = (tiktokLinks || []).map((l: any) => l.tiktok_campaign_id);

    if (linkedCampaignIds.length === 0 && linkedTiktokCampaignIds.length === 0) {
      throw new Error("No campaigns linked to this report. Please select campaigns first.");
    }

    // Fetch only linked Meta campaigns (aggregate rows)
    const { data: campaignsAgg = [] } = linkedCampaignIds.length > 0
      ? await supabase.from("brand_campaigns").select("*").in("id", linkedCampaignIds)
      : { data: [] };

    // Also fetch all demographic breakdown rows for the same campaign_ids
    const linkedCampaignTextIds = (campaignsAgg || []).map((c: any) => c.campaign_id);
    const { data: campaignsDemoRows = [] } = linkedCampaignTextIds.length > 0
      ? await supabase.from("brand_campaigns").select("*").eq("space_id", spaceId).in("campaign_id", linkedCampaignTextIds).neq("age", "").neq("gender", "")
      : { data: [] };

    // Merge: aggregate rows + demographic breakdown rows
    const campaigns = [...(campaignsAgg || []), ...(campaignsDemoRows || [])];

    // Fetch ad sets belonging to linked Meta campaigns
    const { data: adSets = [] } = linkedCampaignIds.length > 0
      ? await supabase.from("brand_ad_sets").select("*").eq("space_id", spaceId).in("brand_campaign_id", linkedCampaignIds)
      : { data: [] };

    const adSetIds = (adSets || []).map((as: any) => as.id);

    // Fetch Meta ads belonging to those ad sets
    const { data: ads = [] } = adSetIds.length > 0
      ? await supabase.from("brand_ads").select("*").eq("space_id", spaceId).in("brand_ad_set_id", adSetIds)
      : { data: [] };

    // Fetch linked TikTok campaigns (aggregate rows)
    const { data: tiktokCampaignsAgg = [] } = linkedTiktokCampaignIds.length > 0
      ? await supabase.from("tiktok_campaigns").select("*").in("id", linkedTiktokCampaignIds)
      : { data: [] };

    // Also fetch TikTok demographic breakdown rows
    const linkedTiktokTextIds = (tiktokCampaignsAgg || []).map((c: any) => c.campaign_id);
    const { data: tiktokCampaignsDemoRows = [] } = linkedTiktokTextIds.length > 0
      ? await supabase.from("tiktok_campaigns").select("*").eq("space_id", spaceId).in("campaign_id", linkedTiktokTextIds).or("age.neq.,gender.neq.,location.neq.")
      : { data: [] };

    // Merge
    const tiktokCampaigns = [...(tiktokCampaignsAgg || []), ...(tiktokCampaignsDemoRows || [])];

    // Fetch TikTok ad groups
    const { data: tiktokAdGroups = [] } = linkedTiktokCampaignIds.length > 0
      ? await supabase.from("tiktok_ad_groups").select("*").eq("space_id", spaceId).in("tiktok_campaign_id", linkedTiktokCampaignIds)
      : { data: [] };

    const tiktokAdGroupIds = (tiktokAdGroups || []).map((ag: any) => ag.id);

    // Fetch TikTok ads
    const { data: tiktokAds = [] } = tiktokAdGroupIds.length > 0
      ? await supabase.from("tiktok_ads").select("*").eq("space_id", spaceId).in("tiktok_ad_group_id", tiktokAdGroupIds)
      : { data: [] };

    // Fetch media plan items for this report
    const { data: mediaPlanItems = [] } = await supabase
      .from("media_plan_items")
      .select("*")
      .eq("report_id", report_id);

    // Calculate aggregated metrics from both platforms (only aggregate rows, not demographic breakdowns)
    const metaCampaignsAgg = (campaigns || []).filter((c: any) => !c.age && !c.gender);
    const tiktokCampaignsAgg2 = (tiktokCampaigns || []).filter((c: any) => !c.age && !c.gender && !c.location);
    const allCampaignsAgg = [...metaCampaignsAgg, ...tiktokCampaignsAgg2];
    const metricsSource = allCampaignsAgg.length > 0 ? allCampaignsAgg : [...(adSets || []), ...(tiktokAdGroups || [])];
    const totalSpend = metricsSource.reduce((s: number, d: any) => s + (d.amount_spent || 0), 0);
    const totalReach = metricsSource.reduce((s: number, d: any) => s + (d.reach || 0), 0);
    const totalImpressions = metricsSource.reduce((s: number, d: any) => s + (d.impressions || 0), 0);
    const totalClicks = metricsSource.reduce((s: number, d: any) => s + (d.clicks || 0), 0);

    const allAds = [...(ads || []), ...(tiktokAds || [])];
    const allAdSets = [...(adSets || []), ...(tiktokAdGroups || [])];
    const detailSource = allAds.length > 0 ? allAds : allAdSets;
    const totalThruplays = detailSource.reduce((s: number, d: any) => s + (d.thruplays || d.video_views_p100 || 0), 0);
    const total3sViews = detailSource.reduce((s: number, d: any) => s + (d.video_3s_plays || d.video_watched_2s || 0), 0);
    const totalReactions = detailSource.reduce((s: number, d: any) => s + (d.post_reactions || d.likes || 0), 0);
    const totalComments = detailSource.reduce((s: number, d: any) => s + (d.post_comments || d.comments || 0), 0);
    const totalShares = detailSource.reduce((s: number, d: any) => s + (d.post_shares || d.shares || 0), 0);
    const totalSaves = detailSource.reduce((s: number, d: any) => s + (d.post_saves || 0), 0);
    const totalLinkClicks = detailSource.reduce((s: number, d: any) => s + (d.link_clicks || 0), 0);
    const totalInteractions = totalReactions + totalComments + totalShares + totalSaves;

    const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const engagementRate = totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0;
    const thruplayRate = totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0;
    const viewRate3s = totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const costPerThruplay = totalThruplays > 0 ? totalSpend / totalThruplays : 0;
    const costPer3sView = total3sViews > 0 ? totalSpend / total3sViews : 0;
    const cpe = totalInteractions > 0 ? totalSpend / totalInteractions : 0;

    const mediaPlanContext = formatMediaPlanContext(mediaPlanItems);

    // Route based on period
    if (period === "monthly") {
      return await handleMonthlyReport({
        supabase, report_id, campaign_context, lovableApiKey,
        campaigns, adSets, ads,
        tiktokCampaigns, tiktokAdGroups, tiktokAds,
        totalSpend, totalReach, totalImpressions, totalClicks,
        totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
        totalReactions, totalComments, totalShares, totalSaves,
        avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
        cpm, cpc, costPerThruplay, costPer3sView, cpe,
        mediaPlanContext,
      });
    }

    if (period === "quarterly") {
      return await handleQuarterlyReport({
        supabase, report_id, campaign_context, lovableApiKey,
        campaigns, adSets, ads,
        tiktokCampaigns, tiktokAdGroups, tiktokAds,
        totalSpend, totalReach, totalImpressions, totalClicks,
        totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
        totalReactions, totalComments, totalShares, totalSaves,
        avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
        cpm, cpc, costPerThruplay, costPer3sView, cpe,
        mediaPlanContext,
      });
    }

    if (period === "yearly") {
      return await handleYearlyReport({
        supabase, report_id, campaign_context, lovableApiKey,
        campaigns, adSets, ads,
        tiktokCampaigns, tiktokAdGroups, tiktokAds,
        totalSpend, totalReach, totalImpressions, totalClicks,
        totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
        totalReactions, totalComments, totalShares, totalSaves,
        avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
        cpm, cpc, costPerThruplay, costPer3sView, cpe,
        mediaPlanContext,
      });
    }

    if (period === "campaign") {
      return await handleCampaignReport({
        supabase, report_id, campaign_context, lovableApiKey,
        campaigns, adSets, ads,
        tiktokCampaigns, tiktokAdGroups, tiktokAds,
        totalSpend, totalReach, totalImpressions, totalClicks,
        totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
        totalReactions, totalComments, totalShares, totalSaves,
        avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
        cpm, cpc, costPerThruplay, costPer3sView, cpe,
        mediaPlanContext,
      });
    }

    // Default: fallback to original logic
    return await handleDefaultReport({
      supabase, report_id, campaign_context, lovableApiKey,
      campaigns, adSets, ads,
      tiktokCampaigns, tiktokAdGroups, tiktokAds,
      totalSpend, totalReach, totalImpressions, totalClicks,
      totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
      totalReactions, totalComments, totalShares, totalSaves,
      avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
      cpm, cpc, costPerThruplay, costPer3sView, cpe,
      mediaPlanContext,
    });
  } catch (error) {
    console.error("Error generating Ads AI insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Monthly Report Handler ──
async function handleMonthlyReport(ctx: any) {
  const {
    supabase, report_id, campaign_context, lovableApiKey,
    campaigns, adSets, ads,
    totalSpend, totalReach, totalImpressions, totalClicks,
    totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
    totalReactions, totalComments, totalShares, totalSaves,
    avgFrequency, ctr, engagementRate, cpm, cpc, cpe,
  } = ctx;

  // Try to separate ads by platform (ad_name contains platform hints)
  const fbAds = ads.filter((a: any) => {
    const name = (a.ad_name || "").toLowerCase();
    return name.includes("facebook") || name.includes("fb");
  });
  const igAds = ads.filter((a: any) => {
    const name = (a.ad_name || "").toLowerCase();
    return name.includes("instagram") || name.includes("ig");
  });

  // Normalize TikTok ads for monthly report
  const normalizedTiktokAds = (ctx.tiktokAds || []).map((a: any) => ({
    ad_name: a.ad_name || "Unnamed",
    amount_spent: a.amount_spent || 0,
    reach: a.reach || 0,
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    ctr: a.ctr || 0,
    thruplays: a.video_views_p100 || 0,
    video_3s_plays: a.video_watched_2s || 0,
    thumbnail_url: a.thumbnail_url || null,
    average_video_play: a.average_video_play || 0,
  }));

  const calcPlatformMetrics = (platformAds: any[]) => {
    const spend = platformAds.reduce((s: number, a: any) => s + (a.amount_spent || 0), 0);
    const reach = platformAds.reduce((s: number, a: any) => s + (a.reach || 0), 0);
    const impr = platformAds.reduce((s: number, a: any) => s + (a.impressions || 0), 0);
    return { spend, reach, frequency: reach > 0 ? impr / reach : 0 };
  };

  const fbMetrics = calcPlatformMetrics(fbAds);
  const igMetrics = calcPlatformMetrics(igAds);

  // TikTok platform metrics from campaign-level data
  const tkCampaigns = ctx.tiktokCampaigns || [];
  const tkSpend = tkCampaigns.reduce((s: number, c: any) => s + (c.amount_spent || 0), 0);
  const tkReach = tkCampaigns.reduce((s: number, c: any) => s + (c.reach || 0), 0);
  const tkImpr = tkCampaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const tkFreq = tkReach > 0 ? tkImpr / tkReach : 0;
  const tiktokMetrics = { spend: tkSpend, reach: tkReach, frequency: tkFreq };

  const topBySpend = (arr: any[], count: number) =>
    [...arr].sort((a, b) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, count).map((a: any, i: number) => ({
      name: a.ad_name || "Unnamed",
      spend: a.amount_spent || 0,
      impressions: a.impressions || 0,
      clicks: a.clicks || 0,
      ctr: a.ctr || 0,
      thumbnail_url: a.thumbnail_url || null,
      reason: (() => {
        const parts: string[] = [];
        if (i < 3) parts.push(`#${i + 1} nejvyšší spend`);
        if ((a.ctr || 0) > 1) parts.push(`silné CTR ${(a.ctr || 0).toFixed(2)}%`);
        if ((a.impressions || 0) > 10000) parts.push(`${((a.impressions || 0) / 1000).toFixed(0)}K impressions`);
        return parts.length > 0 ? parts.join(", ") : "Vysoký spend a dobrý výkon";
      })(),
    }));

  const fbTopPosts = topBySpend(fbAds, 5);
  const igTopPosts = topBySpend(igAds, 5);
  const tiktokTopPosts = topBySpend(normalizedTiktokAds, 5);

  const campaignSummary = campaigns
    .map((cm: any) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`)
    .join("\n");

  // Build detailed per-ad breakdown for AI context
  const fbAdsDetail = fbAds.map((a: any) => 
    `  - ${a.ad_name || "Unnamed"}: Spend ${(a.amount_spent || 0).toFixed(0)}, Reach ${a.reach || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%, Reactions ${a.post_reactions || 0}, Comments ${a.post_comments || 0}, Shares ${a.post_shares || 0}, Saves ${a.post_saves || 0}, ThruPlays ${a.thruplays || 0}, 3s Views ${a.video_3s_plays || 0}`
  ).join("\n");

  const igAdsDetail = igAds.map((a: any) =>
    `  - ${a.ad_name || "Unnamed"}: Spend ${(a.amount_spent || 0).toFixed(0)}, Reach ${a.reach || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%, Reactions ${a.post_reactions || 0}, Comments ${a.post_comments || 0}, Shares ${a.post_shares || 0}, Saves ${a.post_saves || 0}, ThruPlays ${a.thruplays || 0}, 3s Views ${a.video_3s_plays || 0}`
  ).join("\n");

  // Fetch prompts from DB (fallback to hardcoded)
  const { data: prompts } = await supabase
    .from("ai_prompts")
    .select("key, prompt_text")
    .in("key", ["monthly_ads_system", "monthly_ads_user"]);

  const promptMap: Record<string, string> = {};
  for (const p of prompts || []) {
    promptMap[p.key] = p.prompt_text;
  }

  const dataContext = `
CELKOVÁ DATA KAMPANĚ:
- Celkový spend: ${totalSpend.toFixed(2)} CZK
- Celkový reach: ${totalReach.toLocaleString()}
- Celkové impressions: ${totalImpressions.toLocaleString()}
- Průměrná frekvence: ${avgFrequency.toFixed(2)}
- ThruPlays: ${totalThruplays.toLocaleString()}
- 3s Video Views: ${total3sViews.toLocaleString()}
- Link Clicks: ${totalLinkClicks.toLocaleString()}
- Celkové interakce: ${totalInteractions.toLocaleString()} (Reactions: ${totalReactions}, Comments: ${totalComments}, Shares: ${totalShares}, Saves: ${totalSaves})
- CTR: ${ctr.toFixed(2)}%
- Engagement Rate: ${engagementRate.toFixed(2)}%
- CPM: ${cpm.toFixed(2)} CZK
- CPC: ${cpc.toFixed(2)} CZK
- CPE: ${cpe.toFixed(2)} CZK
- Počet kampaní: ${campaigns.length}, Ad setů: ${adSets.length}, Reklam: ${ads.length}

KAMPANĚ:
${campaignSummary}

FACEBOOK DATA (${fbAds.length} reklam):
- Spend: ${fbMetrics.spend.toFixed(2)} CZK, Reach: ${fbMetrics.reach.toLocaleString()}, Frequency: ${fbMetrics.frequency.toFixed(2)}
Jednotlivé reklamy:
${fbAdsDetail || "  Žádné FB reklamy"}

INSTAGRAM DATA (${igAds.length} reklam):
- Spend: ${igMetrics.spend.toFixed(2)} CZK, Reach: ${igMetrics.reach.toLocaleString()}, Frequency: ${igMetrics.frequency.toFixed(2)}
Jednotlivé reklamy:
${igAdsDetail || "  Žádné IG reklamy"}

TIKTOK DATA (${normalizedTiktokAds.length} reklam):
- Spend: ${tiktokMetrics.spend.toFixed(2)} CZK, Reach: ${tiktokMetrics.reach.toLocaleString()}, Frequency: ${tiktokMetrics.frequency.toFixed(2)}
Jednotlivé reklamy:
${normalizedTiktokAds.map((a: any) => `  - ${a.ad_name}: Spend ${(a.amount_spent || 0).toFixed(0)}, Reach ${a.reach || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") || "  Žádné TikTok reklamy"}

KONTEXT OD UŽIVATELE:
- Hlavní cíl kampaně: ${campaign_context.mainGoal}
- Co bylo realizováno: ${campaign_context.actions}
- Co se povedlo / highlight: ${campaign_context.highlights}`;

  const defaultSystemPrompt = `Jsi zkušený analytik digitálního marketingu. Tvým úkolem je vytvořit kompletní měsíční report výkonu reklamních kampaní v češtině. Report musí být profesionální, datově podložený a obsahovat konkrétní čísla.

INSTRUKCE:
1. Executive Summary: Stručný ale výstižný souhrn celého měsíce – klíčové výsledky, spend, reach, co se povedlo.
2. Plnění cílů: Porovnej cíle uživatele (mainGoal) s reálnými daty. Splnilo se to? Jak moc? Buď konkrétní s čísly.
3. Vývoj metrik v čase: Na základě dostupných dat popiš trendy a vývoj – které metriky rostly, které klesaly, co je stabilní. Zmiň konkrétní hodnoty.
4. Vliv na brand awareness: Analyzuj dopad na povědomí o značce – reach, frequency, impressions, ThruPlays. Jaký je celkový dopad?
5. Learnings: Rozděl do 3 kategorií – co se povedlo (works), hrozby a příležitosti (threats_opportunities), co zlepšit (improvements). Buď konkrétní a akční.`;

  const defaultUserPrompt = `Vytvoř kompletní měsíční analytický report. Odpověz POUZE validním JSON objektem s touto přesnou strukturou:

{
  "executive_summary": "Kompletní souhrn měsíce s konkrétními čísly – spend, reach, klíčové výsledky, celkové zhodnocení efektivity (max 200 slov)",
  "goal_fulfillment": "Detailní porovnání stanovených cílů s dosaženými výsledky. Použij konkrétní data a procenta. Zhodnoť míru splnění (max 150 slov)",
  "metrics_over_time": "Popis vývoje a trendů klíčových metrik (spend, reach, frequency, CTR, engagement) během měsíce. Zmiň co rostlo, co klesalo, co bylo stabilní (max 150 slov)",
  "brand_awareness": "Analýza vlivu kampaní na brand awareness – kolik lidí bylo osloveno, jak často, jaký je dopad na povědomí o značce. Porovnej FB vs IG pokud jsou data (max 150 slov)",
  "learnings": {
    "works": ["2-3 konkrétní body co funguje dobře, s čísly kde to dává smysl"],
    "threats_opportunities": ["2-3 body – identifikuj hrozby a příležitosti"],
    "improvements": ["2-3 akční doporučení co konkrétně zlepšit v dalším měsíci"]
  }
}`;

  const systemPrompt = (promptMap["monthly_ads_system"] || defaultSystemPrompt) + "\n" + dataContext + (ctx.mediaPlanContext || "");
  const userPrompt = promptMap["monthly_ads_user"] || defaultUserPrompt;

  console.log("Calling AI for monthly Ads insights...");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errorText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const aiContent = JSON.parse(aiData.choices[0].message.content);

  // Persist thumbnails to permanent storage before building insights
  await persistThumbnails(supabase, report_id, [
    { key: "facebook_top_posts", posts: fbTopPosts },
    { key: "instagram_top_posts", posts: igTopPosts },
    { key: "tiktok_top_posts", posts: tiktokTopPosts },
  ]);

  const structuredInsights = {
    report_period: "monthly",
    executive_summary: aiContent.executive_summary,
    campaign_context,
    goal_fulfillment: aiContent.goal_fulfillment,
    key_metrics: {
      spend: totalSpend,
      reach: totalReach,
      frequency: avgFrequency,
      currency: "CZK",
    },
    metrics_over_time: aiContent.metrics_over_time,
    community_management: {
      answered_comments: null,
      answered_dms: null,
      response_rate_24h: null,
    },
    brand_awareness: aiContent.brand_awareness,
    facebook_metrics: fbMetrics,
    facebook_top_posts: fbTopPosts,
    instagram_metrics: igMetrics,
    instagram_top_posts: igTopPosts,
    tiktok_metrics: tiktokMetrics,
    tiktok_top_posts: tiktokTopPosts,
    followers: { facebook: null, instagram: null, tiktok: null },
    learnings: aiContent.learnings,
  };

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ai_insights: aiContent.executive_summary,
      ai_insights_structured: structuredInsights,
      ai_insights_context: campaign_context,
    })
    .eq("id", report_id);

  if (updateError) {
    console.error("Error saving insights:", updateError);
    throw new Error("Failed to save insights");
  }

  console.log("Monthly insights saved successfully");

  return new Response(
    JSON.stringify({ structured_data: structuredInsights }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Default (Campaign/Quarterly/Yearly) Report Handler ──
async function handleDefaultReport(ctx: any) {
  const {
    supabase, report_id, campaign_context, lovableApiKey,
    campaigns, adSets, ads,
    totalSpend, totalReach, totalImpressions, totalClicks,
    totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
    totalReactions, totalComments, totalShares, totalSaves,
    avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
    cpm, cpc, costPerThruplay, costPer3sView, cpe,
  } = ctx;

  const topAdSets = [...adSets]
    .sort((a: any, b: any) => (b.amount_spent || 0) - (a.amount_spent || 0))
    .slice(0, 5)
    .map((as: any) => ({
      name: as.adset_name || "Unnamed",
      spend: as.amount_spent || 0,
      impressions: as.impressions || 0,
      clicks: as.clicks || 0,
      ctr: as.ctr || 0,
    }));

  const campaignSummary = campaigns
    .map((cm: any) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`)
    .join("\n");

  const systemPrompt = `Jsi analytik digitálního marketingu specializující se na reklamní kampaně (Meta Ads, Facebook Ads, Instagram Ads). Na základě dat z kampaně a kontextu od uživatele vytvoř strukturovaný report v češtině.

Piš profesionálně, ale přístupně. Zaměř se na výkonnost reklam, efektivitu vynaložených prostředků a doporučení pro optimalizaci.

Data kampaně:
- Celkový spend: ${totalSpend.toFixed(2)} CZK
- Reach: ${totalReach}
- Impressions: ${totalImpressions}
- ThruPlays: ${totalThruplays}
- 3s Video Views: ${total3sViews}
- Link Clicks: ${totalLinkClicks}
- Interactions: ${totalInteractions} (Reactions: ${totalReactions}, Comments: ${totalComments}, Shares: ${totalShares}, Saves: ${totalSaves})
- Frequency: ${avgFrequency.toFixed(2)}
- CTR: ${ctr.toFixed(2)}%
- Engagement Rate: ${engagementRate.toFixed(2)}%
- ThruPlay Rate: ${thruplayRate.toFixed(2)}%
- View Rate (3s): ${viewRate3s.toFixed(2)}%
- CPM: ${cpm.toFixed(2)} CZK
- CPC: ${cpc.toFixed(2)} CZK
- Cost per ThruPlay: ${costPerThruplay.toFixed(2)} CZK
- CPE: ${cpe.toFixed(2)} CZK
- Počet kampaní: ${campaigns.length}
- Počet ad setů: ${adSets.length}
- Počet reklam: ${ads.length}

Kampaně:
${campaignSummary}

Top 5 Ad Sets:
${topAdSets.map((a: any) => `${a.name}: Spend ${a.spend}, Impr ${a.impressions}, Clicks ${a.clicks}, CTR ${a.ctr}%`).join("\n")}

Kontext od uživatele:
- Hlavní cíl: ${campaign_context.mainGoal}
- Co udělali: ${campaign_context.actions}
- Co se povedlo: ${campaign_context.highlights}
${ctx.mediaPlanContext || ""}`;

  const userPrompt = `Vytvoř analytický obsah pro Ads Campaign report. Odpověz ve formátu JSON s následující strukturou:

{
  "executive_summary": "Jeden odstavec shrnující zásadní informace o kampani (max 150 slov)",
  "awareness_summary": "Jeden odstavec hodnotící výsledky z pohledu dosahu a povědomí (max 100 slov)",
  "engagement_summary": "Jeden odstavec hodnotící zapojení a interakce uživatelů (max 100 slov)",
  "effectiveness_summary": "Jeden odstavec hodnotící nákladovou efektivitu kampaně (max 100 slov)",
  "recommendations": {
    "works": ["2-3 body co funguje dobře"],
    "doesnt_work": ["2-3 body co nefunguje nebo má prostor ke zlepšení"],
    "suggestions": ["2-3 konkrétní doporučení pro optimalizaci"]
  }
}`;

  console.log("Calling Lovable AI for Ads insights...");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errorText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const aiContent = JSON.parse(aiData.choices[0].message.content);

  console.log("Ads AI content generated successfully");

  const structuredInsights = {
    report_period: "default",
    executive_summary: aiContent.executive_summary,
    campaign_context,
    awareness_metrics: {
      reach: totalReach,
      impressions: totalImpressions,
      thruplays: totalThruplays,
      video3sPlays: total3sViews,
      frequency: avgFrequency,
    },
    engagement_metrics: {
      linkClicks: totalLinkClicks,
      interactions: totalInteractions,
      reactions: totalReactions,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      ctr,
      engagementRate,
      thruplayRate,
      viewRate3s,
    },
    effectiveness_metrics: {
      spend: totalSpend,
      cpm,
      cpc,
      costPerThruplay,
      costPer3sView,
      cpe,
      currency: "CZK",
    },
    top_ad_sets: topAdSets,
    campaign_count: campaigns.length,
    ad_set_count: adSets.length,
    ad_count: ads.length,
    awareness_summary: aiContent.awareness_summary,
    engagement_summary: aiContent.engagement_summary,
    effectiveness_summary: aiContent.effectiveness_summary,
    recommendations: aiContent.recommendations,
  };

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ai_insights: aiContent.executive_summary,
      ai_insights_structured: structuredInsights,
      ai_insights_context: campaign_context,
    })
    .eq("id", report_id);

  if (updateError) {
    console.error("Error saving insights:", updateError);
    throw new Error("Failed to save insights");
  }

  console.log("Ads insights saved successfully");

  return new Response(
    JSON.stringify({
      structured_data: structuredInsights,
      awareness_summary: aiContent.awareness_summary,
      engagement_summary: aiContent.engagement_summary,
      effectiveness_summary: aiContent.effectiveness_summary,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Campaign Report Handler ──
async function handleCampaignReport(ctx: any) {
  const {
    supabase, report_id, campaign_context, lovableApiKey,
    campaigns, adSets, ads,
    tiktokCampaigns, tiktokAdGroups, tiktokAds,
    totalSpend, totalReach, totalImpressions, totalClicks,
    totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
    totalReactions, totalComments, totalShares, totalSaves,
    avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
    cpm, cpc, costPerThruplay, costPer3sView, cpe,
  } = ctx;

  // Normalize TikTok ads
  const normalizedTiktokAds = (tiktokAds || []).map((a: any) => ({
    ad_name: a.ad_name || "Unnamed",
    amount_spent: a.amount_spent || 0,
    reach: a.reach || 0,
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    ctr: a.ctr || 0,
    thruplays: a.video_views_p100 || 0,
    video_3s_plays: a.video_watched_2s || 0,
    thumbnail_url: a.thumbnail_url || null,
    average_video_play: a.average_video_play || 0,
  }));

  // Meta platform metrics (only aggregate rows)
  const metaCampaignsOnly = (campaigns || []).filter((c: any) => !c.age && !c.gender);
  const metaSpend = metaCampaignsOnly.reduce((s: number, c: any) => s + (c.amount_spent || 0), 0);
  const metaReach = metaCampaignsOnly.reduce((s: number, c: any) => s + (c.reach || 0), 0);
  const metaImpr = metaCampaignsOnly.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const metaFreq = metaReach > 0 ? metaImpr / metaReach : 0;
  const metaThruplays = (ads || []).reduce((s: number, a: any) => s + (a.thruplays || 0), 0);
  const meta3sViews = (ads || []).reduce((s: number, a: any) => s + (a.video_3s_plays || 0), 0);
  const metaThruplayRate = metaImpr > 0 ? (metaThruplays / metaImpr) * 100 : 0;
  const metaViewRate3s = metaImpr > 0 ? (meta3sViews / metaImpr) * 100 : 0;
  const metaAvgWatchTime = 0;

  // TikTok platform metrics (only aggregate rows)
  const tiktokCampaignsOnly = (tiktokCampaigns || []).filter((c: any) => !c.age && !c.gender && !c.location);
  const tkSpend = tiktokCampaignsOnly.reduce((s: number, c: any) => s + (c.amount_spent || 0), 0);
  const tkReach = tiktokCampaignsOnly.reduce((s: number, c: any) => s + (c.reach || 0), 0);
  const tkImpr = tiktokCampaignsOnly.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const tkFreq = tkReach > 0 ? tkImpr / tkReach : 0;
  const tkThruplays = normalizedTiktokAds.reduce((s: number, a: any) => s + (a.thruplays || 0), 0);
  const tk3sViews = normalizedTiktokAds.reduce((s: number, a: any) => s + (a.video_3s_plays || 0), 0);
  const tkThruplayRate = tkImpr > 0 ? (tkThruplays / tkImpr) * 100 : 0;
  const tkViewRate3s = tkImpr > 0 ? (tk3sViews / tkImpr) * 100 : 0;
  const tkAvgWatchTime = normalizedTiktokAds.length > 0
    ? normalizedTiktokAds.reduce((s: number, a: any) => s + (a.average_video_play || 0), 0) / normalizedTiktokAds.length
    : 0;

  // TOP 5 content across all platforms
  const allAds = [...(ads || []), ...normalizedTiktokAds];
  const top5 = [...allAds].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 5).map((a: any, i: number) => ({
    name: a.ad_name || "Unnamed",
    spend: a.amount_spent || 0,
    impressions: a.impressions || 0,
    reach: a.reach || 0,
    clicks: a.clicks || 0,
    ctr: a.ctr || 0,
    thumbnail_url: a.thumbnail_url || null,
    reason: `#${i + 1} nejvyšší impressions (${((a.impressions || 0) / 1000).toFixed(0)}K)`,
  }));

  const campaignSummary = [
    ...(campaigns || []).map((cm: any) => `[Meta] ${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`),
    ...(tiktokCampaigns || []).map((cm: any) => `[TikTok] ${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`),
  ].join("\n");

  // Fetch prompts from DB
  const { data: prompts } = await supabase
    .from("ai_prompts")
    .select("key, prompt_text")
    .in("key", ["campaign_ads_system", "campaign_ads_user"]);

  const promptMap: Record<string, string> = {};
  for (const p of prompts || []) {
    promptMap[p.key] = p.prompt_text;
  }

  const dataContext = `
CELKOVÁ DATA KAMPANĚ:
- Celkový spend: ${totalSpend.toFixed(2)} CZK
- Celkový reach: ${totalReach.toLocaleString()}
- Celkové impressions: ${totalImpressions.toLocaleString()}
- Průměrná frekvence: ${avgFrequency.toFixed(2)}
- ThruPlays: ${totalThruplays.toLocaleString()}
- 3s Video Views: ${total3sViews.toLocaleString()}
- Link Clicks: ${totalLinkClicks.toLocaleString()}
- Celkové interakce: ${totalInteractions.toLocaleString()} (Reactions: ${totalReactions}, Comments: ${totalComments}, Shares: ${totalShares}, Saves: ${totalSaves})
- CTR: ${ctr.toFixed(2)}%, Engagement Rate: ${engagementRate.toFixed(2)}%
- ThruPlay Rate: ${thruplayRate.toFixed(2)}%, View Rate 3s: ${viewRate3s.toFixed(2)}%
- CPM: ${cpm.toFixed(2)} CZK, CPC: ${cpc.toFixed(2)} CZK, CPE: ${cpe.toFixed(2)} CZK

META PLATFORMA:
- Spend: ${metaSpend.toFixed(2)}, Reach: ${metaReach}, Frequency: ${metaFreq.toFixed(2)}
- ThruPlay Rate: ${metaThruplayRate.toFixed(2)}%, View Rate 3s: ${metaViewRate3s.toFixed(2)}%

TIKTOK PLATFORMA:
- Spend: ${tkSpend.toFixed(2)}, Reach: ${tkReach}, Frequency: ${tkFreq.toFixed(2)}
- ThruPlay Rate: ${tkThruplayRate.toFixed(2)}%, View Rate 3s: ${tkViewRate3s.toFixed(2)}%
- Avg Watch Time: ${tkAvgWatchTime.toFixed(1)}s

KAMPANĚ:
${campaignSummary}

KONTEXT OD UŽIVATELE:
- Hlavní cíl: ${campaign_context.mainGoal}
- Co bylo realizováno: ${campaign_context.actions}
- Co se povedlo: ${campaign_context.highlights}`;

  const defaultSystemPrompt = `Jsi zkušený analytik digitálního marketingu. Tvým úkolem je vytvořit kompletní vyhodnocení reklamní kampaně v češtině. Report musí být profesionální, datově podložený a obsahovat konkrétní čísla. Zaměř se na celkové zhodnocení kampaně, ponaučení a doporučení pro budoucí kampaně.`;

  const defaultUserPrompt = `Vytvoř kompletní vyhodnocení kampaně. Odpověz POUZE validním JSON objektem s touto přesnou strukturou:

{
  "executive_summary": {
    "intro": "Úvodní shrnutí kampaně v 2-3 větách – stručný přehled co se dělo, jaké byly výsledky a hlavní závěr",
    "media_insight": "Klíčový media poznatek z kampaně – 2-3 krátké věty",
    "top_result": "Nejlepší výsledek kampaně – 2-3 krátké věty",
    "recommendation": "Hlavní doporučení pro příští kampaň – 2-3 krátké věty"
  },
  "goal_fulfillment": {
    "goals_set": "Popis stanovených cílů kampaně (max 200 slov)",
    "results": "Vyhodnocení plnění cílů s čísly (max 200 slov)"
  },
  "metric_commentary": {
    "meta_key": "2-3 krátké věty hodnotící klíčové Meta metriky (spend, reach, frequency) – jak si kampaň vedla",
    "meta_detail": "2-3 krátké věty hodnotící detailní Meta metriky (ThruPlay rate, 3s views, avg watch time)",
    "tiktok_key": "2-3 krátké věty hodnotící klíčové TikTok metriky (spend, reach, frequency)",
    "tiktok_detail": "2-3 krátké věty hodnotící detailní TikTok metriky (ThruPlay rate, 3s views, avg watch time)"
  },
  "target_audience": "Analýza oslovené cílové skupiny – kdo byl osloven, jak efektivně, demographické poznatky (max 200 slov)",
  "content_analysis": {
    "creative_comparison": "Pokud kampaň obsahovala více vizuálů/kreativ, porovnej je mezi sebou. Napiš jaký z nich fungoval nejvíce a proč (CTR, engagement, reach). 2-3 krátké věty.",
    "platform_performance": "Na jaké síti se kampaň zobrazovala nejvíce a jakou skupinu uživatelů tam nejvíce zasáhla. 2-3 krátké věty.",
    "improvement_suggestions": "Navrhni jak by vizuál nebo copy šlo příště zlepšit, aby reklama doručila lepší výsledky. 2-3 krátké věty."
  },
  "brand_awareness": "Analýza vlivu kampaně na brand awareness – celkový dosah, frekvence, dopad na povědomí o značce (max 200 slov)",
  "learnings": {
    "what_worked": ["2-3 konkrétní body co se povedlo, s čísly"],
    "what_to_improve": ["2-3 body co zlepšit v příští kampani"],
    "what_to_test": ["2-3 nápady co příště otestovat"]
  }
}`;

  const systemPrompt = (promptMap["campaign_ads_system"] || defaultSystemPrompt) + "\n" + dataContext + (ctx.mediaPlanContext || "");
  const userPrompt = promptMap["campaign_ads_user"] || defaultUserPrompt;

  console.log("Calling AI for campaign Ads insights...");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errorText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const aiContent = JSON.parse(aiData.choices[0].message.content);

  // Persist thumbnails to permanent storage
  await persistThumbnails(supabase, report_id, [
    { key: "top_content", posts: top5 },
  ]);

  // Build media plan comparison
  const mediaPlanItems = ctx.mediaPlanContext ? [] : [];
  // Re-fetch media plan items for structured comparison
  const { data: mpItems = [] } = await supabase
    .from("media_plan_items")
    .select("*")
    .eq("report_id", report_id);

  const plannedBudget = (mpItems || []).reduce((s: number, i: any) => s + (i.budget || 0), 0);
  const plannedImpressions = (mpItems || []).reduce((s: number, i: any) => s + (i.impressions || 0), 0);
  const plannedReach = (mpItems || []).reduce((s: number, i: any) => s + (i.reach || 0), 0);
  const plannedCpm = (mpItems || []).reduce((s: number, i: any) => s + (i.cpm || 0), 0) / Math.max((mpItems || []).filter((i: any) => i.cpm).length, 1);
  const plannedFrequency = (mpItems || []).reduce((s: number, i: any) => s + (i.frequency || 0), 0) / Math.max((mpItems || []).filter((i: any) => i.frequency).length, 1);

  const mediaPlanComparison = (mpItems && mpItems.length > 0) ? {
    budget: { planned: plannedBudget, actual: totalSpend },
    impressions: { planned: plannedImpressions, actual: totalImpressions },
    reach: { planned: plannedReach, actual: totalReach },
    cpm: { planned: plannedCpm, actual: cpm },
    frequency: { planned: plannedFrequency, actual: avgFrequency },
  } : null;

  // Build audience demographics from breakdown rows
  const audienceDemographics: { category: string; facebook: number; instagram: number; tiktok: number }[] = [];
  const demoMap: Record<string, { facebook: number; instagram: number; tiktok: number }> = {};

  // Meta campaigns breakdown rows (age != '' and gender != '')
  for (const c of (campaigns || [])) {
    if (c.age && c.gender && (c.age !== '' || c.gender !== '')) {
      const label = `${c.gender === 'male' ? 'Muži' : c.gender === 'female' ? 'Ženy' : c.gender} ${c.age}`;
      if (!demoMap[label]) demoMap[label] = { facebook: 0, instagram: 0, tiktok: 0 };
      const platform = (c.publisher_platform || '').toLowerCase();
      if (platform === 'facebook') demoMap[label].facebook += (c.reach || 0);
      else if (platform === 'instagram') demoMap[label].instagram += (c.reach || 0);
      else {
        // unknown platform - split evenly or add to both
        demoMap[label].facebook += Math.round((c.reach || 0) / 2);
        demoMap[label].instagram += Math.round((c.reach || 0) / 2);
      }
    }
  }

  // Meta ad sets breakdown rows
  for (const as of (adSets || [])) {
    if (as.age && as.gender && (as.age !== '' || as.gender !== '')) {
      const label = `${as.gender === 'male' ? 'Muži' : as.gender === 'female' ? 'Ženy' : as.gender} ${as.age}`;
      if (!demoMap[label]) demoMap[label] = { facebook: 0, instagram: 0, tiktok: 0 };
      const platform = (as.publisher_platform || '').toLowerCase();
      if (platform === 'facebook') demoMap[label].facebook += (as.reach || 0);
      else if (platform === 'instagram') demoMap[label].instagram += (as.reach || 0);
    }
  }

  // TikTok campaigns breakdown rows
  for (const tc of (tiktokCampaigns || [])) {
    if (tc.age && tc.gender && (tc.age !== '' || tc.gender !== '')) {
      const label = `${tc.gender === 'MALE' ? 'Muži' : tc.gender === 'FEMALE' ? 'Ženy' : tc.gender} ${tc.age}`;
      if (!demoMap[label]) demoMap[label] = { facebook: 0, instagram: 0, tiktok: 0 };
      demoMap[label].tiktok += (tc.reach || 0);
    }
  }

  // Convert to array, sort by total reach, take top 4
  const demoArray = Object.entries(demoMap).map(([category, platforms]) => ({
    category,
    facebook: platforms.facebook,
    instagram: platforms.instagram,
    tiktok: platforms.tiktok,
    total: platforms.facebook + platforms.instagram + platforms.tiktok,
  }));
  demoArray.sort((a, b) => b.total - a.total);
  const top4Demographics = demoArray.slice(0, 4).map(({ category, facebook, instagram, tiktok }) => ({
    category, facebook, instagram, tiktok,
  }));

  const structuredInsights = {
    report_period: "campaign",
    executive_summary: aiContent.executive_summary,
    campaign_context,
    goal_fulfillment: aiContent.goal_fulfillment,
    metric_commentary: aiContent.metric_commentary || {},
    media_plan_comparison: mediaPlanComparison,
    meta_key_metrics: { spend: metaSpend, reach: metaReach, frequency: metaFreq, currency: "CZK" },
    meta_detail_metrics: { thruplay_rate: metaThruplayRate, view_rate_3s: metaViewRate3s, avg_watch_time: metaAvgWatchTime },
    tiktok_key_metrics: { spend: tkSpend, reach: tkReach, frequency: tkFreq, currency: "CZK" },
    tiktok_detail_metrics: { thruplay_rate: tkThruplayRate, view_rate_3s: tkViewRate3s, avg_watch_time: tkAvgWatchTime },
    audience_demographics: top4Demographics,
    target_audience: aiContent.target_audience || "",
    content_analysis: aiContent.content_analysis || { creative_comparison: "", platform_performance: "", improvement_suggestions: "" },
    top_content: top5,
    community_management: { answered_comments: null, answered_dms: null, response_rate_24h: null },
    brand_awareness: aiContent.brand_awareness || "",
    learnings: aiContent.learnings,
  };

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ai_insights: aiContent.executive_summary?.media_insight || "",
      ai_insights_structured: structuredInsights,
      ai_insights_context: campaign_context,
    })
    .eq("id", report_id);

  if (updateError) {
    console.error("Error saving insights:", updateError);
    throw new Error("Failed to save insights");
  }

  console.log("Campaign insights saved successfully");

  return new Response(
    JSON.stringify({ structured_data: structuredInsights }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Quarterly Report Handler ──
async function handleQuarterlyReport(ctx: any) {
  const {
    supabase, report_id, campaign_context, lovableApiKey,
    campaigns, adSets, ads,
    tiktokCampaigns, tiktokAdGroups, tiktokAds,
    totalSpend, totalReach, totalImpressions, totalClicks,
    totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
    totalReactions, totalComments, totalShares, totalSaves,
    avgFrequency, ctr, engagementRate, cpm, cpc, cpe,
    costPerThruplay, costPer3sView,
  } = ctx;

  // ── Platform classification using publisher_platform from campaigns ──
  // First, try to use publisher_platform from campaign rows
  const allMetaCampaignRows = (campaigns || []).filter((c: any) => !c.age || c.age === '');
  const fbCampaignRows = allMetaCampaignRows.filter((c: any) => (c.publisher_platform || '').toLowerCase() === 'facebook');
  const igCampaignRows = allMetaCampaignRows.filter((c: any) => (c.publisher_platform || '').toLowerCase() === 'instagram');
  // "unknown" rows are aggregates - use them for reach when platform-specific rows don't have it
  const unknownCampaignRows = allMetaCampaignRows.filter((c: any) => {
    const p = (c.publisher_platform || '').toLowerCase();
    return p === 'unknown' || p === '' || p === 'messenger';
  });

  // Also try ads classification by publisher_platform or name
  const fbAds = (ads || []).filter((a: any) => {
    const pp = (a.publisher_platform || '').toLowerCase();
    if (pp === 'facebook') return true;
    const name = (a.ad_name || '').toLowerCase();
    return name.includes('facebook') || name.includes('fb');
  });
  const igAds = (ads || []).filter((a: any) => {
    const pp = (a.publisher_platform || '').toLowerCase();
    if (pp === 'instagram') return true;
    const name = (a.ad_name || '').toLowerCase();
    return name.includes('instagram') || name.includes('ig');
  });
  const unclassifiedMetaAds = (ads || []).filter((a: any) => {
    const pp = (a.publisher_platform || '').toLowerCase();
    const name = (a.ad_name || '').toLowerCase();
    return pp !== 'facebook' && pp !== 'instagram' && !name.includes('facebook') && !name.includes('fb') && !name.includes('instagram') && !name.includes('ig');
  });
  if (fbAds.length === 0 && igAds.length === 0 && unclassifiedMetaAds.length > 0) {
    fbAds.push(...unclassifiedMetaAds);
  }

  // Also try ad_sets by publisher_platform
  const fbAdSets = (adSets || []).filter((as: any) => (as.publisher_platform || '').toLowerCase() === 'facebook');
  const igAdSets = (adSets || []).filter((as: any) => (as.publisher_platform || '').toLowerCase() === 'instagram');

  // Normalize TikTok ads
  const normalizedTiktokAds = (tiktokAds || []).map((a: any) => ({
    ad_name: a.ad_name || "Unnamed",
    amount_spent: a.amount_spent || 0,
    reach: a.reach || 0,
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    ctr: a.ctr || 0,
    post_reactions: a.likes || 0,
    post_comments: a.comments || 0,
    post_shares: a.shares || 0,
    post_saves: 0,
    thruplays: a.video_views_p100 || 0,
    thumbnail_url: a.thumbnail_url || null,
  }));

  // Calculate platform metrics: prefer ads > ad_sets > campaigns
  const calcMetricsFromRows = (rows: any[]) => {
    const spend = rows.reduce((s: number, r: any) => s + (r.amount_spent || 0), 0);
    const reach = rows.reduce((s: number, r: any) => s + (r.reach || 0), 0);
    const impr = rows.reduce((s: number, r: any) => s + (r.impressions || 0), 0);
    const clicks = rows.reduce((s: number, r: any) => s + (r.clicks || 0), 0);
    const interactions = rows.reduce((s: number, r: any) => s + (r.post_reactions || r.likes || 0) + (r.post_comments || r.comments || 0) + (r.post_shares || r.shares || 0) + (r.post_saves || 0), 0);
    const thruplays = rows.reduce((s: number, r: any) => s + (r.thruplays || r.video_views_p100 || 0), 0);
    return {
      spend, reach, frequency: reach > 0 ? impr / reach : 0,
      cpm: impr > 0 ? (spend / impr) * 1000 : 0,
      cpe: interactions > 0 ? spend / interactions : 0,
      cpv: thruplays > 0 ? spend / thruplays : 0,
    };
  };

  // Facebook: ads > ad_sets > campaigns
  const fbM = fbAds.length > 0 ? calcMetricsFromRows(fbAds) :
              fbAdSets.length > 0 ? calcMetricsFromRows(fbAdSets) :
              calcMetricsFromRows(fbCampaignRows);
  // Instagram: ads > ad_sets > campaigns
  const igM = igAds.length > 0 ? calcMetricsFromRows(igAds) :
              igAdSets.length > 0 ? calcMetricsFromRows(igAdSets) :
              calcMetricsFromRows(igCampaignRows);
  // TikTok: normalized ads > tiktok ad groups > tiktok campaigns
  const tiktokCampaignsOnly = (tiktokCampaigns || []).filter((c: any) => !c.age && !c.gender && !c.location);
  const tkM = normalizedTiktokAds.length > 0 ? calcMetricsFromRows(normalizedTiktokAds) :
              (tiktokAdGroups || []).length > 0 ? calcMetricsFromRows(tiktokAdGroups) :
              calcMetricsFromRows(tiktokCampaignsOnly);

  // For reach: if platform-specific rows have 0 reach, try to distribute from "unknown" aggregate rows
  if (fbM.reach === 0 && igM.reach === 0 && unknownCampaignRows.length > 0) {
    const totalUnknownReach = unknownCampaignRows.reduce((s: number, r: any) => s + (r.reach || 0), 0);
    const totalPlatformSpend = fbM.spend + igM.spend;
    if (totalPlatformSpend > 0 && totalUnknownReach > 0) {
      const fbRatio = fbM.spend / totalPlatformSpend;
      const igRatio = igM.spend / totalPlatformSpend;
      fbM.reach = Math.round(totalUnknownReach * fbRatio);
      igM.reach = Math.round(totalUnknownReach * igRatio);
      const fbImpr = fbCampaignRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0) || fbM.spend / (fbM.cpm || 1) * 1000;
      const igImpr = igCampaignRows.reduce((s: number, r: any) => s + (r.impressions || 0), 0) || igM.spend / (igM.cpm || 1) * 1000;
      fbM.frequency = fbM.reach > 0 ? fbImpr / fbM.reach : 0;
      igM.frequency = igM.reach > 0 ? igImpr / igM.reach : 0;
    }
  }

  const generateTopReason = (a: any, rank: number) => {
    const parts: string[] = [];
    if (rank <= 3) parts.push(`#${rank} nejvyšší spend`);
    if ((a.ctr || 0) > 1) parts.push(`silné CTR ${(a.ctr || 0).toFixed(2)}%`);
    if ((a.impressions || 0) > 10000) parts.push(`${((a.impressions || 0) / 1000).toFixed(0)}K impressions`);
    if ((a.clicks || 0) > 100) parts.push(`${a.clicks} kliknutí`);
    return parts.length > 0 ? parts.join(", ") : "Vysoký spend a dobrý výkon";
  };

  const generateImproveReason = (a: any) => {
    const parts: string[] = [];
    if ((a.ctr || 0) < 0.5) parts.push(`nízké CTR ${(a.ctr || 0).toFixed(2)}%`);
    else if ((a.ctr || 0) < 1) parts.push(`podprůměrné CTR ${(a.ctr || 0).toFixed(2)}%`);
    if ((a.amount_spent || 0) > 0 && (a.clicks || 0) === 0) parts.push("žádné kliknutí");
    if ((a.impressions || 0) > 0 && (a.clicks || 0) / (a.impressions || 1) < 0.005) parts.push("nízká konverze zobrazení na kliky");
    return parts.length > 0 ? parts.join(", ") : "Prostor pro optimalizaci výkonu";
  };

  const getName = (a: any) => a.ad_name || a.adset_name || a.campaign_name || "Unnamed";

  const topBySpend = (arr: any[], count: number) =>
    [...arr].sort((a, b) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, count).map((a: any, i: number) => ({
      name: getName(a), spend: a.amount_spent || 0, impressions: a.impressions || 0,
      clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      reason: generateTopReason(a, i + 1),
    }));

  const bottomByPerformance = (arr: any[], count: number) =>
    [...arr].filter((a) => (a.amount_spent || 0) > 0).sort((a, b) => (a.ctr || 0) - (b.ctr || 0)).slice(0, count).map((a: any) => ({
      name: getName(a), spend: a.amount_spent || 0, impressions: a.impressions || 0,
      clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      reason: generateImproveReason(a),
    }));

  const campaignSummary = campaigns
    .map((cm: any) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`)
    .join("\n");

  // Fetch prompts from DB
  const { data: prompts } = await supabase
    .from("ai_prompts")
    .select("key, prompt_text")
    .in("key", ["quarterly_ads_system", "quarterly_ads_user"]);

  const promptMap: Record<string, string> = {};
  for (const p of prompts || []) {
    promptMap[p.key] = p.prompt_text;
  }

  // Define post sources early so we can include them in the AI prompt context
  const fbPostSource = fbAds.length > 0 ? fbAds : fbAdSets.length > 0 ? fbAdSets : fbCampaignRows;
  const igPostSource = igAds.length > 0 ? igAds : igAdSets.length > 0 ? igAdSets : igCampaignRows;
  const tkPostSource = normalizedTiktokAds.length > 0 ? normalizedTiktokAds : (tiktokAdGroups || []).length > 0 ? tiktokAdGroups : tiktokCampaignsOnly;

  const dataContext = `
CELKOVÁ DATA KVARTÁLU:
- Celkový spend: ${totalSpend.toFixed(2)} CZK
- Celkový reach: ${totalReach.toLocaleString()}
- Celkové impressions: ${totalImpressions.toLocaleString()}
- Průměrná frekvence: ${avgFrequency.toFixed(2)}
- ThruPlays: ${totalThruplays.toLocaleString()}
- 3s Video Views: ${total3sViews.toLocaleString()}
- Link Clicks: ${totalLinkClicks.toLocaleString()}
- Celkové interakce: ${totalInteractions.toLocaleString()} (Reactions: ${totalReactions}, Comments: ${totalComments}, Shares: ${totalShares}, Saves: ${totalSaves})
- CTR: ${ctr.toFixed(2)}%, Engagement Rate: ${engagementRate.toFixed(2)}%
- CPM: ${cpm.toFixed(2)} CZK, CPC: ${cpc.toFixed(2)} CZK, CPE: ${cpe.toFixed(2)} CZK
- Cost per ThruPlay: ${costPerThruplay.toFixed(2)} CZK, Cost per 3s View: ${costPer3sView.toFixed(2)} CZK
- Počet kampaní: ${campaigns.length + (tiktokCampaigns || []).length}, Ad setů: ${adSets.length + (tiktokAdGroups || []).length}, Reklam: ${(ads || []).length + normalizedTiktokAds.length}

KAMPANĚ:
${campaignSummary}
${(tiktokCampaigns || []).map((cm: any) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`).join("\n")}

FACEBOOK DATA (${fbAds.length} reklam): Spend ${fbM.spend.toFixed(2)}, Reach ${fbM.reach}, Freq ${fbM.frequency.toFixed(2)}, CPM ${fbM.cpm.toFixed(2)}, CPE ${fbM.cpe.toFixed(2)}, CPV ${fbM.cpv.toFixed(2)}
INSTAGRAM DATA (${igAds.length} reklam): Spend ${igM.spend.toFixed(2)}, Reach ${igM.reach}, Freq ${igM.frequency.toFixed(2)}, CPM ${igM.cpm.toFixed(2)}, CPE ${igM.cpe.toFixed(2)}, CPV ${igM.cpv.toFixed(2)}
TIKTOK DATA (${normalizedTiktokAds.length} reklam): Spend ${tkM.spend.toFixed(2)}, Reach ${tkM.reach}, Freq ${tkM.frequency.toFixed(2)}, CPM ${tkM.cpm.toFixed(2)}, CPE ${tkM.cpe.toFixed(2)}, CPV ${tkM.cpv.toFixed(2)}

TOP FACEBOOK REKLAMY (dle spend):
${(fbPostSource.length > 0 ? [...fbPostSource].sort((a: any, b: any) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

NEJHORŠÍ FACEBOOK REKLAMY (dle CTR):
${(fbPostSource.length > 0 ? [...fbPostSource].filter((a: any) => (a.amount_spent || 0) > 0).sort((a: any, b: any) => (a.ctr || 0) - (b.ctr || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

TOP INSTAGRAM REKLAMY (dle spend):
${(igPostSource.length > 0 ? [...igPostSource].sort((a: any, b: any) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

NEJHORŠÍ INSTAGRAM REKLAMY (dle CTR):
${(igPostSource.length > 0 ? [...igPostSource].filter((a: any) => (a.amount_spent || 0) > 0).sort((a: any, b: any) => (a.ctr || 0) - (b.ctr || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

TOP TIKTOK REKLAMY (dle spend):
${(tkPostSource.length > 0 ? [...tkPostSource].sort((a: any, b: any) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

NEJHORŠÍ TIKTOK REKLAMY (dle CTR):
${(tkPostSource.length > 0 ? [...tkPostSource].filter((a: any) => (a.amount_spent || 0) > 0).sort((a: any, b: any) => (a.ctr || 0) - (b.ctr || 0)).slice(0, 5).map((a: any) => `- ${getName(a)}: Spend ${a.amount_spent || 0}, Impr ${a.impressions || 0}, Clicks ${a.clicks || 0}, CTR ${(a.ctr || 0).toFixed(2)}%`).join("\n") : "Žádná data")}

KONTEXT OD UŽIVATELE:
- Hlavní cíl: ${campaign_context.mainGoal}
- Co bylo realizováno: ${campaign_context.actions}
- Co se povedlo: ${campaign_context.highlights}`;

  const defaultSystemPrompt = `Jsi zkušený analytik digitálního marketingu. Tvým úkolem je vytvořit kompletní kvartální report výkonu reklamních kampaní v češtině. Report musí být profesionální, datově podložený a obsahovat konkrétní čísla. Zaměř se na strategický pohled za celý kvartál, trendy, a doporučení pro následující kvartál.`;

  const defaultUserPrompt = `Vytvoř kompletní kvartální analytický report. Odpověz POUZE validním JSON objektem s touto přesnou strukturou:

{
  "executive_summary": {
    "intro": "Úvodní shrnutí kvartálu v 2-3 větách – stručný přehled výsledků a hlavní závěr",
    "media_insight": "Klíčový media poznatek za kvartál s konkrétními čísly (max 100 slov)",
    "top_result": "Nejlepší výsledek kvartálu s konkrétními daty (max 100 slov)",
    "recommendation": "Hlavní doporučení pro zlepšení v dalším kvartálu (max 100 slov)"
  },
  "goal_fulfillment": {
    "goals_set": "Popis stanovených cílů, nových zavedení nebo změn v tomto kvartálu (max 150 slov)",
    "results": "Detailní vyhodnocení plnění cílů a výsledků změn s konkrétními čísly (max 150 slov)"
  },
  "metrics_over_time": "Popis celkového vývoje klíčových metrik za kvartál – trendy, sezónnost, výkyvy (max 150 slov)",
  "metric_commentary": {
    "facebook_key": "2-3 krátké věty hodnotící klíčové Facebook metriky (spend, reach, frequency)",
    "facebook_detail": "2-3 krátké věty hodnotící detailní Facebook metriky (CPM, CPE, CPV)",
    "instagram_key": "2-3 krátké věty hodnotící klíčové Instagram metriky (spend, reach, frequency)",
    "instagram_detail": "2-3 krátké věty hodnotící detailní Instagram metriky (CPM, CPE, CPV)",
    "tiktok_key": "2-3 krátké věty hodnotící klíčové TikTok metriky (spend, reach, frequency)",
    "tiktok_detail": "2-3 krátké věty hodnotící detailní TikTok metriky (CPM, CPE, CPV)"
  },
  "brand_awareness": "Analýza vlivu kampaní na brand awareness za celý kvartál – celkový dosah, frekvence, dopad (max 150 slov)",
  "facebook_metrics_over_time": "Vývoj FB metrik v průběhu kvartálu (max 100 slov)",
  "facebook_top_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v úspěšnějších postech a napiš, co nám tento kvartál fungovalo. Vezmi data i z minulosti a porovnej podobnosti i zde. Vyhodnoť, co nám pro jakou optimalizaci funguje. Tento souhrn napiš ve 2-3 větách.",
  "facebook_improve_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v méně úspěšných postech a napiš, co nám tento kvartál moc nefungovalo. Vezmi data i z minulosti a porovnej podobnosti i zde. Vyhodnoť, co nám pro jakou optimalizaci nefunguje. Tento souhrn napiš ve 2-3 větách.",
  "instagram_metrics_over_time": "Vývoj IG metrik v průběhu kvartálu (max 100 slov)",
  "instagram_top_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v úspěšnějších IG postech a napiš, co nám tento kvartál fungovalo. 2-3 věty.",
  "instagram_improve_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v méně úspěšných IG postech a napiš, co nám nefungovalo. 2-3 věty.",
  "tiktok_metrics_over_time": "Vývoj TikTok metrik v průběhu kvartálu (max 100 slov)",
  "tiktok_top_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v úspěšnějších TikTok postech a napiš, co nám tento kvartál fungovalo. 2-3 věty.",
  "tiktok_improve_posts_analysis": "Projdi každou optimalizaci zvlášť. Najdi podobnost v méně úspěšných TikTok postech a napiš, co nám nefungovalo. 2-3 věty.",
  "summary_success": {
    "what_worked": ["2-3 body co fungovalo dobře za kvartál"],
    "top_results": ["2-3 TOP výsledky kvartálu s konkrétními čísly"]
  },
  "summary_events": {
    "what_happened": ["2-3 klíčové události/aktivity za kvartál"],
    "what_we_solved": ["2-3 problémy které jsme řešili"],
    "threats_opportunities": ["2-3 identifikované hrozby a příležitosti"]
  },
  "learnings": {
    "improving": ["2-3 body co aktivně zlepšujeme"],
    "focus_areas": ["2-3 oblasti kterým se budeme věnovat"],
    "changes": ["2-3 konkrétní změny které implementujeme"]
  }
}`;

  const systemPrompt = (promptMap["quarterly_ads_system"] || defaultSystemPrompt) + "\n" + dataContext + (ctx.mediaPlanContext || "");
  const userPrompt = promptMap["quarterly_ads_user"] || defaultUserPrompt;

  console.log("Calling AI for quarterly Ads insights...");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errorText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const aiContent = JSON.parse(aiData.choices[0].message.content);

  // Persist thumbnails to permanent storage

  const fbTop = topBySpend(fbPostSource, 5);
  const fbImprove = bottomByPerformance(fbPostSource, 3);
  const igTop = topBySpend(igPostSource, 5);
  const igImprove = bottomByPerformance(igPostSource, 3);
  const tkTop = topBySpend(tkPostSource, 5);
  const tkImprove = bottomByPerformance(tkPostSource, 3);

  await persistThumbnails(supabase, report_id, [
    { key: "facebook_top_posts", posts: fbTop },
    { key: "facebook_improve_posts", posts: fbImprove },
    { key: "instagram_top_posts", posts: igTop },
    { key: "instagram_improve_posts", posts: igImprove },
    { key: "tiktok_top_posts", posts: tkTop },
    { key: "tiktok_improve_posts", posts: tkImprove },
  ]);

  // Build media plan comparison
  const { data: mpItems = [] } = await supabase
    .from("media_plan_items")
    .select("*")
    .eq("report_id", report_id);

  const plannedBudget = (mpItems || []).reduce((s: number, i: any) => s + (i.budget || 0), 0);
  const plannedImpressions = (mpItems || []).reduce((s: number, i: any) => s + (i.impressions || 0), 0);
  const plannedReach = (mpItems || []).reduce((s: number, i: any) => s + (i.reach || 0), 0);
  const plannedCpm = (mpItems || []).reduce((s: number, i: any) => s + (i.cpm || 0), 0) / Math.max((mpItems || []).filter((i: any) => i.cpm).length, 1);
  const plannedFrequency = (mpItems || []).reduce((s: number, i: any) => s + (i.frequency || 0), 0) / Math.max((mpItems || []).filter((i: any) => i.frequency).length, 1);

  const mediaPlanComparison = (mpItems && mpItems.length > 0) ? {
    budget: { planned: plannedBudget, actual: totalSpend },
    impressions: { planned: plannedImpressions, actual: totalImpressions },
    reach: { planned: plannedReach, actual: totalReach },
    cpm: { planned: plannedCpm, actual: cpm },
    frequency: { planned: plannedFrequency, actual: avgFrequency },
  } : null;

  const structuredInsights = {
    report_period: "quarterly",
    executive_summary: aiContent.executive_summary,
    campaign_context,
    goal_fulfillment: aiContent.goal_fulfillment,
    key_metrics: { spend: totalSpend, reach: totalReach, frequency: avgFrequency, currency: "CZK" },
    detail_metrics: { cpm, cpe, cpv: costPerThruplay, currency: "CZK" },
    metrics_over_time: aiContent.metrics_over_time,
    metric_commentary: aiContent.metric_commentary || {},
    media_plan_comparison: mediaPlanComparison,
    community_management: { answered_comments: null, answered_dms: null, response_rate_24h: null },
    brand_awareness: aiContent.brand_awareness,
    facebook_metrics: { spend: fbM.spend, reach: fbM.reach, frequency: fbM.frequency },
    facebook_detail_metrics: { cpm: fbM.cpm, cpe: fbM.cpe, cpv: fbM.cpv },
    facebook_metrics_over_time: aiContent.facebook_metrics_over_time || "",
    facebook_top_posts_analysis: aiContent.facebook_top_posts_analysis || "",
    facebook_improve_posts_analysis: aiContent.facebook_improve_posts_analysis || "",
    facebook_top_posts: fbTop,
    facebook_improve_posts: fbImprove,
    instagram_metrics: { spend: igM.spend, reach: igM.reach, frequency: igM.frequency },
    instagram_detail_metrics: { cpm: igM.cpm, cpe: igM.cpe, cpv: igM.cpv },
    instagram_metrics_over_time: aiContent.instagram_metrics_over_time || "",
    instagram_top_posts_analysis: aiContent.instagram_top_posts_analysis || "",
    instagram_improve_posts_analysis: aiContent.instagram_improve_posts_analysis || "",
    instagram_top_posts: igTop,
    instagram_improve_posts: igImprove,
    tiktok_metrics: { spend: tkM.spend, reach: tkM.reach, frequency: tkM.frequency },
    tiktok_detail_metrics: { cpm: tkM.cpm, cpe: tkM.cpe, cpv: tkM.cpv },
    tiktok_metrics_over_time: aiContent.tiktok_metrics_over_time || "",
    tiktok_top_posts_analysis: aiContent.tiktok_top_posts_analysis || "",
    tiktok_improve_posts_analysis: aiContent.tiktok_improve_posts_analysis || "",
    tiktok_top_posts: tkTop,
    tiktok_improve_posts: tkImprove,
    followers: { facebook: null, instagram: null, tiktok: null },
    summary_success: aiContent.summary_success,
    summary_events: aiContent.summary_events,
    learnings: aiContent.learnings,
  };

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ai_insights: aiContent.executive_summary?.media_insight || "",
      ai_insights_structured: structuredInsights,
      ai_insights_context: campaign_context,
    })
    .eq("id", report_id);

  if (updateError) {
    console.error("Error saving insights:", updateError);
    throw new Error("Failed to save insights");
  }

  console.log("Quarterly insights saved successfully");

  return new Response(
    JSON.stringify({ structured_data: structuredInsights }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ── Yearly Report Handler ──
async function handleYearlyReport(ctx: any) {
  const {
    supabase, report_id, campaign_context, lovableApiKey,
    campaigns, adSets, ads,
    tiktokCampaigns, tiktokAdGroups, tiktokAds,
    totalSpend, totalReach, totalImpressions, totalClicks,
    totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
    totalReactions, totalComments, totalShares, totalSaves,
    avgFrequency, ctr, engagementRate, cpm, cpc, cpe,
    costPerThruplay, costPer3sView,
  } = ctx;

  // Separate Meta ads by platform
  const fbAds = (ads || []).filter((a: any) => {
    const name = (a.ad_name || "").toLowerCase();
    return name.includes("facebook") || name.includes("fb");
  });
  const igAds = (ads || []).filter((a: any) => {
    const name = (a.ad_name || "").toLowerCase();
    return name.includes("instagram") || name.includes("ig");
  });
  const unclassifiedMetaAds = (ads || []).filter((a: any) => {
    const name = (a.ad_name || "").toLowerCase();
    return !name.includes("facebook") && !name.includes("fb") && !name.includes("instagram") && !name.includes("ig");
  });
  if (fbAds.length === 0 && igAds.length === 0 && unclassifiedMetaAds.length > 0) {
    fbAds.push(...unclassifiedMetaAds);
  }

  // Normalize TikTok ads
  const normalizedTiktokAds = (tiktokAds || []).map((a: any) => ({
    ad_name: a.ad_name || "Unnamed",
    amount_spent: a.amount_spent || 0,
    reach: a.reach || 0,
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    ctr: a.ctr || 0,
    post_reactions: a.likes || 0,
    post_comments: a.comments || 0,
    post_shares: a.shares || 0,
    post_saves: 0,
    thruplays: a.video_views_p100 || 0,
    video_3s_plays: a.video_watched_2s || 0,
    thumbnail_url: a.thumbnail_url || null,
  }));

  const calcPlatformMetrics = (platformAds: any[]) => {
    const spend = platformAds.reduce((s: number, a: any) => s + (a.amount_spent || 0), 0);
    const reach = platformAds.reduce((s: number, a: any) => s + (a.reach || 0), 0);
    const impr = platformAds.reduce((s: number, a: any) => s + (a.impressions || 0), 0);
    const clicks = platformAds.reduce((s: number, a: any) => s + (a.clicks || 0), 0);
    const interactions = platformAds.reduce((s: number, a: any) => s + (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0), 0);
    const thruplays = platformAds.reduce((s: number, a: any) => s + (a.thruplays || 0), 0);
    return {
      spend, reach, frequency: reach > 0 ? impr / reach : 0,
      cpm: impr > 0 ? (spend / impr) * 1000 : 0,
      cpe: interactions > 0 ? spend / interactions : 0,
      cpv: thruplays > 0 ? spend / thruplays : 0,
    };
  };

  const fbM = calcPlatformMetrics(fbAds);
  const igM = calcPlatformMetrics(igAds);
  const tkM = calcPlatformMetrics(normalizedTiktokAds);

  // Reason generators
  const generateTopReachReason = (a: any, rank: number) => {
    const parts: string[] = [];
    if (rank <= 3) parts.push(`#${rank} nejvyšší reach`);
    if ((a.reach || 0) > 10000) parts.push(`${((a.reach || 0) / 1000).toFixed(0)}K reach`);
    if ((a.impressions || 0) > 20000) parts.push(`${((a.impressions || 0) / 1000).toFixed(0)}K impressions`);
    return parts.length > 0 ? parts.join(", ") : "Vysoký dosah";
  };
  const generateTopEngagementReason = (a: any, rank: number) => {
    const eng = (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0);
    const parts: string[] = [];
    if (rank <= 3) parts.push(`#${rank} nejvyšší engagement`);
    if (eng > 100) parts.push(`${eng} interakcí`);
    if ((a.ctr || 0) > 1) parts.push(`CTR ${(a.ctr || 0).toFixed(2)}%`);
    return parts.length > 0 ? parts.join(", ") : "Silné zapojení";
  };
  const generateTopVideoReason = (a: any, rank: number) => {
    const views = a.thruplays || a.video_views_p100 || 0;
    const parts: string[] = [];
    if (rank <= 3) parts.push(`#${rank} nejvíce video views`);
    if (views > 1000) parts.push(`${(views / 1000).toFixed(1)}K views`);
    return parts.length > 0 ? parts.join(", ") : "Silný video výkon";
  };
  const generateImproveReason = (a: any, metric: string) => {
    const parts: string[] = [];
    if (metric === "reach" && (a.reach || 0) < 1000) parts.push(`nízký reach ${a.reach || 0}`);
    if (metric === "engagement") {
      const eng = (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0);
      if (eng < 10) parts.push(`pouze ${eng} interakcí`);
    }
    if (metric === "video") {
      const views = a.thruplays || 0;
      if (views < 100) parts.push(`pouze ${views} video views`);
    }
    if ((a.ctr || 0) < 0.5) parts.push(`nízké CTR ${(a.ctr || 0).toFixed(2)}%`);
    if ((a.amount_spent || 0) > 0 && (a.clicks || 0) === 0) parts.push("žádné kliknutí");
    return parts.length > 0 ? parts.join(", ") : "Prostor pro optimalizaci";
  };

  // Sorting helpers
  const topByReach = (arr: any[], count: number) =>
    [...arr].sort((a, b) => (b.reach || 0) - (a.reach || 0)).slice(0, count).map((a: any, i: number) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      reason: generateTopReachReason(a, i + 1),
    }));

  const bottomByReach = (arr: any[], count: number) =>
    [...arr].filter((a) => (a.amount_spent || 0) > 0).sort((a, b) => (a.reach || 0) - (b.reach || 0)).slice(0, count).map((a: any) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      reason: generateImproveReason(a, "reach"),
    }));

  const topByEngagement = (arr: any[], count: number) =>
    [...arr].sort((a, b) => {
      const engA = (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0);
      const engB = (b.post_reactions || 0) + (b.post_comments || 0) + (b.post_shares || 0) + (b.post_saves || 0);
      return engB - engA;
    }).slice(0, count).map((a: any, i: number) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      engagement: (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0),
      reason: generateTopEngagementReason(a, i + 1),
    }));

  const bottomByEngagement = (arr: any[], count: number) =>
    [...arr].filter((a) => (a.amount_spent || 0) > 0).sort((a, b) => {
      const engA = (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0);
      const engB = (b.post_reactions || 0) + (b.post_comments || 0) + (b.post_shares || 0) + (b.post_saves || 0);
      return engA - engB;
    }).slice(0, count).map((a: any) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      engagement: (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0),
      reason: generateImproveReason(a, "engagement"),
    }));

  const topByVideoViews = (arr: any[], count: number) =>
    [...arr].sort((a, b) => (b.thruplays || 0) - (a.thruplays || 0)).slice(0, count).map((a: any, i: number) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      video_views: a.thruplays || 0,
      reason: generateTopVideoReason(a, i + 1),
    }));

  const bottomByVideoViews = (arr: any[], count: number) =>
    [...arr].filter((a) => (a.amount_spent || 0) > 0 && (a.thruplays || 0) > 0).sort((a, b) => (a.thruplays || 0) - (b.thruplays || 0)).slice(0, count).map((a: any) => ({
      name: a.ad_name || "Unnamed", spend: a.amount_spent || 0, impressions: a.impressions || 0,
      reach: a.reach || 0, clicks: a.clicks || 0, ctr: a.ctr || 0, thumbnail_url: a.thumbnail_url || null,
      video_views: a.thruplays || 0,
      reason: generateImproveReason(a, "video"),
    }));

  const campaignSummary = [
    ...campaigns.map((cm: any) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`),
    ...(tiktokCampaigns || []).map((cm: any) => `[TikTok] ${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.clicks}`),
  ].join("\n");

  // Fetch prompts from DB
  const { data: prompts } = await supabase
    .from("ai_prompts")
    .select("key, prompt_text")
    .in("key", ["yearly_ads_system", "yearly_ads_user"]);

  const promptMap: Record<string, string> = {};
  for (const p of prompts || []) {
    promptMap[p.key] = p.prompt_text;
  }

  const dataContext = `
CELKOVÁ DATA ROKU:
- Celkový spend: ${totalSpend.toFixed(2)} CZK
- Celkový reach: ${totalReach.toLocaleString()}
- Celkové impressions: ${totalImpressions.toLocaleString()}
- Průměrná frekvence: ${avgFrequency.toFixed(2)}
- ThruPlays: ${totalThruplays.toLocaleString()}
- 3s Video Views: ${total3sViews.toLocaleString()}
- Link Clicks: ${totalLinkClicks.toLocaleString()}
- Celkové interakce: ${totalInteractions.toLocaleString()} (Reactions: ${totalReactions}, Comments: ${totalComments}, Shares: ${totalShares}, Saves: ${totalSaves})
- CTR: ${ctr.toFixed(2)}%, Engagement Rate: ${engagementRate.toFixed(2)}%
- CPM: ${cpm.toFixed(2)} CZK, CPC: ${cpc.toFixed(2)} CZK, CPE: ${cpe.toFixed(2)} CZK
- Cost per ThruPlay: ${costPerThruplay.toFixed(2)} CZK, Cost per 3s View: ${costPer3sView.toFixed(2)} CZK
- Počet kampaní: ${campaigns.length + (tiktokCampaigns || []).length}, Ad setů: ${adSets.length + (tiktokAdGroups || []).length}, Reklam: ${(ads || []).length + normalizedTiktokAds.length}

KAMPANĚ:
${campaignSummary}

FACEBOOK DATA (${fbAds.length} reklam): Spend ${fbM.spend.toFixed(2)}, Reach ${fbM.reach}, Freq ${fbM.frequency.toFixed(2)}, CPM ${fbM.cpm.toFixed(2)}, CPE ${fbM.cpe.toFixed(2)}, CPV ${fbM.cpv.toFixed(2)}
INSTAGRAM DATA (${igAds.length} reklam): Spend ${igM.spend.toFixed(2)}, Reach ${igM.reach}, Freq ${igM.frequency.toFixed(2)}, CPM ${igM.cpm.toFixed(2)}, CPE ${igM.cpe.toFixed(2)}, CPV ${igM.cpv.toFixed(2)}
TIKTOK DATA (${normalizedTiktokAds.length} reklam): Spend ${tkM.spend.toFixed(2)}, Reach ${tkM.reach}, Freq ${tkM.frequency.toFixed(2)}, CPM ${tkM.cpm.toFixed(2)}, CPE ${tkM.cpe.toFixed(2)}, CPV ${tkM.cpv.toFixed(2)}

KONTEXT OD UŽIVATELE:
- Hlavní cíl: ${campaign_context.mainGoal}
- Co bylo realizováno: ${campaign_context.actions}
- Co se povedlo: ${campaign_context.highlights}`;

  const defaultSystemPrompt = `Jsi zkušený analytik digitálního marketingu. Tvým úkolem je vytvořit kompletní roční report výkonu reklamních kampaní v češtině. Report musí být profesionální, datově podložený a obsahovat konkrétní čísla. Zaměř se na strategický pohled za celý rok, dlouhodobé trendy, porovnání platforem a doporučení pro následující rok.`;

  const defaultUserPrompt = `Vytvoř kompletní roční analytický report. Odpověz POUZE validním JSON objektem s touto přesnou strukturou:

{
  "executive_summary": {
    "intro": "Úvodní shrnutí roku v 2-3 větách – stručný přehled výsledků a hlavní závěr",
    "media_insight": "Klíčový media poznatek za rok (max 150 slov)",
    "top_result": "Nejlepší výsledek roku (max 150 slov)",
    "recommendation": "Hlavní doporučení pro zlepšení (max 150 slov)"
  },
  "goal_fulfillment": {
    "goals_set": "Popis stanovených cílů za rok (max 200 slov)",
    "results": "Vyhodnocení plnění cílů s čísly (max 200 slov)"
  },
  "metrics_over_time": "Vývoj klíčových metrik za rok (max 200 slov)",
  "brand_awareness": "Analýza vlivu na brand awareness za rok (max 200 slov)",
  "facebook_metrics_over_time": "Vývoj FB metrik (max 150 slov)",
  "facebook_reach_analysis": "Co fungovalo na zásah na FB (max 150 slov)",
  "facebook_engagement_analysis": "Které příspěvky vzbudily zájem na FB (max 150 slov)",
  "facebook_video_analysis": "Která videa upoutala na FB (max 150 slov)",
  "instagram_metrics_over_time": "Vývoj IG metrik (max 150 slov)",
  "instagram_reach_analysis": "Co fungovalo na zásah na IG (max 150 slov)",
  "instagram_engagement_analysis": "Které příspěvky vzbudily zájem na IG (max 150 slov)",
  "instagram_video_analysis": "Která videa upoutala na IG (max 150 slov)",
  "tiktok_metrics_over_time": "Vývoj TikTok metrik (max 150 slov)",
  "tiktok_reach_analysis": "Co fungovalo na zásah na TikToku (max 150 slov)",
  "tiktok_engagement_analysis": "Které příspěvky vzbudily zájem na TikToku (max 150 slov)",
  "tiktok_video_analysis": "Která videa upoutala na TikToku (max 150 slov)",
  "competition_analysis": "Shrnutí konkurenčního prostředí a inspirace (max 200 slov)",
  "summary_success": {
    "what_worked": ["2-3 body co fungovalo"],
    "top_results": ["2-3 TOP výsledky roku"]
  },
  "summary_events": {
    "what_happened": ["2-3 klíčové události"],
    "what_we_solved": ["2-3 problémy"],
    "threats_opportunities": ["2-3 hrozby a příležitosti"]
  },
  "learnings": {
    "improving": ["2-3 body co zlepšíme"],
    "focus_areas": ["2-3 oblasti kterým se budeme věnovat"],
    "changes": ["2-3 konkrétní změny"]
  }
}`;

  const systemPrompt = (promptMap["yearly_ads_system"] || defaultSystemPrompt) + "\n" + dataContext + (ctx.mediaPlanContext || "");
  const userPrompt = promptMap["yearly_ads_user"] || defaultUserPrompt;

  console.log("Calling AI for yearly Ads insights...");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errorText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errorText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const aiContent = JSON.parse(aiData.choices[0].message.content);

  // Persist thumbnails to permanent storage
  const fbTopR = topByReach(fbAds, 5);
  const fbBotR = bottomByReach(fbAds, 3);
  const fbTopE = topByEngagement(fbAds, 5);
  const fbBotE = bottomByEngagement(fbAds, 3);
  const fbTopV = topByVideoViews(fbAds, 5);
  const fbBotV = bottomByVideoViews(fbAds, 3);
  const igTopR = topByReach(igAds, 5);
  const igBotR = bottomByReach(igAds, 3);
  const igTopE = topByEngagement(igAds, 5);
  const igBotE = bottomByEngagement(igAds, 3);
  const igTopV = topByVideoViews(igAds, 5);
  const igBotV = bottomByVideoViews(igAds, 3);
  const tkTopR = topByReach(normalizedTiktokAds, 5);
  const tkBotR = bottomByReach(normalizedTiktokAds, 3);
  const tkTopE = topByEngagement(normalizedTiktokAds, 5);
  const tkBotE = bottomByEngagement(normalizedTiktokAds, 3);
  const tkTopV = topByVideoViews(normalizedTiktokAds, 5);
  const tkBotV = bottomByVideoViews(normalizedTiktokAds, 3);

  await persistThumbnails(supabase, report_id, [
    { key: "fb_top_reach", posts: fbTopR },
    { key: "fb_improve_reach", posts: fbBotR },
    { key: "fb_top_engagement", posts: fbTopE },
    { key: "fb_improve_engagement", posts: fbBotE },
    { key: "fb_top_video", posts: fbTopV },
    { key: "fb_improve_video", posts: fbBotV },
    { key: "ig_top_reach", posts: igTopR },
    { key: "ig_improve_reach", posts: igBotR },
    { key: "ig_top_engagement", posts: igTopE },
    { key: "ig_improve_engagement", posts: igBotE },
    { key: "ig_top_video", posts: igTopV },
    { key: "ig_improve_video", posts: igBotV },
    { key: "tk_top_reach", posts: tkTopR },
    { key: "tk_improve_reach", posts: tkBotR },
    { key: "tk_top_engagement", posts: tkTopE },
    { key: "tk_improve_engagement", posts: tkBotE },
    { key: "tk_top_video", posts: tkTopV },
    { key: "tk_improve_video", posts: tkBotV },
  ]);

  const structuredInsights = {
    report_period: "yearly",
    executive_summary: aiContent.executive_summary,
    campaign_context,
    goal_fulfillment: aiContent.goal_fulfillment,
    key_metrics: { spend: totalSpend, reach: totalReach, frequency: avgFrequency, currency: "CZK" },
    detail_metrics: { cpm, cpe, cpv: costPerThruplay, currency: "CZK" },
    metrics_over_time: aiContent.metrics_over_time,
    community_management: { answered_comments: null, answered_dms: null, response_rate_24h: null },
    brand_awareness: aiContent.brand_awareness,
    // Facebook
    facebook_metrics: { spend: fbM.spend, reach: fbM.reach, frequency: fbM.frequency },
    facebook_detail_metrics: { cpm: fbM.cpm, cpe: fbM.cpe, cpv: fbM.cpv },
    facebook_metrics_over_time: aiContent.facebook_metrics_over_time || "",
    facebook_top_reach: fbTopR,
    facebook_improve_reach: fbBotR,
    facebook_reach_analysis: aiContent.facebook_reach_analysis || "",
    facebook_top_engagement: fbTopE,
    facebook_improve_engagement: fbBotE,
    facebook_engagement_analysis: aiContent.facebook_engagement_analysis || "",
    facebook_top_video: fbTopV,
    facebook_improve_video: fbBotV,
    facebook_video_analysis: aiContent.facebook_video_analysis || "",
    // Instagram
    instagram_metrics: { spend: igM.spend, reach: igM.reach, frequency: igM.frequency },
    instagram_detail_metrics: { cpm: igM.cpm, cpe: igM.cpe, cpv: igM.cpv },
    instagram_metrics_over_time: aiContent.instagram_metrics_over_time || "",
    instagram_top_reach: igTopR,
    instagram_improve_reach: igBotR,
    instagram_reach_analysis: aiContent.instagram_reach_analysis || "",
    instagram_top_engagement: igTopE,
    instagram_improve_engagement: igBotE,
    instagram_engagement_analysis: aiContent.instagram_engagement_analysis || "",
    instagram_top_video: igTopV,
    instagram_improve_video: igBotV,
    instagram_video_analysis: aiContent.instagram_video_analysis || "",
    // TikTok
    tiktok_metrics: { spend: tkM.spend, reach: tkM.reach, frequency: tkM.frequency },
    tiktok_detail_metrics: { cpm: tkM.cpm, cpe: tkM.cpe, cpv: tkM.cpv },
    tiktok_metrics_over_time: aiContent.tiktok_metrics_over_time || "",
    tiktok_top_reach: tkTopR,
    tiktok_improve_reach: tkBotR,
    tiktok_reach_analysis: aiContent.tiktok_reach_analysis || "",
    tiktok_top_engagement: tkTopE,
    tiktok_improve_engagement: tkBotE,
    tiktok_engagement_analysis: aiContent.tiktok_engagement_analysis || "",
    tiktok_top_video: tkTopV,
    tiktok_improve_video: tkBotV,
    tiktok_video_analysis: aiContent.tiktok_video_analysis || "",
    // Competition
    competition_analysis: aiContent.competition_analysis || "",
    // Summary & Learnings
    followers: { facebook: null, instagram: null, tiktok: null },
    summary_success: aiContent.summary_success,
    summary_events: aiContent.summary_events,
    learnings: aiContent.learnings,
  };

  const { error: updateError } = await supabase
    .from("reports")
    .update({
      ai_insights: aiContent.executive_summary?.media_insight || "",
      ai_insights_structured: structuredInsights,
      ai_insights_context: campaign_context,
    })
    .eq("id", report_id);

  if (updateError) {
    console.error("Error saving insights:", updateError);
    throw new Error("Failed to save insights");
  }

  console.log("Yearly insights saved successfully");

  return new Response(
    JSON.stringify({ structured_data: structuredInsights }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
