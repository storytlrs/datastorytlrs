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

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, spaces(name)")
      .eq("id", report_id)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    // Fetch all ads data in parallel
    const [campaignMetaRes, adSetsRes, adsRes] = await Promise.all([
      supabase.from("campaign_meta").select("*").eq("report_id", report_id),
      supabase.from("ad_sets").select("*").eq("report_id", report_id),
      supabase.from("ads").select("*").eq("report_id", report_id),
    ]);

    const campaignMeta = campaignMetaRes.data || [];
    const adSets = adSetsRes.data || [];
    const ads = adsRes.data || [];

    // Calculate aggregated metrics
    const allData = [...campaignMeta];
    // If no campaign_meta, use ad_sets as fallback
    const metricsSource = allData.length > 0 ? allData : adSets;

    const totalSpend = metricsSource.reduce((s, d) => s + (d.amount_spent || 0), 0);
    const totalReach = metricsSource.reduce((s, d) => s + (d.reach || 0), 0);
    const totalImpressions = metricsSource.reduce((s, d) => s + (d.impressions || 0), 0);
    const totalThruplays = metricsSource.reduce((s, d) => s + (d.thruplays || 0), 0);
    const total3sViews = metricsSource.reduce((s, d) => s + (d.video_3s_plays || 0), 0);
    const totalLinkClicks = metricsSource.reduce((s, d) => s + (d.link_clicks || 0), 0);
    const totalReactions = metricsSource.reduce((s, d) => s + (d.post_reactions || 0), 0);
    const totalComments = metricsSource.reduce((s, d) => s + (d.post_comments || 0), 0);
    const totalShares = metricsSource.reduce((s, d) => s + (d.post_shares || 0), 0);
    const totalSaves = metricsSource.reduce((s, d) => s + (d.post_saves || 0), 0);
    const totalInteractions = totalReactions + totalComments + totalShares + totalSaves;

    const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    const ctr = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0;
    const engagementRate = totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0;
    const thruplayRate = totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0;
    const viewRate3s = totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0;
    const costPerThruplay = totalThruplays > 0 ? totalSpend / totalThruplays : 0;
    const costPer3sView = total3sViews > 0 ? totalSpend / total3sViews : 0;
    const cpe = totalInteractions > 0 ? totalSpend / totalInteractions : 0;

    // Benchmarks from other ads reports in same space
    const { data: spaceReports } = await supabase
      .from("reports")
      .select("id")
      .eq("space_id", report.space_id)
      .eq("type", "ads")
      .neq("id", report_id);

    let benchmarkCPM = 0;
    let benchmarkCPC = 0;
    let benchmarkCTR = 0;
    let benchmarkER = 0;
    let benchmarkCount = 0;

    if (spaceReports && spaceReports.length > 0) {
      for (const sr of spaceReports) {
        const { data: srData } = await supabase
          .from("campaign_meta")
          .select("amount_spent, impressions, link_clicks, post_reactions, post_comments, post_shares, post_saves")
          .eq("report_id", sr.id);

        if (srData && srData.length > 0) {
          const imp = srData.reduce((s: number, d: any) => s + (d.impressions || 0), 0);
          const spend = srData.reduce((s: number, d: any) => s + (d.amount_spent || 0), 0);
          const clicks = srData.reduce((s: number, d: any) => s + (d.link_clicks || 0), 0);
          const inter = srData.reduce((s: number, d: any) => s + (d.post_reactions || 0) + (d.post_comments || 0) + (d.post_shares || 0) + (d.post_saves || 0), 0);

          if (imp > 0) {
            benchmarkCPM += (spend / imp) * 1000;
            benchmarkCTR += (clicks / imp) * 100;
            benchmarkER += (inter / imp) * 100;
          }
          if (clicks > 0) benchmarkCPC += spend / clicks;
          benchmarkCount++;
        }
      }
      if (benchmarkCount > 0) {
        benchmarkCPM /= benchmarkCount;
        benchmarkCPC /= benchmarkCount;
        benchmarkCTR /= benchmarkCount;
        benchmarkER /= benchmarkCount;
      }
    }

    if (benchmarkCount === 0) {
      benchmarkCPM = cpm;
      benchmarkCPC = cpc;
      benchmarkCTR = ctr;
      benchmarkER = engagementRate;
    }

    // Top ad sets by spend
    const topAdSets = [...adSets]
      .sort((a, b) => (b.amount_spent || 0) - (a.amount_spent || 0))
      .slice(0, 5)
      .map((as) => ({
        name: as.ad_name || "Unnamed",
        platform: as.platform,
        spend: as.amount_spent || 0,
        impressions: as.impressions || 0,
        clicks: as.link_clicks || 0,
        ctr: as.ctr || 0,
      }));

    // Campaign list summary
    const campaignSummary = campaignMeta
      .map((cm) => `${cm.campaign_name || "Unnamed"}: Spend ${cm.amount_spent}, Impr ${cm.impressions}, Clicks ${cm.link_clicks}`)
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
- Počet kampaní: ${campaignMeta.length}
- Počet ad setů: ${adSets.length}
- Počet reklam: ${ads.length}

Kampaně:
${campaignSummary}

Top 5 Ad Sets:
${topAdSets.map((a) => `${a.name}: Spend ${a.spend}, Impr ${a.impressions}, Clicks ${a.clicks}, CTR ${a.ctr}%`).join("\n")}

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

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiContent = JSON.parse(aiData.choices[0].message.content);

    console.log("Ads AI content generated successfully");

    const structuredInsights = {
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
      benchmarks: {
        cpm: benchmarkCPM,
        cpc: benchmarkCPC,
        ctr: benchmarkCTR,
        engagementRate: benchmarkER,
      },
      top_ad_sets: topAdSets,
      campaign_count: campaignMeta.length,
      ad_set_count: adSets.length,
      ad_count: ads.length,
      awareness_summary: aiContent.awareness_summary,
      engagement_summary: aiContent.engagement_summary,
      effectiveness_summary: aiContent.effectiveness_summary,
      recommendations: aiContent.recommendations,
    };

    // Save to database
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
  } catch (error) {
    console.error("Error generating Ads AI insights:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
