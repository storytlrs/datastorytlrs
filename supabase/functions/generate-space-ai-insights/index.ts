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

    // Fetch all reports for this space
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
    ] = await Promise.all([
      reportIds.length > 0
        ? supabase
            .from("content")
            .select(
              "id, content_type, platform, views, impressions, likes, comments, shares, saves, engagement_rate, reach, url, thumbnail_url, creator_id, report_id, published_date, cost, cpm, cpv"
            )
            .in("report_id", reportIds)
            .limit(500)
        : { data: [] },
      reportIds.length > 0
        ? supabase
            .from("creators")
            .select(
              "id, handle, platform, followers, avg_engagement_rate, avg_reach, avg_views, posts_count, reels_count, stories_count, avatar_url, report_id"
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
            .select("id, code, clicks, purchases, revenue, conversion_rate, creator_id")
            .in("report_id", reportIds)
            .limit(100)
        : { data: [] },
    ]);

    const content = contentResult.data || [];
    const creators = creatorsResult.data || [];
    const campaigns = campaignsResult.data || [];
    const tiktokCampaigns = tiktokCampaignsResult.data || [];
    const promoCodes = promoCodesResult.data || [];

    // Build summary for AI
    const totalContent = content.length;
    const totalViews = content.reduce((s: number, c: any) => s + (c.views || 0), 0);
    const totalImpressions = content.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
    const totalLikes = content.reduce((s: number, c: any) => s + (c.likes || 0), 0);
    const totalComments = content.reduce((s: number, c: any) => s + (c.comments || 0), 0);
    const totalShares = content.reduce((s: number, c: any) => s + (c.shares || 0), 0);
    const totalSaves = content.reduce((s: number, c: any) => s + (c.saves || 0), 0);
    const totalReach = content.reduce((s: number, c: any) => s + (c.reach || 0), 0);
    const totalCost = content.reduce((s: number, c: any) => s + (c.cost || 0), 0);
    const avgEngagement = content.length > 0
      ? content.reduce((s: number, c: any) => s + (c.engagement_rate || 0), 0) / content.length
      : 0;

    const totalCreators = creators.length;
    const avgFollowers = creators.length > 0
      ? creators.reduce((s: number, c: any) => s + (c.followers || 0), 0) / creators.length
      : 0;

    const totalAdSpend = [...campaigns, ...tiktokCampaigns].reduce(
      (s: number, c: any) => s + (c.amount_spent || 0), 0
    );
    const totalAdReach = [...campaigns, ...tiktokCampaigns].reduce(
      (s: number, c: any) => s + (c.reach || 0), 0
    );
    const totalAdImpressions = [...campaigns, ...tiktokCampaigns].reduce(
      (s: number, c: any) => s + (c.impressions || 0), 0
    );

    const totalRevenue = promoCodes.reduce((s: number, p: any) => s + (p.revenue || 0), 0);
    const totalPurchases = promoCodes.reduce((s: number, p: any) => s + (p.purchases || 0), 0);

    // Top content by views
    const topContent = [...content]
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((c: any) => {
        const creator = creators.find((cr: any) => cr.id === c.creator_id);
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
          content_id: c.id,
        };
      });

    // Top creators by avg_engagement_rate
    const topCreators = [...creators]
      .sort((a: any, b: any) => (b.avg_engagement_rate || 0) - (a.avg_engagement_rate || 0))
      .slice(0, 5)
      .map((c: any) => ({
        handle: c.handle,
        platform: c.platform,
        followers: c.followers,
        avg_engagement_rate: c.avg_engagement_rate,
        avg_reach: c.avg_reach,
        avg_views: c.avg_views,
        avatar_url: c.avatar_url,
      }));

    // Platform breakdown
    const platformBreakdown: Record<string, { count: number; views: number; engagement: number }> = {};
    content.forEach((c: any) => {
      if (!platformBreakdown[c.platform]) {
        platformBreakdown[c.platform] = { count: 0, views: 0, engagement: 0 };
      }
      platformBreakdown[c.platform].count++;
      platformBreakdown[c.platform].views += c.views || 0;
      platformBreakdown[c.platform].engagement += c.engagement_rate || 0;
    });

    // Content type breakdown
    const contentTypeBreakdown: Record<string, { count: number; views: number }> = {};
    content.forEach((c: any) => {
      if (!contentTypeBreakdown[c.content_type]) {
        contentTypeBreakdown[c.content_type] = { count: 0, views: 0 };
      }
      contentTypeBreakdown[c.content_type].count++;
      contentTypeBreakdown[c.content_type].views += c.views || 0;
    });

    const dataContext = {
      reports_count: reports?.length || 0,
      reports: (reports || []).map((r: any) => ({ name: r.name, type: r.type, period: r.period })),
      content_summary: {
        total_pieces: totalContent,
        total_views: totalViews,
        total_impressions: totalImpressions,
        total_likes: totalLikes,
        total_comments: totalComments,
        total_shares: totalShares,
        total_saves: totalSaves,
        total_reach: totalReach,
        total_cost: totalCost,
        avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
      },
      creators_summary: {
        total_creators: totalCreators,
        avg_followers: Math.round(avgFollowers),
      },
      ads_summary: {
        total_ad_spend: totalAdSpend,
        total_ad_reach: totalAdReach,
        total_ad_impressions: totalAdImpressions,
        meta_campaigns: campaigns.length,
        tiktok_campaigns: tiktokCampaigns.length,
      },
      promo_summary: {
        total_revenue: totalRevenue,
        total_purchases: totalPurchases,
        total_codes: promoCodes.length,
      },
      top_content: topContent,
      top_creators: topCreators,
      platform_breakdown: platformBreakdown,
      content_type_breakdown: contentTypeBreakdown,
    };

    // Call Lovable AI with tool calling
    const systemPrompt = `You are an analytics expert for influencer marketing and social media campaigns. You analyze data across multiple reports within a brand/space and generate the most important insights as modular tiles.

Generate up to 9 tiles. Each tile should highlight something important, noteworthy, or actionable. Focus on:
- Key performance metrics (views, engagement, reach, spend efficiency)
- Top performers (creators, content)
- Trends and comparisons across platforms
- Recommendations and observations
- Notable outliers or exceptional results

Use Czech language for all tile titles and text content. Use standard metric abbreviations (CPM, CPC, CTR, ER) where appropriate.

When creating chart tiles, provide simple data arrays suitable for recharts. For content_preview tiles, include the content details from the top content data provided.`;

    const userPrompt = `Here is the aggregated data for this brand across ${dataContext.reports_count} active reports:\n\n${JSON.stringify(dataContext, null, 2)}\n\nGenerate the most impactful insight tiles (up to 9) based on this data. Focus on what matters most.`;

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
                        required: ["type", "title", "priority"],
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
