import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
  const { campaignId, breakdowns } = await req.json();
  
  const fields = "date_start,date_stop,spend,reach,impressions,frequency,cpm,ctr,cpc";
  const url = `https://graph.facebook.com/v21.0/${campaignId}/insights?fields=${fields}&date_preset=maximum&breakdowns=${breakdowns}&limit=10&access_token=${metaAccessToken}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  return new Response(JSON.stringify(data, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
