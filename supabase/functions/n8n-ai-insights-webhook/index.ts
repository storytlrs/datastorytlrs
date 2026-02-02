import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Input validation constants
const MAX_AI_INSIGHTS_LENGTH = 100000; // 100KB max for AI insights text

// Validate UUID format
const validateUUID = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
};

// Sanitize AI insights text - limit length and basic sanitization
const sanitizeAIInsights = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return String(value).slice(0, MAX_AI_INSIGHTS_LENGTH);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('N8N_WEBHOOK_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);

    // Handle GET request - fetch AI insights for a report
    if (req.method === 'GET') {
      const reportId = validateUUID(url.searchParams.get('report_id'));

      if (!reportId) {
        return new Response(
          JSON.stringify({ error: 'report_id is required and must be a valid UUID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching AI insights for report: ${reportId}`);

      const { data, error } = await supabase
        .from('reports')
        .select('id, name, ai_insights')
        .eq('id', reportId)
        .single();

      if (error) {
        console.error('Error fetching AI insights:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST/PUT request - update AI insights
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json();
      const report_id = validateUUID(body.report_id);
      const ai_insights = sanitizeAIInsights(body.ai_insights);

      if (!report_id) {
        return new Response(
          JSON.stringify({ error: 'report_id is required and must be a valid UUID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updating AI insights for report: ${report_id}`);

      const { data, error } = await supabase
        .from('reports')
        .update({ ai_insights, updated_at: new Date().toISOString() })
        .eq('id', report_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating AI insights:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('AI insights updated successfully');
      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in n8n-ai-insights-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
