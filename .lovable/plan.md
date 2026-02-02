

# Plán: Přidání nových metrik do grafu Influencers Dashboard

## Přehled změn

Rozšíříme graf o dalších 6 metrik tak, aby odpovídal metrikám v Key Metrics sekci a poskytoval kompletnější přehled.

---

## Aktuální vs. nové metriky

### Stávající metriky v grafu:
- Views
- Budget
- Creators
- Engagement Rate
- Watch Time

### Nové metriky k přidání:
- **Content** - počet content pieces za měsíc
- **CPM** - (budget / views) × 1000
- **TSWB Cost** - budget / (watch time v minutách)
- **Interactions** - likes + comments + shares + saves
- **Virality Rate** - (shares / views) × 100
- **TSWB** - celkový watch time (attention index)

---

## Finální seznam metrik v grafu

| Metrika | Klíč | Formátování |
|---------|------|-------------|
| Views | `views` | Číslo s K/M |
| Content | `content` | Celé číslo |
| Creators | `creators` | Celé číslo |
| Budget | `budget` | Měna |
| CPM | `cpm` | Měna |
| TSWB Cost | `tswbCost` | Měna |
| Interactions | `interactions` | Číslo s K/M |
| Engagement Rate | `engagementRate` | Procenta |
| Virality Rate | `viralityRate` | Procenta |
| Watch Time | `watchTime` | Minuty |
| TSWB | `tswb` | Sekundy/minuty |

---

## Technická implementace

### 1. Rozšíření typu `MetricKey`

```typescript
type MetricKey = 
  | "views" 
  | "content"
  | "budget" 
  | "cpm"
  | "tswbCost"
  | "creators" 
  | "interactions"
  | "engagementRate" 
  | "viralityRate"
  | "watchTime"
  | "tswb";
```

### 2. Rozšíření `chartData` useMemo

Přidat do měsíčního výpočtu:
- `content` - počet content pieces
- `shares` - pro výpočet virality
- `cpm` - vypočítat z budget/views
- `tswbCost` - vypočítat z budget/watchTime
- `viralityRate` - vypočítat ze shares/views
- `tswb` - watch time v sekundách

```typescript
monthlyData[monthKey].contentCount += 1;
monthlyData[monthKey].shares += c.shares || 0;
```

### 3. Rozšíření `metricLabels`

```typescript
const metricLabels: Record<MetricKey, string> = {
  views: "Views",
  content: "Content",
  budget: "Budget",
  cpm: "CPM",
  tswbCost: "TSWB Cost",
  creators: "Creators",
  interactions: "Interactions",
  engagementRate: "ER (%)",
  viralityRate: "Virality (%)",
  watchTime: "Watch Time",
  tswb: "TSWB",
};
```

### 4. Rozšíření `formatChartValue`

```typescript
case "cpm":
case "tswbCost":
  return formatCurrency(value, kpis.currency);
case "content":
case "interactions":
  return formatLargeNumber(value);
case "viralityRate":
  return `${value.toFixed(2)}%`;
case "tswb":
  return `${Math.round(value)}s`;
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/brands/BrandInfluencersDashboard.tsx` | Rozšířit - přidat nové metriky do grafu |

---

## Výsledek

- Graf bude mít 11 přepínatelných metrik
- Metriky budou odpovídat Key Metrics sekci
- Konzistentní formátování pro každý typ metriky
- Uživatel získá kompletní přehled měsíčních trendů

