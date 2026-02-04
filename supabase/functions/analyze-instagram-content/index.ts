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

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      ogImage?: string;
    };
  };
  error?: string;
}

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

// Extract Instagram post ID from URL
const extractPostId = (url: string): string | null => {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Scrape Instagram post using Firecrawl
const scrapeInstagramPost = async (url: string, apiKey: string): Promise<{ content: string; thumbnail: string | null }> => {
  console.log(`Scraping Instagram post: ${url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: false,
      waitFor: 3000, // Wait for dynamic content
    }),
  });

  const data: FirecrawlResponse = await response.json();
  
  if (!response.ok || !data.success) {
    console.error('Firecrawl error:', data.error);
    throw new Error(data.error || 'Failed to scrape Instagram post');
  }

  // Try to extract og:image from HTML for thumbnail
  let thumbnail: string | null = null;
  if (data.data?.html) {
    const ogImageMatch = data.data.html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        data.data.html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      thumbnail = ogImageMatch[1].replace(/&amp;/g, '&');
    }
  }

  // Also check metadata
  if (!thumbnail && data.data?.metadata?.ogImage) {
    thumbnail = data.data.metadata.ogImage;
  }

  return {
    content: data.data?.markdown || '',
    thumbnail,
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

// Extract comments from scraped content
const extractComments = (markdown: string): string[] => {
  const comments: string[] = [];
  
  // Instagram markdown typically has comments in a specific format
  // This is a heuristic approach - may need adjustment based on Firecrawl output
  const lines = markdown.split('\n');
  let inCommentsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for comment patterns (username followed by text)
    if (trimmed.match(/^@?[a-zA-Z0-9._]+\s+.+/) || 
        trimmed.match(/^\*\*[a-zA-Z0-9._]+\*\*\s+.+/)) {
      comments.push(trimmed);
    }
    
    // Also capture lines that look like comment content
    if (inCommentsSection && trimmed.length > 10 && trimmed.length < 500) {
      if (!trimmed.startsWith('http') && !trimmed.startsWith('#')) {
        comments.push(trimmed);
      }
    }
    
    // Detect comments section
    if (trimmed.toLowerCase().includes('comment') || trimmed.toLowerCase().includes('komentář')) {
      inCommentsSection = true;
    }
  }
  
  // Limit to top 1000 comments
  return comments.slice(0, 1000);
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
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
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

    // Step 1: Scrape the Instagram post
    console.log('Step 1: Scraping Instagram post...');
    const { content: scrapedContent, thumbnail } = await scrapeInstagramPost(content.url, firecrawlApiKey);
    
    if (!scrapedContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape content from Instagram' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraped ${scrapedContent.length} characters, thumbnail: ${thumbnail ? 'found' : 'not found'}`);

    // Step 2: Extract comments
    console.log('Step 2: Extracting comments...');
    const comments = extractComments(scrapedContent);
    console.log(`Extracted ${comments.length} comments`);

    // Step 3: Analyze content summary
    console.log('Step 3: Analyzing content...');
    const contentSummary = await analyzeWithAI(
      scrapedContent,
      lovableApiKey,
      `Jsi expert na analýzu sociálních sítí. Analyzuj Instagram příspěvek a vytvoř stručné shrnutí v češtině.`,
      `Analyzuj tento Instagram příspěvek a vytvoř stručné shrnutí (max 300 slov):
      
      1. O čem příspěvek je
      2. Hlavní sdělení/message
      3. Vizuální prvky (pokud jsou zmíněny)
      4. Call-to-action (pokud existuje)
      
      Obsah příspěvku:
      ${scrapedContent.substring(0, 5000)}`
    );

    // Step 4: Analyze sentiment of comments
    console.log('Step 4: Analyzing sentiment...');
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

    // Step 5: Update content record
    console.log('Step 5: Updating content record...');
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
