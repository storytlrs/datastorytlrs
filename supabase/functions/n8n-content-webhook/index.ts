import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-signature, x-webhook-timestamp',
};

// Input validation constants
const MAX_STRING_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;
const MAX_INT = 2147483647; // PostgreSQL integer max
const MIN_DATE = new Date('1970-01-01');
const MAX_DATE = new Date('2100-12-31');
const MAX_TIMESTAMP_AGE_MS = 300000; // 5 minutes - prevent replay attacks

// Sanitize string input - remove potential XSS
const sanitizeString = (value: unknown, maxLength = MAX_STRING_LENGTH): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value)
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  return str || null;
};

// Validate and clamp numeric values
const validateNumber = (value: unknown, min = 0, max = MAX_INT): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.max(min, Math.min(max, Math.floor(num)));
};

// Validate percentage (0-100)
const validatePercentage = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
};

// Validate decimal/currency values
const validateDecimal = (value: unknown, min = 0, max = 999999999): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.max(min, Math.min(max, num));
};

// Validate URL format
const validateUrl = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).slice(0, MAX_URL_LENGTH).trim();
  try {
    new URL(str);
    return str;
  } catch {
    // Allow relative URLs or malformed but safe URLs
    if (str.startsWith('/') || str.startsWith('http://') || str.startsWith('https://')) {
      return str;
    }
    return null;
  }
};

// Validate date is within reasonable range
const validateDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  if (date < MIN_DATE || date > MAX_DATE) return null;
  return date.toISOString();
};

// Validate UUID format
const validateUUID = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
};

// Convert ArrayBuffer to hex string
const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Verify HMAC signature for webhook security
const verifyHmacSignature = async (
  signature: string | null,
  timestamp: string | null,
  body: string,
  secret: string
): Promise<{ valid: boolean; error?: string }> => {
  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing signature or timestamp headers' };
  }

  // Check timestamp freshness to prevent replay attacks
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  const now = Date.now();
  if (Math.abs(now - requestTime) > MAX_TIMESTAMP_AGE_MS) {
    return { valid: false, error: 'Request timestamp too old or in future' };
  }

  // Calculate expected signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signaturePayload = `${timestamp}.${body}`;
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signaturePayload)
  );

  const expectedHex = bufferToHex(expectedSignature);

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedHex.length) {
    return { valid: false, error: 'Invalid signature' };
  }

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
};

