
# Plán: Aktualizace Key Metrics pro Influencers Dashboard

## Požadovaná změna

Nahradíme stávající KPICard komponenty za MetricTile komponenty s novou strukturou metrik - bez target/benchmark hodnot.

---

## Struktura Key Metrics

### Řada 1 (modrý accent)

| KPI | Hodnota | Ikona |
|-----|---------|-------|
| **CREATORS** | Počet unikátních tvůrců | Users |
| **CONTENT** | Počet content pieces | FileText |
| **VIEWS** | Celkové views (impressions + views) | Eye |
| **AVG CPM** | (budget / views) × 1000 | DollarSign |

### Řada 2 (zelený accent)

| KPI | Hodnota | Ikona |
|-----|---------|-------|
| **TSWB COST** | budget / (TSWB v minutách) | Clock |
| **INTERACTIONS** | likes + comments + shares + saves | Heart |
| **ENGAGEMENT RATE** | (interakce / views) × 100 | TrendingUp |
| **VIRALITY RATE** | (shares / views) × 100 | MessageSquare |

---

## Vizuální náhled

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Key Metrics                                                                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ CREATORS    │  │ CONTENT     │  │ VIEWS       │  │ AVG CPM     │  (blue)     │
│  │ 👤          │  │ 📄          │  │ 👁          │  │ 💰          │              │
│  │ 7           │  │ 22          │  │ 2.6M        │  │ 104,68 Kč   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ TSWB COST   │  │ INTERACTIONS│  │ ENGAGEMENT  │  │ VIRALITY    │  (green)    │
│  │ ⏰          │  │ ❤️          │  │ RATE        │  │ RATE        │              │
│  │ 13,59 Kč    │  │ 53.4K       │  │ 📈 2.25%    │  │ 💬 0.16%    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementace

### 1. Přidat nové importy

```typescript
import { MetricTile } from "@/components/reports/MetricTile";
import { Heart, MessageSquare } from "lucide-react";
```

### 2. Rozšířit kpis useMemo

Přidat nové metriky:
- `interactions` - součet likes, comments, shares, saves
- `viralityRate` - (shares / views) × 100

```typescript
return {
  // ... stávající
  interactions: totalInteractions,
  viralityRate: totalViews > 0 ? (totalShares / totalViews) * 100 : 0,
};
```

### 3. Přidat helper funkci pro formátování velkých čísel

```typescript
const formatLargeNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString("cs-CZ");
};
```

### 4. Nahradit KPI sekci

```tsx
{/* Key Metrics */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold">Key Metrics</h3>
  
  {/* Row 1 - Blue accent */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <MetricTile
      title="Creators"
      value={kpis.uniqueCreators.toLocaleString()}
      icon={Users}
      accentColor="blue"
    />
    <MetricTile
      title="Content"
      value={kpis.contentPieces.toLocaleString()}
      icon={FileText}
      accentColor="blue"
    />
    <MetricTile
      title="Views"
      value={formatLargeNumber(kpis.views)}
      icon={Eye}
      accentColor="blue"
    />
    <MetricTile
      title="Avg CPM"
      value={formatCurrency(kpis.cpm, kpis.currency)}
      icon={DollarSign}
      accentColor="blue"
    />
  </div>
  
  {/* Row 2 - Green accent */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <MetricTile
      title="TSWB Cost"
      value={formatCurrency(kpis.tswbCostPerMinute, kpis.currency)}
      icon={Clock}
      accentColor="green"
    />
    <MetricTile
      title="Interactions"
      value={formatLargeNumber(kpis.interactions)}
      icon={Heart}
      accentColor="green"
    />
    <MetricTile
      title="Engagement Rate"
      value={`${kpis.engagementRate.toFixed(2)}%`}
      icon={TrendingUp}
      accentColor="green"
    />
    <MetricTile
      title="Virality Rate"
      value={`${kpis.viralityRate.toFixed(2)}%`}
      icon={MessageSquare}
      accentColor="green"
    />
  </div>
</div>
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/brands/BrandInfluencersDashboard.tsx` | Upravit - nahradit KPICard za MetricTile, přidat nové metriky |

---

## Výsledek

- 8 KPI karet rozdělených do 2 řad
- První řada (modrá): Creators, Content, Views, Avg CPM
- Druhá řada (zelená): TSWB Cost, Interactions, Engagement Rate, Virality Rate
- Bez target/benchmark hodnot - čisté jednoduché zobrazení
