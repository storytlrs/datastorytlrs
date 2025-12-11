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

interface PreviewResult {
  thumbnail_url: string | null;
  title: string | null;
  source: string;
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

// Helper function to decode HTML entities in URLs
const decodeHtmlEntities = (str: string): string => {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

// Helper function to fetch Open Graph preview from a URL
const fetchOpenGraphPreview = async (url: string): Promise<PreviewResult | null> => {
  try {
    console.log(`Attempting Open Graph fallback for: ${url}`);
    
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)'
      }
    });
    
    if (!pageResponse.ok) {
      console.log(`Open Graph fetch failed with status: ${pageResponse.status}`);
      return null;
    }
    
    const html = await pageResponse.text();
    
    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    
    if (ogImageMatch) {
      // Decode HTML entities in the extracted URL
      const decodedUrl = decodeHtmlEntities(ogImageMatch[1]);
      console.log('Open Graph preview found:', decodedUrl);
      return {
        thumbnail_url: decodedUrl,
        title: ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : null,
        source: 'opengraph'
      };
    }
    
    console.log('No og:image found in page');
    return null;
  } catch (error) {
    console.log('Open Graph fallback error:', error);
    return null;
  }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching preview for URL: ${url}`);
    
    const oembedUrl = getOEmbedUrl(url);
    
    // If no oEmbed endpoint exists, go straight to Open Graph
    if (!oembedUrl) {
      console.log('No oEmbed endpoint found for URL, trying Open Graph');
      
      const ogData = await fetchOpenGraphPreview(url);
      
      if (ogData?.thumbnail_url) {
        return new Response(
          JSON.stringify({
            success: true,
            thumbnail_url: ogData.thumbnail_url,
            title: ogData.title,
            source: 'opengraph'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported platform and no Open Graph data found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching oEmbed from: ${oembedUrl}`);
    
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lovable/1.0; +https://lovable.dev)'
      }
    });

    // If oEmbed fails, try Open Graph fallback
    if (!response.ok) {
      console.log(`oEmbed request failed with status: ${response.status}, trying Open Graph fallback`);
      
      const ogData = await fetchOpenGraphPreview(url);
      
      if (ogData?.thumbnail_url) {
        return new Response(
          JSON.stringify({
            success: true,
            thumbnail_url: ogData.thumbnail_url,
            title: ogData.title,
            source: 'opengraph_fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Both methods failed
      return new Response(
        JSON.stringify({ success: false, error: `oEmbed failed: ${response.status}, Open Graph fallback also failed` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: OEmbedResponse = await response.json();
    console.log('oEmbed response received, thumbnail_url:', data.thumbnail_url ? 'present' : 'missing');

    // If oEmbed succeeded but has no thumbnail, try Open Graph
    if (!data.thumbnail_url) {
      console.log('oEmbed has no thumbnail, trying Open Graph fallback');
      
      const ogData = await fetchOpenGraphPreview(url);
      
      if (ogData?.thumbnail_url) {
        return new Response(
          JSON.stringify({
            success: true,
            thumbnail_url: ogData.thumbnail_url,
            title: data.title || ogData.title,
            author_name: data.author_name || null,
            source: 'opengraph_fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
