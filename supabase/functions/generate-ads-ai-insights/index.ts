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

    // Fetch linked campaign IDs for this report
    const { data: links } = await supabase
      .from("report_campaigns")
      .select("brand_campaign_id")
      .eq("report_id", report_id);

    const linkedCampaignIds = (links || []).map((l: any) => l.brand_campaign_id);

    if (linkedCampaignIds.length === 0) {
      throw new Error("No campaigns linked to this report. Please select campaigns first.");
    }

    // Fetch only linked campaigns
    const { data: campaigns = [] } = await supabase
      .from("brand_campaigns")
      .select("*")
      .in("id", linkedCampaignIds);

    // Fetch ad sets belonging to linked campaigns
    const { data: adSets = [] } = await supabase
      .from("brand_ad_sets")
      .select("*")
      .eq("space_id", spaceId)
      .in("brand_campaign_id", linkedCampaignIds);

    const adSetIds = (adSets || []).map((as: any) => as.id);

    // Fetch ads belonging to those ad sets
    const { data: ads = [] } = await supabase
      .from("brand_ads")
      .select("*")
      .eq("space_id", spaceId)
      .in("brand_ad_set_id", adSetIds.length > 0 ? adSetIds : ["__none__"]);

    // Calculate aggregated metrics
    const metricsSource = campaigns.length > 0 ? campaigns : adSets;
    const totalSpend = metricsSource.reduce((s: number, d: any) => s + (d.amount_spent || 0), 0);
    const totalReach = metricsSource.reduce((s: number, d: any) => s + (d.reach || 0), 0);
    const totalImpressions = metricsSource.reduce((s: number, d: any) => s + (d.impressions || 0), 0);
    const totalClicks = metricsSource.reduce((s: number, d: any) => s + (d.clicks || 0), 0);

    const detailSource = ads.length > 0 ? ads : adSets;
    const totalThruplays = detailSource.reduce((s: number, d: any) => s + (d.thruplays || 0), 0);
    const total3sViews = detailSource.reduce((s: number, d: any) => s + (d.video_3s_plays || 0), 0);
    const totalReactions = detailSource.reduce((s: number, d: any) => s + (d.post_reactions || 0), 0);
    const totalComments = detailSource.reduce((s: number, d: any) => s + (d.post_comments || 0), 0);
    const totalShares = detailSource.reduce((s: number, d: any) => s + (d.post_shares || 0), 0);
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

    // Route based on period
    if (period === "monthly") {
      return await handleMonthlyReport({
        supabase, report_id, campaign_context, lovableApiKey,
        campaigns, adSets, ads,
        totalSpend, totalReach, totalImpressions, totalClicks,
        totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
        totalReactions, totalComments, totalShares, totalSaves,
        avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
        cpm, cpc, costPerThruplay, costPer3sView, cpe,
      });
    }

    // Default: campaign/quarterly/yearly (original logic)
    return await handleDefaultReport({
      supabase, report_id, campaign_context, lovableApiKey,
      campaigns, adSets, ads,
      totalSpend, totalReach, totalImpressions, totalClicks,
      totalThruplays, total3sViews, totalLinkClicks, totalInteractions,
      totalReactions, totalComments, totalShares, totalSaves,
      avgFrequency, ctr, engagementRate, thruplayRate, viewRate3s,
      cpm, cpc, costPerThruplay, costPer3sView, cpe,
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

  const calcPlatformMetrics = (platformAds: any[]) => {
    const spend = platformAds.reduce((s: number, a: any) => s + (a.amount_spent || 0), 0);
    const reach = platformAds.reduce((s: number, a: any) => s + (a.reach || 0), 0);
    const impr = platformAds.reduce((s: number, a: any) => s + (a.impressions || 0), 0);
    return { spend, reach, frequency: reach > 0 ? impr / reach : 0 };
  };

  const fbMetrics = calcPlatformMetrics(fbAds);
  const igMetrics = calcPlatformMetrics(igAds);

  const topBySpend = (arr: any[], count: number) =>
    [...arr].sort((a, b) => (b.amount_spent || 0) - (a.amount_spent || 0)).slice(0, count).map((a: any) => ({
      name: a.ad_name || "Unnamed",
      spend: a.amount_spent || 0,
      impressions: a.impressions || 0,
      clicks: a.clicks || 0,
      ctr: a.ctr || 0,
      thumbnail_url: a.thumbnail_url || null,
    }));

  const fbTopPosts = topBySpend(fbAds, 5);
  const igTopPosts = topBySpend(igAds, 5);

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

  const systemPrompt = `Jsi zkušený analytik digitálního marketingu. Tvým úkolem je vytvořit kompletní měsíční report výkonu reklamních kampaní v češtině. Report musí být profesionální, datově podložený a obsahovat konkrétní čísla.

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

KONTEXT OD UŽIVATELE:
- Hlavní cíl kampaně: ${campaign_context.mainGoal}
- Co bylo realizováno: ${campaign_context.actions}
- Co se povedlo / highlight: ${campaign_context.highlights}

INSTRUKCE:
1. Executive Summary: Stručný ale výstižný souhrn celého měsíce – klíčové výsledky, spend, reach, co se povedlo.
2. Plnění cílů: Porovnej cíle uživatele (mainGoal) s reálnými daty. Splnilo se to? Jak moc? Buď konkrétní s čísly.
3. Vývoj metrik v čase: Na základě dostupných dat popiš trendy a vývoj – které metriky rostly, které klesaly, co je stabilní. Zmiň konkrétní hodnoty.
4. Vliv na brand awareness: Analyzuj dopad na povědomí o značce – reach, frequency, impressions, ThruPlays. Jaký je celkový dopad?
5. Learnings: Rozděl do 3 kategorií – co se povedlo (works), hrozby a příležitosti (threats_opportunities), co zlepšit (improvements). Buď konkrétní a akční.`;

  const userPrompt = `Vytvoř kompletní měsíční analytický report. Odpověz POUZE validním JSON objektem s touto přesnou strukturou:

{
  "executive_summary": "Kompletní souhrn měsíce s konkrétními čísly – spend, reach, klíčové výsledky, celkové zhodnocení efektivity (max 200 slov)",
  "goal_fulfillment": "Detailní porovnání stanovených cílů s dosaženými výsledky. Použij konkrétní data a procenta. Zhodnoť míru splnění (max 150 slov)",
  "metrics_over_time": "Popis vývoje a trendů klíčových metrik (spend, reach, frequency, CTR, engagement) během měsíce. Zmiň co rostlo, co klesalo, co bylo stabilní (max 150 slov)",
  "brand_awareness": "Analýza vlivu kampaní na brand awareness – kolik lidí bylo osloveno, jak často, jaký je dopad na povědomí o značce. Porovnej FB vs IG pokud jsou data (max 150 slov)",
  "learnings": {
    "works": ["3-5 konkrétních bodů co funguje dobře, s čísly kde to dává smysl"],
    "threats_opportunities": ["2-4 body – identifikuj hrozby (vysoká frekvence, nízký CTR apod.) a příležitosti (dobře fungující formáty, segmenty)"],
    "improvements": ["3-5 akčních doporučení co konkrétně zlepšit v dalším měsíci"]
  }
}`;

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
- Co se povedlo: ${campaign_context.highlights}`;

  const userPrompt = `Vytvoř analytický obsah pro Ads Campaign report. Odpověz ve formátu JSON s následující strukturou:

{
  "executive_summary": "Jeden odstavec shrnující zásadní informace o kampani (max 150 slov)",
  "awareness_summary": "Jeden odstavec hodnotící výsledky z pohledu dosahu a povědomí (max 100 slov)",
  "engagement_summary": "Jeden odstavec hodnotící zapojení a interakce uživatelů (max 100 slov)",
  "effectiveness_summary": "Jeden odstavec hodnotící nákladovou efektivitu kampaně (max 100 slov)",
  "recommendations": {
    "works": ["3-5 bodů co funguje dobře"],
    "doesnt_work": ["2-4 body co nefunguje nebo má prostor ke zlepšení"],
    "suggestions": ["3-5 konkrétních doporučení pro optimalizaci"]
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
