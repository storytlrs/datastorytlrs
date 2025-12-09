import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlM2I5Mzk2ZC01MmNmLTQzZGMtODdmOC0wZjMyYWJjMTVjMGEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1MjcwMzYyLCJleHAiOjE3Njc4MjY4MDB9.L2qW9qxaox5-PtGfTdfrArb2vYe2kn8BnWYliB0-3PY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
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

    // Create Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare content data
    const contentData = {
      report_id,
      creator_id,
      content_type,
      platform,
      url: optionalFields.url || null,
      thumbnail_url: optionalFields.thumbnail_url || null,
      published_date: optionalFields.published_date || null,
      views: optionalFields.views || 0,
      impressions: optionalFields.impressions || 0,
      reach: optionalFields.reach || 0,
      likes: optionalFields.likes || 0,
      comments: optionalFields.comments || 0,
      shares: optionalFields.shares || 0,
      saves: optionalFields.saves || 0,
      link_clicks: optionalFields.link_clicks || 0,
      sticker_clicks: optionalFields.sticker_clicks || 0,
      watch_time: optionalFields.watch_time || null,
      engagement_rate: optionalFields.engagement_rate || null,
      sentiment: optionalFields.sentiment || null,
      sentiment_summary: optionalFields.sentiment_summary || null,
      notes: optionalFields.notes || null,
      main_usp: optionalFields.main_usp || null,
      cost: optionalFields.cost || null,
      cpm: optionalFields.cpm || null,
      cpv: optionalFields.cpv || null,
      cpe: optionalFields.cpe || null,
      is_branded: optionalFields.is_branded || false,
      branded_views: optionalFields.branded_views || 0,
      paid_views: optionalFields.paid_views || 0,
      organic_views: optionalFields.organic_views || 0,
      aqs: optionalFields.aqs || null,
      brand_minutes: optionalFields.brand_minutes || null,
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
        JSON.stringify({ error: 'Failed to insert content', details: error.message }),
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
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
