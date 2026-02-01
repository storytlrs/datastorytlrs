
# Plán: Výpočet relevance jako procento

## Přehled

Upravíme výpočet relevance v edge funkci `generate-ai-insights`, aby AI vracela numerickou hodnotu 0-100 místo textových hodnot "high/medium/low". Relevance bude vyjadřovat, jak moc jsou komentáře ke contentu relevantní k brandu (jaké procento témat se týká brandu vs. ostatních témat).

---

## Změny

### 1. Úprava AI promptu

**Soubor:** `supabase/functions/generate-ai-insights/index.ts`

Změníme instrukce pro AI v `userPrompt`:

```typescript
// Před
"relevance": "high/medium/low - jak relevantní jsou komentáře k brand message",

// Po
"relevance": 85, // číslo 0-100, procento témat v komentářích relevantních k brandu vs. off-topic témata
```

Upravený popis v promptu:
```
"relevance": 0-100, // procentuální vyjádření: kolik procent témat v komentářích se týká brandu/produktu/kampaně vs. off-topic témat. 100 = všechny komentáře jsou o brandu, 0 = žádné komentáře se netýkají brandu
```

### 2. Přidání kontextu pro AI

Do `systemPrompt` přidáme vysvětlení pro výpočet relevance:

```typescript
// Přidat do systemPrompt
`
Pro výpočet relevance (0-100%):
- Analyzuj témata v komentářích daného creatora
- Spočítej poměr témat týkajících se brandu/produktu/kampaně vs. off-topic témat (životní styl, osobní komentáře, etc.)
- 100% = všechny komentáře jsou relevantní k brandu
- 50% = polovina témat je o brandu, polovina off-topic
- 0% = žádné komentáře se netýkají brandu
`
```

### 3. Odstranění konverze na backend

Odstraníme fallback na "medium" a použijeme přímo číslo:

```typescript
// Před (řádek 438)
relevance: aiInsight?.relevance || "medium",

// Po
relevance: typeof aiInsight?.relevance === "number" ? aiInsight.relevance : 50,
```

### 4. Aktualizace frontendu

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

Zjednodušíme `getRelevanceAsNumber()` pro zpětnou kompatibilitu:

```typescript
const getRelevanceAsNumber = (rel: string | number | undefined): number => {
  if (typeof rel === "number") return rel;
  // Fallback pro legacy data
  switch (rel) {
    case "high": return 85;
    case "medium": return 55;
    case "low": return 25;
    default: return 50;
  }
};
```

---

## Souhrn souborů ke změně

| Soubor | Změny |
|--------|-------|
| `supabase/functions/generate-ai-insights/index.ts` | Úprava promptu pro AI, aby vracela relevance jako číslo 0-100 |
| `src/components/reports/AIInsightsContent.tsx` | Ponechání zpětné kompatibility pro legacy data |

---

## Technické detaily

### Nový formát v AI response
```json
{
  "creator_insights": [
    {
      "handle": "creator_handle",
      "relevance": 75,
      "key_insight": "...",
      "positive_topics": [...],
      "negative_topics": [...]
    }
  ]
}
```

### Logika výpočtu relevance (pro AI)
AI bude analyzovat sentiment_summaries každého creatora a určovat:
- Kolik % komentářů zmiňuje brand, produkt, kampaň nebo její messaging
- Kolik % komentářů je off-topic (osobní komentáře k creatorovi, nesouvisející diskuze)

Výsledek bude číslo 0-100 reprezentující procento brand-relevantních témat.
