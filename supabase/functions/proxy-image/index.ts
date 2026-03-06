import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist of allowed image CDN domains
const ALLOWED_IMAGE_DOMAINS = [
  'cdninstagram.com',
  'fbcdn.net',
  'instagram.com',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokcdn-eu.com',
  'muscdn.com',
  'ytimg.com',
  'ggpht.com',
  'twimg.com',
  'fbsbx.com',
];

// Validate image URL to prevent SSRF
const validateImageUrl = (url: string): { valid: boolean; error?: string } => {
  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
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

    // Check against whitelist using exact match or subdomain match only
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return { valid: false, error: 'Image domain is not in the allowed list' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication is optional for GET image requests (URL whitelist provides security)
    // But we still validate if an auth header is provided
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (token !== serviceRoleKey) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError || !userData?.user) {
          console.log('Invalid or expired token');
        } else {
          console.log(`Authenticated image proxy request from user: ${userData.user.id}`);
        }
      } else {
        console.log('Authenticated via service role key');
      }
    }

    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'URL parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL to prevent SSRF
    const validation = validateImageUrl(imageUrl);
    if (!validation.valid) {
      console.log(`Image URL validation failed: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Proxying image:', imageUrl);

    // Fetch the image from the original URL
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
      }
    });

    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.status);
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${imageResponse.status}` }),
        { status: imageResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageData = await imageResponse.arrayBuffer();

    console.log('Successfully proxied image, size:', imageData.byteLength);

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      }
    });

  } catch (error: unknown) {
    console.error('Error proxying image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
