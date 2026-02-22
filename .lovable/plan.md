

# Translate All Czech Text in the Platform

## Problem
The platform has ~1057 Czech text occurrences across 28 files: toast messages, placeholders, section headers, button labels, tooltips, date range filters, etc. The current translate toggle only affects AI-generated content blocks.

## Solution
Two-pronged approach:

### 1. Static Translation Dictionary
Create a dictionary file (`src/lib/translations.ts`) mapping all hardcoded Czech strings to their English equivalents. A `useT()` hook will return the correct string based on the current language toggle state.

This avoids calling the AI translation API for static strings (which are known at build time).

### 2. Keep AI Translation for Dynamic Content
The existing `TranslatedText` / `useTranslatedText` mechanism continues to handle AI-generated text (insights, recommendations, summaries) via the edge function.

## Translation Dictionary Structure

```text
Key: Czech string -> Value: English string

Examples:
"Nepodařilo se načíst data" -> "Failed to load data"
"Uložit změny" -> "Save changes"  
"Zobrazit více" -> "Show more"
"Zrušit" -> "Cancel"
"Tento měsíc" -> "This month"
"Minulý kvartál" -> "Last quarter"
...~80-100 unique strings
```

## Files to Create
1. `src/lib/translations.ts` -- Dictionary of all Czech-to-English mappings + `useT()` hook

## Files to Modify (all 28 files with Czech text)

### Core UI Components
- `src/components/ui/date-range-filter.tsx` -- date range labels (Tento mesic, Minuly kvartal, etc.)

### Report Components
- `src/components/reports/AIInsightsTab.tsx` -- toasts, labels, placeholders
- `src/components/reports/AdsAIInsightsTab.tsx` -- toasts, labels, placeholders
- `src/components/reports/AIInsightsInputDialog.tsx` -- dialog labels, placeholders, buttons
- `src/components/reports/AIInsightsContent.tsx` -- section headers ("Zakladni prehled kampane"), placeholders
- `src/components/reports/AIInsightsContentPDF.tsx` -- section headers
- `src/components/reports/AdsAIInsightsContent.tsx` -- placeholders
- `src/components/reports/MonthlyAdsInsightsContent.tsx` -- section headers, placeholders
- `src/components/reports/QuarterlyAdsInsightsContent.tsx` -- section headers, placeholders
- `src/components/reports/YearlyAdsInsightsContent.tsx` -- section headers, placeholders
- `src/components/reports/CampaignAdsInsightsContent.tsx` -- section headers, placeholders
- `src/components/reports/ContentPreviewCard.tsx` -- "Zobrazit obsah"
- `src/components/reports/EditableDataTable.tsx` -- "Zobrazit vice"
- `src/components/reports/CreateReportDialog.tsx` -- period options labels
- `src/components/reports/CreateContentDialog.tsx` -- placeholders
- `src/components/reports/EditContentDialog.tsx` -- placeholders
- `src/components/reports/AdsOverviewTab.tsx` -- empty state text
- `src/components/reports/CreatorPerformanceCard.tsx` -- AI-generated sentence fragments
- `src/components/reports/OverviewTab.tsx` -- tooltips with Czech descriptions

### Admin Components
- `src/components/admin/PromptsTab.tsx` -- toasts, labels, empty states

### Brand Components
- `src/components/brands/BrandAIInsights.tsx` -- toasts, empty states

### Navigation
- `src/components/MainNavigation.tsx` -- title attribute (minor)

## Technical Details

### `useT()` Hook
```typescript
// src/lib/translations.ts
import { useTranslation } from "@/contexts/TranslationContext";

const dict: Record<string, string> = {
  "Nepodařilo se načíst data": "Failed to load data",
  "Uložit změny": "Save changes",
  "Zobrazit více": "Show more",
  "Zrušit": "Cancel",
  "Tento měsíc": "This month",
  // ... all other strings
};

export const useT = () => {
  const { isEnglish } = useTranslation();
  return (czech: string) => isEnglish ? (dict[czech] || czech) : czech;
};
```

### Usage Pattern
```typescript
// Before
toast.error("Nepodařilo se načíst data");
<Button>Uložit změny</Button>

// After
const t = useT();
toast.error(t("Nepodařilo se načíst data"));
<Button>{t("Uložit změny")}</Button>
```

### For non-component contexts (toast callbacks inside async functions)
The `t()` function will be called at the top of the component and used inside handlers, so it always reflects current language state.

## Implementation Order
1. Create `src/lib/translations.ts` with complete dictionary and `useT` hook
2. Update all 28 files to import and use `useT()` for every Czech string
3. Verify no Czech strings remain when toggle is set to EN

