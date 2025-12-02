import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OEmbedResponse {
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
}

const getOEmbedUrl = (url: string): string | null => {
  const lowerUrl = url.toLowerCase();
  
  // Instagram
  if (lowerUrl.includes('instagram.com')) {
    return `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`;
  }
  
  // TikTok
  if (lowerUrl.includes('tiktok.com')) {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  }
  
  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  }
  
  // Twitter/X
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
  }
  
  return null;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching preview for URL: ${url}`);
    
    const oembedUrl = getOEmbedUrl(url);
    
    if (!oembedUrl) {
      console.log('No oEmbed endpoint found for URL, attempting Open Graph fallback');
      
      // Fallback: Try to fetch the page and extract Open Graph meta tags
      try {
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)'
          }
        });
        
        if (pageResponse.ok) {
          const html = await pageResponse.text();
          
          // Extract og:image
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
          
          if (ogImageMatch) {
            return new Response(
              JSON.stringify({
                success: true,
                thumbnail_url: ogImageMatch[1],
                title: ogTitleMatch ? ogTitleMatch[1] : null,
                source: 'opengraph'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (ogError) {
        console.log('Open Graph fallback failed:', ogError);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported platform and no Open Graph data found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching oEmbed from: ${oembedUrl}`);
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)'
      }
    });

    if (!response.ok) {
      console.log(`oEmbed request failed with status: ${response.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch preview: ${response.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: OEmbedResponse = await response.json();
    console.log('oEmbed response:', JSON.stringify(data));

    return new Response(
      JSON.stringify({
        success: true,
        thumbnail_url: data.thumbnail_url || null,
        title: data.title || null,
        author_name: data.author_name || null,
        source: 'oembed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in fetch-url-preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
