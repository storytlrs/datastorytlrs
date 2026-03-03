import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function safeJsonParse(raw: string): any {
  const sanitized = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return JSON.parse(sanitized);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { report_id, campaign_context } = await req.json() as {
      report_id: string;
      campaign_context: CampaignContext;
    };

    console.log("Generating AI insights for report:", report_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch report data
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*, spaces(name)")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      throw new Error("Report not found");
    }

    // Fetch creators
    const { data: creators } = await supabase
      .from("creators")
      .select("*")
      .eq("report_id", report_id);

    // Fetch content
    const { data: content } = await supabase
      .from("content")
      .select("*, creators(handle, avatar_url, platform)")
      .eq("report_id", report_id);

    // Fetch other reports in the same space (same type) for benchmarks
    const { data: spaceReports } = await supabase
      .from("reports")
      .select("id")
      .eq("space_id", report.space_id)
      .eq("type", report.type)
      .neq("id", report_id);

    let benchmarkER = 0;
    let benchmarkVirality = 0;
    let benchmarkTswbCost = 0;
    let benchmarkInteractions = 0;
    let benchmarkCount = 0;

    // Calculate benchmarks per report (not per content item)
    if (spaceReports && spaceReports.length > 0) {
      for (const spaceReport of spaceReports) {
        // Fetch content for this report
        const { data: reportContent } = await supabase
          .from("content")
          .select("engagement_rate, shares, reposts, views, watch_time, likes, comments, saves")
          .eq("report_id", spaceReport.id);

        // Fetch creators for this report (for budget calculation)
        const { data: reportCreators } = await supabase
          .from("creators")
          .select("posts_count, posts_cost, reels_count, reels_cost, stories_count, stories_cost")
          .eq("report_id", spaceReport.id);

        if (reportContent && reportContent.length > 0) {
          // Calculate totals for this report
          let reportER = 0;
          let reportERCount = 0;
          let reportVirality = 0;
          let reportViralityCount = 0;
          let reportInteractions = 0;
          let reportTswb = 0;

          reportContent.forEach((c) => {
            if (c.engagement_rate) {
              reportER += c.engagement_rate;
              reportERCount++;
            }
            const views = c.views || 0;
            const shares = (c.shares || 0) + (c.reposts || 0);
            if (views > 0) {
              reportVirality += (shares / views) * 100;
              reportViralityCount++;
            }
            reportInteractions += (c.likes || 0) + (c.comments || 0) + (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
            reportTswb += (c.watch_time || 0) + ((c.likes || 0) * 3) + ((c.comments || 0) * 5) +
                          (((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10);
          });

          // Calculate budget from creators (planned costs)
          let reportBudget = 0;
          reportCreators?.forEach((c: any) => {
            reportBudget += ((c.posts_count || 0) * (c.posts_cost || 0)) +
                            ((c.reels_count || 0) * (c.reels_cost || 0)) +
                            ((c.stories_count || 0) * (c.stories_cost || 0));
          });

          // Add this report's values to benchmarks
          if (reportERCount > 0) benchmarkER += reportER / reportERCount;
          if (reportViralityCount > 0) benchmarkVirality += reportVirality / reportViralityCount;
          benchmarkInteractions += reportInteractions; // Total interactions for this report
          const reportTswbMinutes = reportTswb / 60;
          if (reportTswbMinutes > 0 && reportBudget > 0) {
            benchmarkTswbCost += reportBudget / reportTswbMinutes;
          }

          benchmarkCount++;
        }
      }

      // Divide by number of reports to get averages
      if (benchmarkCount > 0) {
        benchmarkER /= benchmarkCount;
        benchmarkVirality /= benchmarkCount;
        benchmarkTswbCost /= benchmarkCount;
        benchmarkInteractions /= benchmarkCount;
      }
    }

    // Calculate metrics for current report
    const creatorsCount = creators?.length || 0;
    const contentCount = content?.length || 0;
    let totalViews = 0;
    let totalInteractions = 0;
    let totalTswb = 0;
    let totalER = 0;
    let totalVirality = 0;
    let erCount = 0;
    let viralityCount = 0;
    let sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

    const currency = creators?.[0]?.currency || "CZK";

    // Collect all sentiment summaries for topic extraction
    const allSentimentSummaries: string[] = [];

    content?.forEach((c) => {
      const views = (c.impressions || 0) + (c.views || 0);
      totalViews += views;
      totalInteractions += (c.likes || 0) + (c.comments || 0) + (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
      
      // TSWB calculation
      const tswb = (c.watch_time || 0) + ((c.likes || 0) * 3) + ((c.comments || 0) * 5) + 
                   (((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10);
      totalTswb += tswb;

      if (c.engagement_rate) {
        totalER += c.engagement_rate;
        erCount++;
      }

      const shares = (c.shares || 0) + (c.reposts || 0);
      if (views > 0) {
        totalVirality += (shares / views) * 100;
        viralityCount++;
      }

      if (c.sentiment) {
        sentimentCounts[c.sentiment as keyof typeof sentimentCounts]++;
      }

      if (c.sentiment_summary) {
        allSentimentSummaries.push(c.sentiment_summary);
      }
    });

    // Calculate budget from creators (planned costs) - this matches Overview tab calculation
    let totalBudget = 0;
    creators?.forEach((c: any) => {
      totalBudget += ((c.posts_count || 0) * (c.posts_cost || 0)) +
                     ((c.reels_count || 0) * (c.reels_cost || 0)) +
                     ((c.stories_count || 0) * (c.stories_cost || 0));
    });

    const avgCpm = totalViews > 0 ? (totalBudget / totalViews) * 1000 : 0;
    const avgER = erCount > 0 ? totalER / erCount : 0;
    const avgVirality = viralityCount > 0 ? totalVirality / viralityCount : 0;
    const tswbMinutes = totalTswb / 60;
    const tswbCost = tswbMinutes > 0 ? totalBudget / tswbMinutes : 0;

    // Fallback - use current report data if no other reports exist in space
    const hasBenchmarks = spaceReports && spaceReports.length > 0 && benchmarkCount > 0;
    if (!hasBenchmarks) {
      // Use identical values as the current report
      benchmarkER = avgER;
      benchmarkVirality = avgVirality;
      benchmarkTswbCost = tswbCost;
      benchmarkInteractions = totalInteractions;
    }

    // Calculate KPI Targets from Creators (planned values)
    const calculateKPITargets = () => {
      if (!creators || creators.length === 0) {
        return null;
      }

      let totalPieces = 0;
      let totalExpectedViews = 0;
      let totalCost = 0;
      let totalExpectedInteractions = 0;

      creators.forEach((c) => {
        const pieces = (c.posts_count || 0) + (c.reels_count || 0) + (c.stories_count || 0);
        totalPieces += pieces;
        totalExpectedViews += (c.avg_views || 0) * pieces;
        totalCost += ((c.posts_count || 0) * (c.posts_cost || 0)) +
                     ((c.reels_count || 0) * (c.reels_cost || 0)) +
                     ((c.stories_count || 0) * (c.stories_cost || 0));
        
        // Estimate interactions based on avg_engagement_rate
        if (c.avg_engagement_rate && c.avg_views) {
          totalExpectedInteractions += (c.avg_engagement_rate / 100) * c.avg_views * pieces;
        }
      });

      const avgCpmTarget = totalExpectedViews > 0 ? (totalCost / totalExpectedViews) * 1000 : 0;

      return {
        overview: {
          creators: creators.length,
          content: totalPieces,
          views: totalExpectedViews,
          avgCpm: avgCpmTarget,
        },
        innovation: {
          tswbCost: benchmarkTswbCost || 0,
          interactions: benchmarkInteractions || 0,
          engagementRate: benchmarkER || 0,
          viralityRate: benchmarkVirality || 0,
        },
      };
    };

    const kpiTargets = calculateKPITargets();

    // Determine average sentiment
    const maxSentiment = Object.entries(sentimentCounts).reduce((a, b) => 
      a[1] > b[1] ? a : b
    );
    const avgSentiment = maxSentiment[0] as "positive" | "neutral" | "negative";

    // Sort content by views for top content
    const sortedContent = [...(content || [])].sort((a, b) => {
      const viewsA = (a.impressions || 0) + (a.views || 0);
      const viewsB = (b.impressions || 0) + (b.views || 0);
      return viewsB - viewsA;
    });

    const topContent = sortedContent.slice(0, 5).map((c) => ({
      id: c.id,
      thumbnail_url: c.thumbnail_url,
      content_type: c.content_type,
      platform: c.platform,
      views: (c.impressions || 0) + (c.views || 0),
      engagement_rate: c.engagement_rate || 0,
      url: c.url,
      content_summary: c.content_summary,
      creator_handle: (c.creators as any)?.handle || "unknown",
    }));

    // Build leaderboard - use budget from creators, not content.cost
    const leaderboard = (creators || []).map((creator) => {
      const creatorContent = content?.filter((c) => c.creator_id === creator.id) || [];
      let views = 0;
      let interactions = 0;
      let er = 0;
      let erC = 0;
      let virality = 0;
      let viralityC = 0;
      let creatorTswb = 0;

      creatorContent.forEach((c) => {
        const v = (c.impressions || 0) + (c.views || 0);
        views += v;
        interactions += (c.likes || 0) + (c.comments || 0) + (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
        if (c.engagement_rate) {
          er += c.engagement_rate;
          erC++;
        }
        const shares = (c.shares || 0) + (c.reposts || 0);
        if (v > 0) {
          virality += (shares / v) * 100;
          viralityC++;
        }
        creatorTswb += (c.watch_time || 0) + ((c.likes || 0) * 3) + ((c.comments || 0) * 5) + 
                       (((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10);
      });

      // Calculate budget for this creator
      const creatorBudget = ((creator.posts_count || 0) * (creator.posts_cost || 0)) +
                            ((creator.reels_count || 0) * (creator.reels_cost || 0)) +
                            ((creator.stories_count || 0) * (creator.stories_cost || 0));

      const creatorTswbMinutes = creatorTswb / 60;
      const creatorTswbCost = creatorTswbMinutes > 0 ? creatorBudget / creatorTswbMinutes : 0;

      return {
        handle: creator.handle,
        avatarUrl: creator.avatar_url,
        platform: creator.platform,
        views,
        interactions,
        engagementRate: erC > 0 ? er / erC : 0,
        viralityRate: viralityC > 0 ? virality / viralityC : 0,
        tswbCost: creatorTswbCost,
        currency: creator.currency || "CZK",
      };
    });

    // Build creator performance with enhanced data
    const creatorPerformance = (creators || []).map((creator) => {
      const creatorContent = content?.filter((c) => c.creator_id === creator.id) || [];
      
      // Get unique platforms from content
      const platforms = [...new Set(creatorContent.map((c) => c.platform))];
      
      const topCreatorContent = [...creatorContent].sort((a, b) => {
        const viewsA = (a.impressions || 0) + (a.views || 0);
        const viewsB = (b.impressions || 0) + (b.views || 0);
        return viewsB - viewsA;
      })[0];

      // Calculate sentiment breakdown
      const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
      creatorContent.forEach((c) => {
        if (c.sentiment) {
          sentimentBreakdown[c.sentiment as keyof typeof sentimentBreakdown]++;
        }
      });
      const totalSentiments = creatorContent.length || 1;
      const sentimentPercentages = {
        positive: Math.round((sentimentBreakdown.positive / totalSentiments) * 100),
        neutral: Math.round((sentimentBreakdown.neutral / totalSentiments) * 100),
        negative: Math.round((sentimentBreakdown.negative / totalSentiments) * 100),
      };

      // Collect sentiment summaries for this creator
      const creatorSentimentSummaries = creatorContent
        .map((c) => c.sentiment_summary)
        .filter(Boolean);

      return {
        handle: creator.handle,
        avatar_url: creator.avatar_url,
        platforms: platforms.length > 0 ? platforms : [creator.platform],
        top_content: topCreatorContent ? {
          id: topCreatorContent.id,
          thumbnail_url: topCreatorContent.thumbnail_url,
          content_type: topCreatorContent.content_type,
          platform: topCreatorContent.platform,
          views: (topCreatorContent.impressions || 0) + (topCreatorContent.views || 0),
          engagement_rate: topCreatorContent.engagement_rate || 0,
          url: topCreatorContent.url,
          content_summary: topCreatorContent.content_summary,
          creator_handle: creator.handle,
        } : null,
        sentiment_breakdown: sentimentPercentages,
        relevance: "medium" as const, // Will be updated by AI
        key_insight: "", // Will be generated by AI
        positive_topics: [] as string[], // Will be generated by AI
        negative_topics: [] as string[], // Will be generated by AI
        _sentiment_summaries: creatorSentimentSummaries, // For AI processing
      };
    });

    // Generate AI content with enhanced prompt
const systemPrompt = `Jsi analytik influencer marketingu. Na základě dat z kampaně a kontextu od uživatele vytvoř strukturovaný report v češtině.

Tvým úkolem je vytvořit stručné, ale výstižné analytické texty pro jednotlivé sekce reportu. Piš profesionálně, ale přístupně.

Pro výpočet relevance (0-100%):
- Analyzuj témata v komentářích daného creatora
- Spočítej poměr témat týkajících se brandu/produktu/kampaně vs. off-topic témat (životní styl, osobní komentáře, etc.)
- 100% = všechny komentáře jsou relevantní k brandu
- 50% = polovina témat je o brandu, polovina off-topic
- 0% = žádné komentáře se netýkají brandu

Data kampaně:
- Počet creatorů: ${creatorsCount}
- Počet content pieces: ${contentCount}
- Celkem views: ${totalViews}
- Celkový budget: ${totalBudget} ${currency}
- Průměrný CPM: ${avgCpm.toFixed(2)} ${currency}
- Celkové interakce: ${totalInteractions}
- Průměrný ER: ${avgER.toFixed(2)}%
- Průměrná viralita: ${avgVirality.toFixed(2)}%
- TSWB Cost per minute: ${tswbCost.toFixed(2)} ${currency}
- Průměrný sentiment: ${avgSentiment}

Kontext od uživatele:
- Hlavní cíl: ${campaign_context.mainGoal}
- Co udělali: ${campaign_context.actions}
- Co se povedlo: ${campaign_context.highlights}

Sentiment summaries z contentu (pro extrakci témat):
${allSentimentSummaries.slice(0, 20).join("\n")}

Creatori a jejich sentiment summaries:
${creatorPerformance.map(c => `@${c.handle}: ${(c as any)._sentiment_summaries?.slice(0, 3).join("; ") || "No data"}`).join("\n")}`;

    const userPrompt = `Vytvoř analytický obsah pro influencer report. Odpověz ve formátu JSON s následující strukturou:

{
  "executive_summary": "Jeden odstavec shrnující zásadní informace o kampani (max 150 slov)",
  "overview_paragraph": "Jeden odstavec hodnotící výsledky z pohledu efektivity a dosahu (max 100 slov)",
  "innovation_paragraph": "Jeden odstavec hodnotící TSWB, virality rate a kvalitu interakcí (max 100 slov)",
  "sentiment_paragraph": "Jeden odstavec o klíčových tématech a sentimentu v komentářích (max 100 slov)",
  "top_sentiment_topics": ["5 nejčastějších témat zmiňovaných v komentářích - krátká slova/fráze"],
  "creator_insights": [
    {
      "handle": "creator_handle",
      "relevance": 75,
      "key_insight": "Klíčový insight o tomto creatorovi (1-2 věty)",
      "positive_topics": ["max 3 pozitivní témata"],
      "negative_topics": ["max 3 negativní témata"]
    }
  ],
  "recommendations": {
    "works": ["3-5 bodů co funguje dobře"],
    "doesnt_work": ["2-4 body co nefunguje nebo má prostor ke zlepšení"],
    "suggestions": ["3-5 konkrétních doporučení pro budoucí kampaně"]
  }
}

Pro creator_insights vytvoř entry pro každého z těchto creatorů: ${creatorPerformance.map(c => c.handle).join(", ")}`;

    console.log("Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiContent = safeJsonParse(aiData.choices[0].message.content);

    console.log("AI content generated successfully");

    // Merge AI insights into creator performance
    const enhancedCreatorPerformance = creatorPerformance.map((creator) => {
      const normalizeHandle = (h: string) => h.replace(/^@/, '').toLowerCase();
      const aiInsight = aiContent.creator_insights?.find(
        (i: any) => normalizeHandle(i.handle) === normalizeHandle(creator.handle)
      );
      
      // Remove internal field
      const { _sentiment_summaries, ...cleanCreator } = creator as any;
      
      return {
        ...cleanCreator,
        relevance: typeof aiInsight?.relevance === "number" ? aiInsight.relevance : 50,
        key_insight: aiInsight?.key_insight || "",
        positive_topics: aiInsight?.positive_topics || [],
        negative_topics: aiInsight?.negative_topics || [],
      };
    });

    // Build structured insights
    const structuredInsights = {
      executive_summary: aiContent.executive_summary,
      campaign_context,
      top_content: topContent,
      overview_metrics: {
        creators: creatorsCount,
        content: contentCount,
        views: totalViews,
        avgCpm,
        currency,
      },
      innovation_metrics: {
        tswbCost,
        interactions: totalInteractions,
        engagementRate: avgER,
        viralityRate: avgVirality,
        tswb: totalTswb,
        currency,
      },
      kpi_targets: kpiTargets,
      sentiment_analysis: {
        average: avgSentiment,
        summary: aiContent.sentiment_paragraph,
      },
      top_sentiment_topics: aiContent.top_sentiment_topics || [],
      leaderboard,
      benchmarks: {
        engagementRate: benchmarkER,
        viralityRate: benchmarkVirality,
        tswbCost: benchmarkTswbCost,
        interactions: benchmarkInteractions,
      },
      creator_performance: enhancedCreatorPerformance,
      recommendations: aiContent.recommendations,
      overview_summary: aiContent.overview_paragraph,
      innovation_summary: aiContent.innovation_paragraph,
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

    console.log("Insights saved successfully");

    return new Response(
      JSON.stringify({
        structured_data: structuredInsights,
        overview_paragraph: aiContent.overview_paragraph,
        innovation_paragraph: aiContent.innovation_paragraph,
        sentiment_paragraph: aiContent.sentiment_paragraph,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
