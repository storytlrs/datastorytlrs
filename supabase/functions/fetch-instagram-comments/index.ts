import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ApifyPostData {
  caption?: string;
  displayUrl?: string;
  commentsCount?: number;
  likesCount?: number;
  latestComments?: Array<{
    text: string;
    ownerUsername?: string;
    likesCount?: number;
    timestamp?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url || !url.includes('instagram.com')) {
      return new Response(JSON.stringify({ error: 'Valid Instagram URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    if (!apifyApiKey) {
      return new Response(JSON.stringify({ error: 'Apify API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching comments for: ${url}`);

    // Start Apify scraper with waitForFinish to avoid polling timeout
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apifyApiKey}&waitForFinish=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [url],
          resultsType: 'posts',
          resultsLimit: 1,
          addParentData: false,
          maxComments: 1000,
        }),
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('Apify start error:', errorText);
      throw new Error(`Failed to start scraper: ${startResponse.status}`);
    }

    const runData = await startResponse.json();
    let status = runData.data.status;
    let datasetId = runData.data.defaultDatasetId;
    const runId = runData.data.id;

    // If still not finished after waitForFinish, poll a few more times
    if (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED') {
      let attempts = 0;
      while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyApiKey}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          status = statusData.data.status;
          datasetId = statusData.data.defaultDatasetId;
        }
        attempts++;
      }
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Scraper did not succeed: ${status}`);
    }

    // Fetch results
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyApiKey}`
    );
    if (!resultsResponse.ok) throw new Error('Failed to fetch results');

    const results: ApifyPostData[] = await resultsResponse.json();
    if (!results?.length) throw new Error('No data returned');

    const post = results[0];
    
    // Sort comments by likes descending
    const sortedComments = [...(post.latestComments || [])].sort(
      (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
    );

    const comments = sortedComments.map(c => ({
      username: c.ownerUsername || 'anonymous',
      text: c.text,
      likes: c.likesCount || 0,
      timestamp: c.timestamp || null,
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        caption: post.caption || '',
        likes: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        comments,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
