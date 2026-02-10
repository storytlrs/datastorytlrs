import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { adIds } = await req.json();

    if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "adIds array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!metaAccessToken) {
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const previews: Record<string, string | null> = {};

    await Promise.all(
      adIds.slice(0, 10).map(async (adId: string) => {
        try {
          const url = `https://graph.facebook.com/v21.0/${adId}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${metaAccessToken}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.error) {
            console.error(`Ad ${adId} preview error:`, data.error.message);
            previews[adId] = null;
            return;
          }

          const body = data.data?.[0]?.body;
          if (body) {
            // Extract iframe src from the HTML body
            const srcMatch = body.match(/src="([^"]+)"/);
            previews[adId] = srcMatch ? srcMatch[1] : null;
          } else {
            previews[adId] = null;
          }
        } catch (err) {
          console.error(`Ad ${adId} preview fetch failed:`, err);
          previews[adId] = null;
        }
      })
    );

    return new Response(
      JSON.stringify({ previews }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
