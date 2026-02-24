import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_base64, mime_type } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: 'image_base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dataUrl = `data:${mime_type || 'image/png'};base64,${image_base64}`;

    const systemPrompt = `You are an expert at reading Instagram analytics screenshots. Extract all visible metrics from the screenshot.

Return a JSON object with these fields (use null for any metric not visible):
{
  "reach": number | null,
  "impressions": number | null,
  "views": number | null,
  "likes": number | null,
  "comments": number | null,
  "saves": number | null,
  "shares": number | null,
  "reposts": number | null,
  "profile_visits": number | null,
  "follows": number | null,
  "link_clicks": number | null,
  "sticker_clicks": number | null,
  "watch_time": number | null,
  "avg_watch_time": number | null,
  "interactions": number | null,
  "accounts_reached": number | null,
  "accounts_engaged": number | null,
  "content_type": "post" | "reel" | "story" | "video" | null,
  "raw_text": "string with all visible text from the screenshot for reference"
}

Important rules:
- Numbers should be parsed as integers (e.g. "1,234" → 1234, "12.5K" → 12500, "1.2M" → 1200000)
- watch_time and avg_watch_time should be in seconds
- If a metric shows a time format like "0:12" it means 12 seconds
- content_type should be inferred from context if possible
- Include ALL visible metrics, even if they don't map to the fields above - put them in raw_text
- Return ONLY valid JSON, no markdown or explanation`;

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
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all Instagram metrics from this screenshot:' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON from AI response
    let extracted;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      extracted = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data', raw: content }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in extract-influencer-stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
