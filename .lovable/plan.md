

# Translate Tile Titles and Labels in Brand AI Insights

## Problem
In the Brand AI Insights section, tile titles like "Celkovy prehled aktivit brandu" and chart labels like "Pozitivni", "Negativni", "Neutralni" remain in Czech even when English mode is active. The `InsightTile` component renders `tile.title`, `tile.subtitle`, `tile.benchmark`, and chart data names without any translation.

## Solution

### File: `src/components/brands/InsightTile.tsx`

1. **Import `TranslatedText`** from `@/components/ui/TranslatedText`
2. **Wrap `tile.title`** with `<TranslatedText>` in all four tile types (metric, chart, content_preview, text) -- lines 79, 98, 150, 222
3. **Wrap `tile.benchmark`** and **`tile.subtitle`** with `<TranslatedText>` in the metric tile (lines 84, 87)
4. **Translate chart data labels**: For pie chart labels (line 111), the `name` values come from data (e.g., "Pozitivni"). Use the `useTranslatedText` hook or translate the chart data names. Since chart labels are rendered inside Recharts (not as React elements), the best approach is to pre-translate the chart data names using `useTranslatedText` for each name, or add a wrapper sub-component for chart tiles that translates the data.

Since Recharts label functions return strings (not JSX), the simplest reliable approach for chart labels is to create a small `ChartTile` sub-component (like `TextTile`) that uses multiple `useTranslatedText` hooks to translate the `name` fields in `chart_data` before passing them to Recharts.

### Changes summary

```text
InsightTile.tsx:
  - All tile.title occurrences: {tile.title} -> <TranslatedText text={tile.title} />
  - Metric tile.benchmark: {tile.benchmark} -> <TranslatedText text={tile.benchmark} />
  - Metric tile.subtitle: {tile.subtitle} -> <TranslatedText text={tile.subtitle} />
  - Chart tile: Extract into <ChartTile> sub-component that translates chart_data names via useTranslatedText
  - TextTile title (line 222): same <TranslatedText> wrap
```

No other files need changes.
