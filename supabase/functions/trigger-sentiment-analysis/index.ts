import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation helpers
const validateUUID = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value) ? value : null;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENTIMENT_WEBHOOK_URL = Deno.env.get("SENTIMENT_WEBHOOK_URL");
    
    if (!SENTIMENT_WEBHOOK_URL) {
      console.log("SENTIMENT_WEBHOOK_URL not configured, skipping sentiment analysis");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Sentiment webhook not configured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const body = await req.json();
    const { content_id, report_id, action = "analyze_sentiment" } = body;

    // Validate inputs
    const validContentId = validateUUID(content_id);
    const validReportId = validateUUID(report_id);

    if (!validContentId || !validReportId) {
      return new Response(
        JSON.stringify({ error: "Invalid content_id or report_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Supabase client to check report type
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only trigger for influencer reports
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("type")
      .eq("id", validReportId)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (report.type !== "influencer") {
      console.log(`Skipping sentiment analysis for non-influencer report type: ${report.type}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Sentiment analysis only available for influencer reports" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Trigger the sentiment webhook
    console.log(`Triggering sentiment webhook for content: ${validContentId}`);
    
    const webhookResponse = await fetch(SENTIMENT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_id: validContentId,
        report_id: validReportId,
        action: action
      })
    });

    if (!webhookResponse.ok) {
      console.error(`Webhook returned status: ${webhookResponse.status}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Webhook request failed" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Sentiment analysis triggered" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in trigger-sentiment-analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
