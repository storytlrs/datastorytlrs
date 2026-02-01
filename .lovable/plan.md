
# Plán: Odstranění targets ze sekce Inovativní a kvalitativní metriky

## Přehled

Odstraníme `target` prop z MetricTile komponent v sekci "Inovativní a kvalitativní metriky". Ponecháme pouze `benchmark` hodnoty, které zobrazují průměr ze všech reportů stejného typu v daném space.

---

## Aktuální stav

V sekci "Inovativní a kvalitativní metriky" se zobrazují:
- **value** - aktuální hodnota metriky
- **target** - hodnota z `kpiTargets.innovation` (která je paradoxně nastavena na benchmark hodnoty)
- **benchmark** - průměrná hodnota ze všech reportů stejného typu

Toto je matoucí, protože target a benchmark zobrazují podobné hodnoty.

---

## Požadovaný stav

V sekci "Inovativní a kvalitativní metriky" zobrazit pouze:
- **value** - aktuální hodnota metriky
- **benchmark** - průměrná hodnota ze všech reportů stejného typu v daném space (s popiskem "Avg:")

---

## Dotčený soubor

| Soubor | Změna |
|--------|-------|
| `src/components/reports/AIInsightsContent.tsx` | Odstranění `target` prop ze 4 MetricTile komponent |

---

## Změny

### AIInsightsContent.tsx (řádky 641-672)

Odstraníme `target` prop ze všech čtyř MetricTile v sekci innovation metrics:

**TSWB Cost (řádky 641-648)**
```tsx
<MetricTile
  title="TSWB Cost"
  value={formatCurrency(insights.innovation_metrics.tswbCost, insights.innovation_metrics.currency)}
  icon={Clock}
  accentColor="green"
  benchmark={insights.benchmarks?.tswbCost !== undefined ? formatCurrency(insights.benchmarks.tswbCost, insights.innovation_metrics.currency) : undefined}
/>
```

**Interactions (řádky 649-656)**
```tsx
<MetricTile
  title="Interactions"
  value={formatNumber(insights.innovation_metrics.interactions)}
  icon={Heart}
  accentColor="green"
  benchmark={insights.benchmarks?.interactions !== undefined ? formatNumber(insights.benchmarks.interactions) : undefined}
/>
```

**Engagement Rate (řádky 657-664)**
```tsx
<MetricTile
  title="Engagement Rate"
  value={formatPercent(insights.innovation_metrics.engagementRate)}
  icon={TrendingUp}
  accentColor="green"
  benchmark={insights.benchmarks?.engagementRate !== undefined ? formatPercent(insights.benchmarks.engagementRate) : undefined}
/>
```

**Virality Rate (řádky 665-672)**
```tsx
<MetricTile
  title="Virality Rate"
  value={formatPercent(insights.innovation_metrics.viralityRate)}
  icon={MessageSquare}
  accentColor="green"
  benchmark={insights.benchmarks?.viralityRate !== undefined ? formatPercent(insights.benchmarks.viralityRate) : undefined}
/>
```

---

## Výsledné zobrazení

```text
┌─────────────────────────────┐
│  ENGAGEMENT RATE      📈    │
│                             │
│  4.25%                      │  ← aktuální hodnota (tučně)
│  Avg: 3.80%                 │  ← benchmark (šedý)
└─────────────────────────────┘
```

---

## Poznámky

- Sekce "Základní metriky" (Overview) si ponechá `target` hodnoty, protože ty jsou počítány z plánovaných hodnot v creators tabulce
- `kpiTargets.innovation` objekt zůstane v edge funkci pro případné budoucí použití, ale nebude se zobrazovat v UI
