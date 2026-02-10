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

    const { spaceId } = await req.json();

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: "spaceId is required" }),
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

    // Get all ad sets for this space
    const { data: adSets, error: adSetsError } = await supabase
      .from("brand_ad_sets")
      .select("id, adset_id")
      .eq("space_id", spaceId);

    if (adSetsError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch ad sets: ${adSetsError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adSets || adSets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No ad sets found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updated = 0;
    const errors: string[] = [];

    for (const adSet of adSets) {
      try {
        // Fetch ads with creative image_url (higher res) and thumbnail_url as fallback
        const url = `https://graph.facebook.com/v21.0/${adSet.adset_id}/ads?fields=name,creative{id,image_url,thumbnail_url}&access_token=${metaAccessToken}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          errors.push(`Ad set ${adSet.adset_id}: ${data.error.message}`);
          continue;
        }

        const creative = data.data?.[0]?.creative;
        const thumbnailUrl = creative?.image_url || creative?.thumbnail_url;
        if (!thumbnailUrl) continue;

        const { error: updateError } = await supabase
          .from("brand_ad_sets")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("id", adSet.id);

        if (!updateError) {
          updated++;
        } else {
          errors.push(`Update failed for ${adSet.adset_id}: ${updateError.message}`);
        }
      } catch (err) {
        errors.push(`Ad set ${adSet.adset_id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, total: adSets.length, errors: errors.length > 0 ? errors : undefined }),
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
