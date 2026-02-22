

# Translate Button for AI-Generated Text

## Overview
Add a language toggle button (CZ/EN) in the header navigation, next to the profile button. When toggled to English, all AI-generated text blocks in insights are translated on the frontend. All UI labels, navigation, section headers, and metric names stay in English regardless. Only the editable AI-generated paragraphs (executive summaries, recommendations, sentiment summaries, etc.) are affected.

## How It Works
1. Content is always generated and stored in Czech
2. The toggle is a visual frontend-only feature -- it does NOT change the stored data
3. When toggled to EN, an edge function translates the Czech text blocks to English using an AI model
4. Translations are cached in memory so toggling back and forth doesn't re-translate

## Architecture

### 1. Translation Context (`src/contexts/TranslationContext.tsx`)
- A React context providing `isEnglish`, `toggleLanguage()`, and a `translateText(text: string)` function
- Wraps the app in `App.tsx`
- Maintains an in-memory cache (`Map<string, string>`) of translated texts
- Calls the edge function for uncached texts

### 2. Translate Button in Header (`MainNavigation.tsx`)
- Add a button with `Languages` icon (from lucide-react) between the profile and logout buttons
- Shows "CZ" or "EN" label to indicate current display language
- Toggles the context state on click

### 3. Edge Function (`supabase/functions/translate-text/index.ts`)
- Accepts `{ texts: string[] }` body
- Uses Lovable AI (gemini-2.5-flash) to batch-translate Czech texts to English
- Returns `{ translations: string[] }`
- Simple system prompt: "Translate the following Czech texts to English. Return only the translations."

### 4. `useTranslatedText` Hook (`src/hooks/useTranslatedText.ts`)
- Takes original Czech text, returns either original or English translation based on context
- Handles loading state (shows original text while translating)
- Uses the context's cache and translate function

### 5. Update Insight Content Components
All `EditableSection` components across insight files will use `useTranslatedText` to display translated text when `isEnglish` is true. When editing, always show and save the original Czech text. Affected components:
- `AIInsightsContent.tsx` -- report content insights
- `AdsAIInsightsContent.tsx` -- ads insights
- `MonthlyAdsInsightsContent.tsx`
- `QuarterlyAdsInsightsContent.tsx`
- `YearlyAdsInsightsContent.tsx`
- `CampaignAdsInsightsContent.tsx`
- `InsightTile.tsx` -- brand AI insight tiles (text type)

## Files to Create
1. `src/contexts/TranslationContext.tsx` -- context provider with cache and edge function call
2. `supabase/functions/translate-text/index.ts` -- AI translation edge function
3. `src/hooks/useTranslatedText.ts` -- hook for consuming translated text

## Files to Modify
1. `src/App.tsx` -- wrap with `TranslationProvider`
2. `src/components/MainNavigation.tsx` -- add translate toggle button
3. `src/components/reports/AdsAIInsightsContent.tsx` -- use `useTranslatedText` in EditableSection display mode
4. `src/components/reports/AIInsightsContent.tsx` -- same
5. `src/components/reports/MonthlyAdsInsightsContent.tsx` -- same
6. `src/components/reports/QuarterlyAdsInsightsContent.tsx` -- same
7. `src/components/reports/YearlyAdsInsightsContent.tsx` -- same
8. `src/components/reports/CampaignAdsInsightsContent.tsx` -- same
9. `src/components/brands/InsightTile.tsx` -- translate `text` type tiles

## Technical Details

### Translation Context Core Logic
```typescript
const cache = useRef(new Map<string, string>());

const translateText = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (cache.current.has(text)) return cache.current.get(text)!;
  
  const { data } = await supabase.functions.invoke("translate-text", {
    body: { texts: [text] },
  });
  
  const translated = data.translations[0];
  cache.current.set(text, translated);
  return translated;
};
```

### EditableSection Integration
In display mode (not editing), wrap the text output:
```tsx
// Before
<p>{value}</p>

// After
<p>{isEnglish ? translatedValue : value}</p>
```

When `isEditing` is true, always show and save the original Czech value -- translation is display-only.

### Header Button
```tsx
<Button
  onClick={toggleLanguage}
  variant="outline"
  size="icon"
  className="rounded-[35px] border-white text-white hover:bg-white hover:text-foreground"
  title={isEnglish ? "Switch to Czech" : "Switch to English"}
>
  <Languages className="h-4 w-4" />
</Button>
```
