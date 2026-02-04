-- Create table for storing AI prompts
CREATE TABLE public.ai_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  prompt_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage prompts
CREATE POLICY "Admins can manage prompts" 
ON public.ai_prompts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can view prompts (needed for edge functions)
CREATE POLICY "Authenticated users can view prompts" 
ON public.ai_prompts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.ai_prompts (key, name, description, prompt_text) VALUES
('insights_system', 'AI Insights - System Prompt', 'Systémový prompt pro generování AI Insights reportů', 'Jsi analytik influencer marketingu. Na základě dat z kampaně a kontextu od uživatele vytvoř strukturovaný report v češtině.

Tvým úkolem je vytvořit stručné, ale výstižné analytické texty pro jednotlivé sekce reportu. Piš profesionálně, ale přístupně.

Pro výpočet relevance (0-100%):
- Analyzuj témata v komentářích daného creatora
- Spočítej poměr témat týkajících se brandu/produktu/kampaně vs. off-topic témat (životní styl, osobní komentáře, etc.)
- 100% = všechny komentáře jsou relevantní k brandu
- 50% = polovina témat je o brandu, polovina off-topic
- 0% = žádné komentáře se netýkají brandu'),

('insights_user', 'AI Insights - User Prompt', 'User prompt s instrukcemi pro výstupní formát', 'Vytvoř analytický obsah pro influencer report. Odpověz ve formátu JSON s následující strukturou:

{
  "executive_summary": "Jeden odstavec shrnující zásadní informace o kampani (max 150 slov)",
  "overview_paragraph": "Jeden odstavec hodnotící výsledky z pohledu efektivity a dosahu (max 100 slov)",
  "innovation_paragraph": "Jeden odstavec hodnotící TSWB, virality rate a kvalitu interakcí (max 100 slov)",
  "sentiment_paragraph": "Jeden odstavec o klíčových tématech a sentimentu v komentářích (max 100 slov)",
  "top_sentiment_topics": ["5 nejčastějších témat zmiňovaných v komentářích - krátká slova/fráze"],
  "creator_insights": [
    {
      "handle": "creator_handle",
      "relevance": 75,
      "key_insight": "Klíčový insight o tomto creatorovi (1-2 věty)",
      "positive_topics": ["max 3 pozitivní témata"],
      "negative_topics": ["max 3 negativní témata"]
    }
  ],
  "recommendations": {
    "works": ["3-5 bodů co funguje dobře"],
    "doesnt_work": ["2-4 body co nefunguje nebo má prostor ke zlepšení"],
    "suggestions": ["3-5 konkrétních doporučení pro budoucí kampaně"]
  }
}'),

('sentiment_analysis', 'Sentiment Analysis Prompt', 'Prompt pro analýzu sentimentu obsahu', 'Analyzuj sentiment komentářů a reakcí na tento obsah. Zhodnoť pozitivní, neutrální a negativní sentiment a identifikuj klíčová témata.');