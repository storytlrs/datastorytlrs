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
    const expectedApiKey = Deno.env.get('N8N_WEBHOOK_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
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
          JSON.stringify({ error: 'Failed to fetch content', details: error.message }),
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
      const body = await req.json();
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
          JSON.stringify({ error: 'Failed to update content', details: error.message }),
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
          JSON.stringify({ error: 'Failed to delete content', details: error.message }),
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
