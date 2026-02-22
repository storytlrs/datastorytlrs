import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { space_id, trigger = "manual" } = await req.json();
    if (!space_id) {
      return new Response(JSON.stringify({ error: "space_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active reports for this space
    const { data: reports } = await supabase
      .from("reports")
      .select("id, name, type, status, start_date, end_date, period")
      .eq("space_id", space_id)
      .eq("status", "active");

    const reportIds = (reports || []).map((r: any) => r.id);

    // Fetch aggregated data in parallel
    const [
      contentResult,
      creatorsResult,
      campaignsResult,
      tiktokCampaignsResult,
      promoCodesResult,
      kpiTargetsResult,
    ] = await Promise.all([
      reportIds.length > 0
        ? supabase
            .from("content")
            .select(
              "id, content_type, platform, views, impressions, likes, comments, shares, saves, reposts, engagement_rate, reach, url, thumbnail_url, creator_id, report_id, published_date, cost, cpm, cpv, watch_time, avg_watch_time, sentiment"
            )
            .in("report_id", reportIds)
            .limit(500)
        : { data: [] },
      reportIds.length > 0
        ? supabase
            .from("creators")
            .select(
              "id, handle, platform, followers, avg_engagement_rate, avg_reach, avg_views, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost, avatar_url, report_id"
            )
            .in("report_id", reportIds)
            .limit(200)
        : { data: [] },
      supabase
        .from("brand_campaigns")
        .select(
          "id, campaign_name, amount_spent, reach, impressions, clicks, cpc, cpm, ctr, status"
        )
        .eq("space_id", space_id)
        .eq("age", "")
        .eq("gender", "")
        .limit(100),
      supabase
        .from("tiktok_campaigns")
        .select(
          "id, campaign_name, amount_spent, reach, impressions, clicks, cpc, cpm, ctr, status"
        )
        .eq("space_id", space_id)
        .eq("age", "")
        .eq("gender", "")
        .eq("location", "")
        .limit(100),
      reportIds.length > 0
        ? supabase
            .from("promo_codes")
            .select("id, code, clicks, purchases, revenue, conversion_rate, creator_id, report_id")
            .in("report_id", reportIds)
            .limit(100)
        : { data: [] },
      reportIds.length > 0
        ? supabase
            .from("kpi_targets")
            .select("id, report_id, kpi_name, planned_value, actual_value, unit")
            .in("report_id", reportIds)
            .limit(200)
        : { data: [] },
    ]);

    const content = contentResult.data || [];
    const creators = creatorsResult.data || [];
    const campaigns = campaignsResult.data || [];
    const tiktokCampaigns = tiktokCampaignsResult.data || [];
    const promoCodes = promoCodesResult.data || [];
    const kpiTargets = kpiTargetsResult.data || [];

    // === TSWB calculation helper ===
    const calcTSWB = (items: any[]) => {
      return items.reduce((sum: number, c: any) => {
        return sum + (c.watch_time || 0) + (c.likes || 0) * 3 + (c.comments || 0) * 5 + ((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10;
      }, 0);
    };

    // === Per-report breakdown ===
    const reportBreakdowns = (reports || []).map((r: any) => {
      const reportContent = content.filter((c: any) => c.report_id === r.id);
      const reportCreators = creators.filter((c: any) => c.report_id === r.id);
      const reportKPIs = kpiTargets.filter((k: any) => k.report_id === r.id);

      const totalViews = reportContent.reduce((s: number, c: any) => s + (c.views || 0), 0);
      const totalCost = reportContent.reduce((s: number, c: any) => s + (c.cost || 0), 0);
      const avgER = reportContent.length > 0
        ? reportContent.reduce((s: number, c: any) => s + (c.engagement_rate || 0), 0) / reportContent.length
        : 0;
      const totalWatchTime = reportContent.reduce((s: number, c: any) => s + (c.watch_time || 0), 0);
      const tswb = calcTSWB(reportContent);
      const tswbMinutes = tswb / 60;
      const tswbCost = tswbMinutes > 0 ? totalCost / tswbMinutes : null;

      // Sentiment breakdown
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      reportContent.forEach((c: any) => {
        if (c.sentiment && sentimentCounts[c.sentiment as keyof typeof sentimentCounts] !== undefined) {
          sentimentCounts[c.sentiment as keyof typeof sentimentCounts]++;
        }
      });

      // Creator planned budget for this report
      const plannedBudget = reportCreators.reduce((s: number, cr: any) => {
        return s + (cr.posts_cost || 0) + (cr.reels_cost || 0) + (cr.stories_cost || 0);
      }, 0);

      return {
        name: r.name,
        type: r.type,
        period: r.period,
        start_date: r.start_date,
        end_date: r.end_date,
        content_count: reportContent.length,
        creators_count: reportCreators.length,
        total_views: totalViews,
        avg_engagement_rate: Math.round(avgER * 100) / 100,
        total_cost: totalCost,
        planned_budget: plannedBudget,
        total_watch_time_seconds: totalWatchTime,
        tswb,
        tswb_cost: tswbCost ? Math.round(tswbCost * 100) / 100 : null,
        sentiment: sentimentCounts,
        kpi_targets: reportKPIs.map((k: any) => ({
          kpi_name: k.kpi_name,
          planned_value: k.planned_value,
          actual_value: k.actual_value,
          unit: k.unit,
        })),
      };
    });

    // === Per-creator stats ===
    const creatorStats = creators.map((cr: any) => {
      const report = (reports || []).find((r: any) => r.id === cr.report_id);
      const creatorContent = content.filter((c: any) => c.creator_id === cr.id && c.report_id === cr.report_id);
      const totalViews = creatorContent.reduce((s: number, c: any) => s + (c.views || 0), 0);
      const totalCost = creatorContent.reduce((s: number, c: any) => s + (c.cost || 0), 0);
      const avgER = creatorContent.length > 0
        ? creatorContent.reduce((s: number, c: any) => s + (c.engagement_rate || 0), 0) / creatorContent.length
        : cr.avg_engagement_rate || 0;
      const tswb = calcTSWB(creatorContent);

      return {
        handle: cr.handle,
        platform: cr.platform,
        followers: cr.followers,
        report_name: report?.name || "Unknown",
        content_count: creatorContent.length,
        total_views: totalViews,
        total_cost: totalCost,
        avg_engagement_rate: Math.round(avgER * 100) / 100,
        tswb,
      };
    });

    // === Per-campaign stats ===
    const campaignStats = [...campaigns, ...tiktokCampaigns].map((c: any) => ({
      campaign_name: c.campaign_name,
      platform: campaigns.includes(c) ? "meta" : "tiktok",
      amount_spent: c.amount_spent,
      impressions: c.impressions,
      reach: c.reach,
      clicks: c.clicks,
      cpm: c.cpm,
      ctr: c.ctr,
      status: c.status,
    }));

    // === Global aggregates ===
    const totalContent = content.length;
    const totalViews = content.reduce((s: number, c: any) => s + (c.views || 0), 0);
    const totalCost = content.reduce((s: number, c: any) => s + (c.cost || 0), 0);
    const avgEngagement = content.length > 0
      ? content.reduce((s: number, c: any) => s + (c.engagement_rate || 0), 0) / content.length
      : 0;
    const globalTSWB = calcTSWB(content);
    const globalTSWBMinutes = globalTSWB / 60;
    const globalTSWBCost = globalTSWBMinutes > 0 ? totalCost / globalTSWBMinutes : null;
    const totalWatchTime = content.reduce((s: number, c: any) => s + (c.watch_time || 0), 0);

    const globalSentiment = { positive: 0, negative: 0, neutral: 0 };
    content.forEach((c: any) => {
      if (c.sentiment && globalSentiment[c.sentiment as keyof typeof globalSentiment] !== undefined) {
        globalSentiment[c.sentiment as keyof typeof globalSentiment]++;
      }
    });

    const totalAdSpend = [...campaigns, ...tiktokCampaigns].reduce(
      (s: number, c: any) => s + (c.amount_spent || 0), 0
    );

    // Top content by views
    const topContent = [...content]
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((c: any) => {
        const creator = creators.find((cr: any) => cr.id === c.creator_id);
        const report = (reports || []).find((r: any) => r.id === c.report_id);
        return {
          views: c.views,
          likes: c.likes,
          comments: c.comments,
          engagement_rate: c.engagement_rate,
          platform: c.platform,
          content_type: c.content_type,
          thumbnail_url: c.thumbnail_url,
          url: c.url,
          creator_handle: creator?.handle || "Unknown",
          report_name: report?.name || "Unknown",
        };
      });

    // Platform breakdown
    const platformBreakdown: Record<string, { count: number; views: number; avg_er: number }> = {};
    content.forEach((c: any) => {
      if (!platformBreakdown[c.platform]) {
        platformBreakdown[c.platform] = { count: 0, views: 0, avg_er: 0 };
      }
      platformBreakdown[c.platform].count++;
      platformBreakdown[c.platform].views += c.views || 0;
      platformBreakdown[c.platform].avg_er += c.engagement_rate || 0;
    });
    Object.keys(platformBreakdown).forEach((p) => {
      if (platformBreakdown[p].count > 0) {
        platformBreakdown[p].avg_er = Math.round((platformBreakdown[p].avg_er / platformBreakdown[p].count) * 100) / 100;
      }
    });

    const totalRevenue = promoCodes.reduce((s: number, p: any) => s + (p.revenue || 0), 0);
    const totalPurchases = promoCodes.reduce((s: number, p: any) => s + (p.purchases || 0), 0);

    const dataContext = {
      reports_count: reports?.length || 0,
      reports: reportBreakdowns,
      global_summary: {
        total_content: totalContent,
        total_views: totalViews,
        total_cost: totalCost,
        avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
        total_watch_time_seconds: totalWatchTime,
        tswb: globalTSWB,
        tswb_cost: globalTSWBCost ? Math.round(globalTSWBCost * 100) / 100 : null,
        sentiment: globalSentiment,
        total_creators: creators.length,
        total_ad_spend: totalAdSpend,
        meta_campaigns_count: campaigns.length,
        tiktok_campaigns_count: tiktokCampaigns.length,
      },
      creator_stats: creatorStats,
      campaign_stats: campaignStats,
      top_content: topContent,
      platform_breakdown: platformBreakdown,
      promo_summary: {
        total_revenue: totalRevenue,
        total_purchases: totalPurchases,
        total_codes: promoCodes.length,
      },
    };

    // Call Lovable AI with tool calling
    const systemPrompt = `Jsi expert na analýzu influencer marketingu a sociálních sítí. Generuješ přehledové dlaždice (tiles) pro dashboard brandu. Tvým cílem je poskytnout "big picture" přehled aktivit a výsledků.

PRAVIDLA:
1. Každá dlaždice MUSÍ obsahovat konkrétní čísla, názvy reportů/kampaní/creatorů a období. Žádné obecné fráze.
2. U metrik vždy uveď srovnání: např. "nejlepší report X dosáhl Y, průměr je Z" nebo "o X% nad průměrem".
3. Prioritní metriky: Views, Engagement Rate, CPM, TSWB Cost, Sentiment.
4. PRVNÍ dlaždice (priority 1) MUSÍ být typu "text", size "large" — přehled všech aktivit: kolik reportů, kolik creatorů, kolik kampaní, celkový budget, období.
5. Zohledni KPI cíle (pokud existují) — prioritizuj dlaždice podle plnění/neplnění cílů. Pokud cíl nebyl splněn, zvýrazni to.
6. Používej různé velikosti: "small" pro jednoduché metriky, "medium" pro grafy a content preview, "large" pro textová shrnutí nebo důležité grafy.
7. Buď profesionální, stručný a srozumitelný. Každý text musí mít jasný informační přínos.
8. Pro metrické dlaždice uveď v poli "benchmark" srovnávací údaj (např. "Průměr: 5.2%", "Nejhorší: 1.1K").
9. Identifikuj nejlepšího influencera (podle TSWB nebo ER) a nejlepší kampaň (podle CPM nebo CTR).
10. Pokud existují výjimečné výsledky (outliers), vytvoř pro ně dedikovanou dlaždici.

TSWB = watch_time + likes*3 + comments*5 + (saves+shares+reposts)*10
TSWB Cost = celkový náklad / TSWB v minutách

Používej český jazyk. Používej standardní zkratky (CPM, CPC, CTR, ER, TSWB).`;

    const userPrompt = `Data brandu napříč ${dataContext.reports_count} aktivními reporty:\n\n${JSON.stringify(dataContext, null, 2)}\n\nVygeneruj max 9 dlaždic. Začni přehledem aktivit (text, large), pak nejdůležitější metriky s benchmarky, top performer, a případné problémy/doporučení.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_insight_tiles",
                description:
                  "Generate an array of insight tiles for the brand dashboard.",
                parameters: {
                  type: "object",
                  properties: {
                    tiles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: ["metric", "chart", "content_preview", "text"],
                          },
                          title: { type: "string" },
                          value: { type: "string" },
                          subtitle: { type: "string" },
                          benchmark: { type: "string" },
                          size: {
                            type: "string",
                            enum: ["small", "medium", "large"],
                          },
                          accent_color: {
                            type: "string",
                            enum: ["default", "orange", "green", "blue"],
                          },
                          chart_data: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                value: { type: "number" },
                              },
                              required: ["name", "value"],
                              additionalProperties: false,
                            },
                          },
                          chart_type: {
                            type: "string",
                            enum: ["bar", "line", "pie"],
                          },
                          content: {
                            type: "object",
                            properties: {
                              thumbnail_url: { type: "string" },
                              url: { type: "string" },
                              views: { type: "number" },
                              likes: { type: "number" },
                              comments: { type: "number" },
                              engagement_rate: { type: "number" },
                              platform: { type: "string" },
                              content_type: { type: "string" },
                              creator_handle: { type: "string" },
                            },
                            required: ["views", "platform", "creator_handle"],
                            additionalProperties: false,
                          },
                          text: { type: "string" },
                          source_report_id: { type: "string" },
                          priority: { type: "number" },
                        },
                        required: ["type", "title", "priority", "size"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["tiles"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "generate_insight_tiles" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let tiles: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        tiles = parsed.tiles || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    // Sort by priority and limit to 9
    tiles = tiles
      .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99))
      .slice(0, 9);

    // Upsert into space_ai_insights
    const { error: upsertError } = await supabase
      .from("space_ai_insights")
      .upsert(
        {
          space_id,
          tiles,
          generated_at: new Date().toISOString(),
          generated_by: trigger,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "space_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, tiles_count: tiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
