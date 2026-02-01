
# Plán: Odstranění linky pod headliny

## Přehled

Odstraníme `border-b border-border pb-2` z `<h2>` tagů v šesti sekcích AI Insights.

## Změny

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

| Sekce | Řádek | Změna |
|-------|-------|-------|
| Executive Summary | 427 | Odstranit `border-b border-border pb-2` |
| Top Five Content | 497 | Odstranit `border-b border-border pb-2` |
| Základní přehled kampaně | 534 | Odstranit `border-b border-border pb-2` |
| Inovativní a kvalitativní metriky | 574 | Odstranit `border-b border-border pb-2` |
| Sentiment kampaně | 614 | Odstranit `border-b border-border pb-2` |
| Creators Leaderboard | 654 | Odstranit `border-b border-border pb-2` |

### Příklad změny

```tsx
// Před
<h2 className="text-xl font-bold mb-4 border-b border-border pb-2">

// Po
<h2 className="text-xl font-bold mb-4">
```

### Poznámka

Sekce **Content Performance** (řádek 669) a **Summary & Takeaways** (řádek 724) již byly upraveny dříve a border nemají.
