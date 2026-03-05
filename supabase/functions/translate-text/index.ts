import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "texts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const numberedTexts = texts
      .map((t: string, i: number) => `[${i}] ${t}`)
      .join("\n---\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: "You are a professional translator. Translate the following Czech texts to English. Each text is prefixed with [number]. Return ONLY the translations in the same order, each prefixed with [number]. Keep the same formatting (line breaks, bullet points, markdown). Do not add any commentary.",
        messages: [
          { role: "user", content: numberedTexts },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error("Anthropic API error");
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Parse numbered translations
    const translations: string[] = [];
    const parts = content.split(/\[\d+\]\s*/);
    // First part before [0] is empty, skip it
    for (let i = 1; i < parts.length; i++) {
      translations.push(parts[i].replace(/\n---\n?$/, "").trim());
    }

    // Fallback: if parsing fails, return original texts
    if (translations.length !== texts.length) {
      // Try simpler approach: just return the whole content for single text
      if (texts.length === 1) {
        return new Response(
          JSON.stringify({ translations: [content.replace(/^\[0\]\s*/, "").trim()] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Translation parsing mismatch", { expected: texts.length, got: translations.length });
      return new Response(
        JSON.stringify({ translations: texts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ translations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-text error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
