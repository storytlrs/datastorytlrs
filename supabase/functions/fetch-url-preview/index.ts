import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Whitelist of allowed domains for URL preview
const ALLOWED_DOMAINS = [
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com',
  'facebook.com',
  'www.facebook.com',
  'fb.watch',
];

// Validate URL to prevent SSRF attacks
const validateUrl = (url: string): { valid: boolean; error?: string } => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS (and HTTP for some platforms that redirect)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block private/internal IP ranges
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' ||
        hostname.match(/^127\./) ||
        hostname.match(/^10\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./) ||
        hostname.match(/^192\.168\./) ||
        hostname === '169.254.169.254' ||
        hostname.match(/^0\./) ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal')) {
      return { valid: false, error: 'Internal/private URLs are not allowed' };
    }
    
    // Check against whitelist
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return { valid: false, error: 'URL domain is not in the allowed list. Supported: Instagram, TikTok, YouTube, Twitter/X, Facebook' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log('Invalid or expired token');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated request from user: ${userId}`);

    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL to prevent SSRF
    const validation = validateUrl(url);
    if (!validation.valid) {
      console.log(`URL validation failed: ${validation.error}`);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
