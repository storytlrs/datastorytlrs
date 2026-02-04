import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ContentRow {
  id: string;
  url: string | null;
  thumbnail_url: string | null;
  content_summary: string | null;
  sentiment_summary: string | null;
  sentiment: string | null;
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyPostData {
  caption?: string;
  displayUrl?: string;
  commentsCount?: number;
  likesCount?: number;
  latestComments?: Array<{
    text: string;
    ownerUsername?: string;
  }>;
  type?: string;
  alt?: string;
  timestamp?: string;
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Scrape Instagram post using Apify Instagram Scraper
const scrapeInstagramPost = async (url: string, apiKey: string): Promise<{
  caption: string;
  thumbnail: string | null;
  comments: string[];
  likesCount: number;
  commentsCount: number;
}> => {
  console.log(`Scraping Instagram post with Apify: ${url}`);
  
  // Use the official apify/instagram-scraper actor with directUrls
  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        directUrls: [url],
        resultsType: 'posts',
        resultsLimit: 1,
        addParentData: false,
      }),
    }
  );

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    console.error('Apify start error:', errorText);
    throw new Error(`Failed to start Apify scraper: ${startResponse.status} - ${errorText}`);
  }

  const runData: ApifyRunResponse = await startResponse.json();
  const runId = runData.data.id;
  console.log(`Apify run started: ${runId}`);

  // Wait for the run to complete (poll every 3 seconds, max 90 seconds)
  let attempts = 0;
  const maxAttempts = 30;
  let status = runData.data.status;
  let datasetId = runData.data.defaultDatasetId;
  
  while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      datasetId = statusData.data.defaultDatasetId;
      console.log(`Run status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
    }
    attempts++;
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run did not succeed: ${status}`);
  }

  // Get the results from the dataset
  console.log(`Fetching results from dataset: ${datasetId}`);
  const resultsResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`
  );

  if (!resultsResponse.ok) {
    const errorText = await resultsResponse.text();
    console.error('Failed to fetch results:', errorText);
    throw new Error('Failed to fetch Apify results');
  }

  const results: ApifyPostData[] = await resultsResponse.json();
  console.log(`Got ${results.length} results from Apify`);
  
  if (!results || results.length === 0) {
    throw new Error('No data returned from Apify');
  }

  const post = results[0];
  console.log('Post data:', JSON.stringify(post, null, 2).substring(0, 500));
  
  // Extract comments text
  const comments = post.latestComments?.map(c => {
    const username = c.ownerUsername || 'anonymous';
    return `@${username}: ${c.text}`;
  }) || [];

  return {
    caption: post.caption || post.alt || '',
    thumbnail: post.displayUrl || null,
    comments,
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
  };
};

// Analyze content with AI
const analyzeWithAI = async (
  content: string,
  lovableApiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> => {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data: AIResponse = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { content_id } = await req.json();
    
    if (!content_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'content_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get content record
    const { data: content, error: contentError } = await supabaseClient
      .from('content')
      .select('id, url, thumbnail_url, content_summary, sentiment_summary, sentiment')
      .eq('id', content_id)
      .single();

    if (contentError || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!content.url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content has no URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Instagram URL
    if (!content.url.includes('instagram.com')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only Instagram URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys
    const apifyApiKey = Deno.env.get('APIFY_API_KEY');
    if (!apifyApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apify API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape the Instagram post with Apify
    console.log('Step 1: Scraping Instagram post with Apify...');
    const { caption, thumbnail, comments, likesCount, commentsCount } = await scrapeInstagramPost(
      content.url,
      apifyApiKey
    );
    
    console.log(`Scraped: caption=${caption.length} chars, thumbnail=${thumbnail ? 'found' : 'not found'}, comments=${comments.length}`);

    // Step 2: Analyze content summary
    console.log('Step 2: Analyzing content...');
    const contentText = `Caption: ${caption}\n\nLikes: ${likesCount}\nComments count: ${commentsCount}`;
    
    const contentSummary = await analyzeWithAI(
      contentText,
      lovableApiKey,
      `Jsi expert na analýzu sociálních sítí. Analyzuj Instagram příspěvek a vytvoř stručné shrnutí v češtině.`,
      `Analyzuj tento Instagram příspěvek a vytvoř stručné shrnutí (max 300 slov):
      
      1. O čem příspěvek je
      2. Hlavní sdělení/message
      3. Engagement (likes, komentáře)
      4. Call-to-action (pokud existuje)
      
      ${contentText}`
    );

    // Step 3: Analyze sentiment of comments
    console.log('Step 3: Analyzing sentiment...');
    let sentimentSummary = '';
    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (comments.length > 0) {
      const commentsText = comments.join('\n').substring(0, 10000);
      
      const sentimentAnalysis = await analyzeWithAI(
        commentsText,
        lovableApiKey,
        `Jsi expert na sentiment analýzu. Analyzuj komentáře k Instagram příspěvku a urči celkový sentiment v češtině.`,
        `Analyzuj tyto komentáře k Instagram příspěvku:

        ${commentsText}
        
        Vrať analýzu ve formátu:
        1. CELKOVÝ SENTIMENT: [positive/negative/neutral]
        2. SHRNUTÍ: Stručné shrnutí reakcí (max 200 slov)
        3. HLAVNÍ TÉMATA: Co lidé nejčastěji zmiňují
        4. POZITIVNÍ REAKCE: Příklady pozitivních komentářů
        5. NEGATIVNÍ REAKCE: Příklady negativních komentářů (pokud existují)`
      );
      
      sentimentSummary = sentimentAnalysis;
      
      // Extract overall sentiment from AI response
      if (sentimentAnalysis.toLowerCase().includes('celkový sentiment: positive') ||
          sentimentAnalysis.toLowerCase().includes('celkový sentiment: pozitivní')) {
        overallSentiment = 'positive';
      } else if (sentimentAnalysis.toLowerCase().includes('celkový sentiment: negative') ||
                 sentimentAnalysis.toLowerCase().includes('celkový sentiment: negativní')) {
        overallSentiment = 'negative';
      }
    } else {
      sentimentSummary = 'Nebyly nalezeny žádné komentáře k analýze.';
    }

    // Step 4: Update content record
    console.log('Step 4: Updating content record...');
    const updateData: Partial<ContentRow> = {
      content_summary: contentSummary,
      sentiment_summary: sentimentSummary,
      sentiment: overallSentiment,
    };

    // Only update thumbnail if we found one and current is empty
    if (thumbnail && !content.thumbnail_url) {
      updateData.thumbnail_url = thumbnail;
    }

    const { error: updateError } = await supabaseClient
      .from('content')
      .update(updateData)
      .eq('id', content_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update content record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analysis complete!');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          content_summary: contentSummary,
          sentiment_summary: sentimentSummary,
          sentiment: overallSentiment,
          thumbnail: thumbnail,
          comments_analyzed: comments.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-instagram-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
