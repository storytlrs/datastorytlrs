import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all influencer content with Instagram URLs missing analysis
    const { data: contents, error } = await supabase
      .from('content')
      .select('id, url, report_id, reports!inner(type)')
      .like('url', '%instagram.com%')
      .is('content_summary', null)
      .eq('reports.type', 'influencer');

    if (error) {
      console.error('Query error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${contents?.length || 0} content items to analyze`);

    const results: { id: string; status: string; error?: string }[] = [];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Process sequentially to avoid rate limits
    for (const content of (contents || [])) {
      console.log(`Analyzing content ${content.id}: ${content.url}`);
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/analyze-instagram-content`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ content_id: content.id }),
          }
        );

        const result = await response.json();
        results.push({
          id: content.id,
          status: response.ok ? 'success' : 'failed',
          error: response.ok ? undefined : result.error,
        });
        console.log(`Content ${content.id}: ${response.ok ? 'success' : 'failed'}`);

        // Wait 2s between requests to avoid Apify rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        results.push({ id: content.id, status: 'error', error: msg });
        console.error(`Content ${content.id} error:`, msg);
      }
    }

    return new Response(
      JSON.stringify({
        total: contents?.length || 0,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status !== 'success').length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
