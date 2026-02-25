import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Service client for data queries
    const db = createClient(supabaseUrl, serviceRoleKey);

    const { messages, page_context } = await req.json();

    // Get user role
    const { data: roleData } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    const userRole = roleData?.role || "client";

    // Build context data based on page
    let contextData = "";
    const pc = page_context || {};

    if (pc.page_type === "brand_detail" && pc.space_id) {
      // Verify access
      const isAdmin = userRole === "admin";
      if (!isAdmin) {
        const { data: access } = await db
          .from("space_users")
          .select("id")
          .eq("space_id", pc.space_id)
          .eq("user_id", userId)
          .single();
        if (!access) {
          return new Response(JSON.stringify({ error: "Access denied to this space" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Fetch space info
      const { data: space } = await db.from("spaces").select("*").eq("id", pc.space_id).single();
      contextData += `\n\nCurrent brand/space: ${space?.name || "Unknown"}`;

      // Fetch reports for this space
      const { data: reports } = await db
        .from("reports")
        .select("id, name, type, status, start_date, end_date, period")
        .eq("space_id", pc.space_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (reports?.length) {
        contextData += `\n\nReports (${reports.length}):\n`;
        for (const r of reports) {
          contextData += `- ${r.name} (${r.type}, ${r.status}, ${r.start_date || "?"} to ${r.end_date || "?"})\n`;
        }
      }

      // Aggregate content stats
      const { data: contentStats } = await db
        .from("content")
        .select("views, impressions, likes, comments, shares, saves, engagement_rate, cost, reach")
        .eq("space_id", pc.space_id)
        .limit(500);

      if (contentStats?.length) {
        const totals = contentStats.reduce(
          (acc, c) => ({
            views: acc.views + (c.views || 0),
            impressions: acc.impressions + (c.impressions || 0),
            likes: acc.likes + (c.likes || 0),
            comments: acc.comments + (c.comments || 0),
            shares: acc.shares + (c.shares || 0),
            saves: acc.saves + (c.saves || 0),
            reach: acc.reach + (c.reach || 0),
            cost: acc.cost + (c.cost || 0),
            count: acc.count + 1,
          }),
          { views: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, cost: 0, count: 0 }
        );
        contextData += `\nContent aggregate (${totals.count} pieces): Views: ${totals.views}, Impressions: ${totals.impressions}, Likes: ${totals.likes}, Comments: ${totals.comments}, Shares: ${totals.shares}, Saves: ${totals.saves}, Reach: ${totals.reach}, Total Cost: ${totals.cost}`;
      }
    }

    if (pc.page_type === "report_detail" && pc.report_id) {
      // Fetch the report and verify space access
      const { data: report } = await db.from("reports").select("*").eq("id", pc.report_id).single();
      if (!report) {
        return new Response(JSON.stringify({ error: "Report not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isAdmin = userRole === "admin";
      if (!isAdmin) {
        const { data: access } = await db
          .from("space_users")
          .select("id")
          .eq("space_id", report.space_id)
          .eq("user_id", userId)
          .single();
        if (!access) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: space } = await db.from("spaces").select("name").eq("id", report.space_id).single();
      contextData += `\n\nCurrent brand/space: ${space?.name || "Unknown"}`;
      contextData += `\nReport: "${report.name}" (type: ${report.type}, status: ${report.status}, period: ${report.period || "?"}, ${report.start_date || "?"} to ${report.end_date || "?"})`;

      if (report.ai_insights) {
        contextData += `\nExisting AI insights for this report: ${report.ai_insights.substring(0, 1000)}`;
      }

      // KPIs
      const { data: kpis } = await db.from("kpi_targets").select("*").eq("report_id", pc.report_id);
      if (kpis?.length) {
        contextData += `\n\nKPIs:\n`;
        for (const k of kpis) {
          contextData += `- ${k.kpi_name}: planned=${k.planned_value}, actual=${k.actual_value ?? "N/A"} ${k.unit || ""}\n`;
        }
      }

      // Creators
      const { data: creators } = await db
        .from("creators")
        .select("handle, platform, followers, avg_reach, avg_views, avg_engagement_rate, posts_count, reels_count, stories_count")
        .eq("report_id", pc.report_id)
        .limit(50);
      if (creators?.length) {
        contextData += `\nCreators (${creators.length}):\n`;
        for (const c of creators) {
          contextData += `- @${c.handle} (${c.platform}): ${c.followers || 0} followers, ER: ${c.avg_engagement_rate || 0}%, reach: ${c.avg_reach || 0}, posts: ${c.posts_count || 0}, reels: ${c.reels_count || 0}, stories: ${c.stories_count || 0}\n`;
        }
      }

      // Content
      const { data: content } = await db
        .from("content")
        .select("content_type, platform, views, impressions, likes, comments, shares, saves, engagement_rate, cost, reach, sentiment")
        .eq("report_id", pc.report_id)
        .limit(100);
      if (content?.length) {
        const totals = content.reduce(
          (acc, c) => ({
            views: acc.views + (c.views || 0),
            impressions: acc.impressions + (c.impressions || 0),
            likes: acc.likes + (c.likes || 0),
            comments: acc.comments + (c.comments || 0),
            shares: acc.shares + (c.shares || 0),
            saves: acc.saves + (c.saves || 0),
            reach: acc.reach + (c.reach || 0),
            cost: acc.cost + (c.cost || 0),
          }),
          { views: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, cost: 0 }
        );
        contextData += `\nContent (${content.length} pieces): Views: ${totals.views}, Impressions: ${totals.impressions}, Likes: ${totals.likes}, Comments: ${totals.comments}, Shares: ${totals.shares}, Saves: ${totals.saves}, Reach: ${totals.reach}, Cost: ${totals.cost}`;

        // Sentiment breakdown
        const sentiments = content.reduce((acc, c) => {
          if (c.sentiment) acc[c.sentiment] = (acc[c.sentiment] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        if (Object.keys(sentiments).length) {
          contextData += `\nSentiment: ${JSON.stringify(sentiments)}`;
        }
      }
    }

    // System prompt
    const now = new Date().toISOString();

    const systemPrompt = `You are a professional data analyst assistant for Story TLRS, a marketing analytics platform.

Rules:
- Be concise, clear, and professional
- Respond in the SAME LANGUAGE the user writes in
- Only reference data from the current brand/space — NEVER mix data between different brands/spaces
- You can summarize reports, compare metrics, explain trends, and provide actionable insights
- For technical support requests, collect: issue description, steps to reproduce, expected behavior, then format it clearly (this will later be sent to ClickUp/Slack)
- If you don't have enough context to answer, say so honestly
- If the user's request is unclear, ask at most ONE short clarifying question. Never ask multiple questions at once.
- When the user provides SCRAPED INSTAGRAM COMMENTS DATA, display individual comments in a clear formatted list showing username, likes count, and comment text. Provide a brief analysis/summary of the comments. Use markdown tables or numbered lists for clarity.
- Current date and time: ${now}
- User role: ${userRole}
- Current page: ${pc.page_type || "unknown"}
${contextData}`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
