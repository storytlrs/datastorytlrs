import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-signature, x-webhook-timestamp',
};

// Input validation constants
const MAX_AI_INSIGHTS_LENGTH = 100000; // 100KB max for AI insights text
const MAX_TIMESTAMP_AGE_MS = 300000; // 5 minutes - prevent replay attacks

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
    const bodyText = await req.text();

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
          JSON.stringify({ error: 'Failed to fetch report' }),
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
      const body = JSON.parse(bodyText);
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
          JSON.stringify({ error: 'Failed to update report' }),
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