// Fallback: verify static API key (for backward compatibility)
const verifyApiKey = (apiKey: string | null, expectedKey: string | undefined): boolean => {
  if (!apiKey || !expectedKey) return false;
  
  // Constant-time comparison
  if (apiKey.length !== expectedKey.length) return false;
  
  let mismatch = 0;
  for (let i = 0; i < apiKey.length; i++) {
    mismatch |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  
  return mismatch === 0;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clone the request to read body for signature verification
    const bodyText = req.method !== 'GET' && req.method !== 'DELETE' 
      ? await req.text() 
      : '';

    // Try HMAC signature verification first (preferred method)
    const signature = req.headers.get('x-webhook-signature');
    const timestamp = req.headers.get('x-webhook-timestamp');
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');

    let authenticated = false;

    if (signature && timestamp && webhookSecret) {
      const hmacResult = await verifyHmacSignature(signature, timestamp, bodyText, webhookSecret);
      if (hmacResult.valid) {
        authenticated = true;
        console.log('Authenticated via HMAC signature');
      } else {
        console.error('HMAC verification failed:', hmacResult.error);
      }
    }

    // Fallback to static API key if HMAC not provided or failed
    if (!authenticated) {
      const apiKey = req.headers.get('x-api-key');
      const expectedApiKey = Deno.env.get('N8N_WEBHOOK_API_KEY');

      if (verifyApiKey(apiKey, expectedApiKey)) {
        authenticated = true;
        console.log('Authenticated via API key (consider migrating to HMAC signatures)');
      }
    }

    if (!authenticated) {
      console.error('Authentication failed - no valid credentials provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET requests - read content data
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const reportId = url.searchParams.get('report_id');
      const creatorId = url.searchParams.get('creator_id');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      console.log('GET request params:', { reportId, creatorId, limit, offset });

      let query = supabase
        .from('content')
        .select('*, creators(handle, platform)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (reportId) {
        query = query.eq('report_id', reportId);
      }
      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetched ${data?.length || 0} content items`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          count: data?.length || 0,
          data 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle PUT requests - update existing content
    if (req.method === 'PUT') {
      const body = JSON.parse(bodyText);
      console.log('Received PUT data:', JSON.stringify(body, null, 2));

      const { id, ...updateFields } = body;

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: id (content_id to update)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove undefined/null values and keep only valid update fields
      const validFields = [
        'report_id', 'creator_id', 'content_type', 'platform', 'url', 'thumbnail_url',
        'published_date', 'views', 'impressions', 'reach', 'likes', 'comments', 'shares',
        'saves', 'link_clicks', 'sticker_clicks', 'watch_time', 'engagement_rate',
        'sentiment', 'sentiment_summary', 'notes', 'main_usp', 'cost', 'cpm', 'cpv', 'cpe',
        'is_branded', 'branded_views', 'paid_views', 'organic_views', 'aqs', 'brand_minutes'
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of validFields) {
        if (updateFields[field] !== undefined) {
          updateData[field] = updateFields[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid fields to update' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Updating content:', id, 'with data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('content')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Content updated successfully:', data.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Content updated successfully',
          content_id: data.id,
          data
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle DELETE requests - delete content
    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Missing required query parameter: id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Deleting content:', id);

      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database delete error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Content deleted successfully:', id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Content deleted successfully',
          deleted_id: id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow POST requests for creating content
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Supported: GET, POST, PUT, DELETE' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = JSON.parse(bodyText);
    console.log('Received webhook data:', JSON.stringify(body, null, 2));

    // Validate required fields
    const { report_id, creator_id, content_type, platform, ...optionalFields } = body;

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: report_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creator_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: creator_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!content_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: content_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate content_type enum
    const validContentTypes = ['post', 'reel', 'story', 'video', 'short', 'tweet', 'thread', 'carousel'];
    if (!validContentTypes.includes(content_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate platform enum
    const validPlatforms = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'twitch', 'pinterest'];
    if (!validPlatforms.includes(platform)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sentiment if provided
    if (optionalFields.sentiment) {
      const validSentiments = ['positive', 'neutral', 'negative'];
      if (!validSentiments.includes(optionalFields.sentiment)) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid sentiment. Must be one of: ${validSentiments.join(', ')}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare content data with validated and sanitized inputs
    const contentData = {
      report_id,
      creator_id,
      content_type,
      platform,
      url: validateUrl(optionalFields.url),
      thumbnail_url: validateUrl(optionalFields.thumbnail_url),
      published_date: validateDate(optionalFields.published_date),
      views: validateNumber(optionalFields.views) ?? 0,
      impressions: validateNumber(optionalFields.impressions) ?? 0,
      reach: validateNumber(optionalFields.reach) ?? 0,
      likes: validateNumber(optionalFields.likes) ?? 0,
      comments: validateNumber(optionalFields.comments) ?? 0,
      shares: validateNumber(optionalFields.shares) ?? 0,
      saves: validateNumber(optionalFields.saves) ?? 0,
      link_clicks: validateNumber(optionalFields.link_clicks) ?? 0,
      sticker_clicks: validateNumber(optionalFields.sticker_clicks) ?? 0,
      watch_time: validateNumber(optionalFields.watch_time),
      engagement_rate: validatePercentage(optionalFields.engagement_rate),
      sentiment: optionalFields.sentiment || null,
      sentiment_summary: sanitizeString(optionalFields.sentiment_summary),
      notes: sanitizeString(optionalFields.notes),
      main_usp: sanitizeString(optionalFields.main_usp),
      cost: validateDecimal(optionalFields.cost),
      cpm: validateDecimal(optionalFields.cpm),
      cpv: validateDecimal(optionalFields.cpv),
      cpe: validateDecimal(optionalFields.cpe),
      is_branded: optionalFields.is_branded === true,
      branded_views: validateNumber(optionalFields.branded_views) ?? 0,
      paid_views: validateNumber(optionalFields.paid_views) ?? 0,
      organic_views: validateNumber(optionalFields.organic_views) ?? 0,
      aqs: validateDecimal(optionalFields.aqs, 0, 100),
      brand_minutes: validateDecimal(optionalFields.brand_minutes),
    };

    console.log('Inserting content data:', JSON.stringify(contentData, null, 2));

    // Insert content into database
    const { data, error } = await supabase
      .from('content')
      .insert(contentData)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to insert content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Content inserted successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Content created successfully',
        content_id: data.id 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
