

# Plán: Přidání benchmarků do sekce Inovativní a kvalitativní metriky

## Přehled

Přidáme benchmark hodnoty (průměr ze všech reportů stejného typu v daném space) pro všechny čtyři metriky v sekci "Inovativní a kvalitativní metriky":
- TSWB Cost
- Interactions
- Engagement Rate
- Virality Rate

Benchmarky se budou počítat výhradně z `content` tabulky (ne z `creators`).

---

## Dotčené soubory

| Soubor | Změny |
|--------|-------|
| `src/components/reports/MetricTile.tsx` | Přidání `benchmark` a `benchmarkLabel` props |
| `src/components/reports/LeaderboardTable.tsx` | Rozšíření `Benchmarks` interface o `interactions` |
| `src/components/reports/AIInsightsContent.tsx` | Předání benchmarků do MetricTile komponent |
| `supabase/functions/generate-ai-insights/index.ts` | Přidání `interactions` do benchmarks objektu + oprava filtrování podle typu reportu |

---

## Změny

### 1. MetricTile.tsx - Přidání benchmark podpory

Rozšíříme interface a UI:

```typescript
interface MetricTileProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  size?: "small" | "medium";
  target?: string | number;
  targetLabel?: string;
  benchmark?: string | number;     // NOVÉ
  benchmarkLabel?: string;         // NOVÉ - default "Avg:"
}
```

Přidáme zobrazení benchmarku pod hodnotu:

```tsx
<div className="flex-1 flex flex-col justify-end">
  <p className={cn("font-bold text-foreground", valueSize)}>{value}</p>
  {benchmark !== undefined && (
    <p className={cn("font-medium text-muted-foreground mt-1", titleSize)}>
      {benchmarkLabel || "Avg:"} {benchmark}
    </p>
  )}
  {target !== undefined && (
    <div className="flex items-center gap-1 text-muted-foreground mt-1">
      <Target className="w-3 h-3" />
      <span className={cn("font-medium", titleSize)}>
        {targetLabel || ""} {target}
      </span>
    </div>
  )}
</div>
```

### 2. LeaderboardTable.tsx - Rozšíření Benchmarks interface

```typescript
export interface Benchmarks {
  engagementRate: number;
  viralityRate: number;
  tswbCost: number;
  interactions: number;  // NOVÉ
}
```

### 3. generate-ai-insights/index.ts - Opravy edge funkce

**3a. Oprava filtrování podle typu reportu (řádky 62-67)**

Z:
```typescript
const { data: spaceReports } = await supabase
  .from("reports")
  .select("id")
  .eq("space_id", report.space_id)
  .eq("type", "influencer")  // Hardcoded!
  .neq("id", report_id);
```

Na:
```typescript
const { data: spaceReports } = await supabase
  .from("reports")
  .select("id")
  .eq("space_id", report.space_id)
  .eq("type", report.type)  // Dynamicky podle aktuálního reportu
  .neq("id", report_id);
```

**3b. Přidání interactions do benchmarks objektu (řádky 522-526)**

Z:
```typescript
benchmarks: {
  engagementRate: benchmarkER || avgER,
  viralityRate: benchmarkVirality || avgVirality,
  tswbCost: benchmarkTswbCost || tswbCost,
},
```

Na:
```typescript
benchmarks: {
  engagementRate: benchmarkER || avgER,
  viralityRate: benchmarkVirality || avgVirality,
  tswbCost: benchmarkTswbCost || tswbCost,
  interactions: benchmarkInteractions || totalInteractions,  // NOVÉ
},
```

### 4. AIInsightsContent.tsx - Předání benchmarků do MetricTile

V sekci innovation metrics (řádky 640-669) přidáme benchmark prop ke každému MetricTile:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <MetricTile
    title="TSWB Cost"
    value={formatCurrency(insights.innovation_metrics.tswbCost, insights.innovation_metrics.currency)}
    icon={Clock}
    accentColor="green"
    target={kpiTargets?.innovation.tswbCost ? formatCurrency(kpiTargets.innovation.tswbCost, insights.innovation_metrics.currency) : undefined}
    benchmark={formatCurrency(insights.benchmarks.tswbCost, insights.innovation_metrics.currency)}
  />
  <MetricTile
    title="Interactions"
    value={formatNumber(insights.innovation_metrics.interactions)}
    icon={Heart}
    accentColor="green"
    target={kpiTargets?.innovation.interactions ? formatNumber(kpiTargets.innovation.interactions) : undefined}
    benchmark={insights.benchmarks.interactions ? formatNumber(insights.benchmarks.interactions) : undefined}
  />
  <MetricTile
    title="Engagement Rate"
    value={formatPercent(insights.innovation_metrics.engagementRate)}
    icon={TrendingUp}
    accentColor="green"
    target={kpiTargets?.innovation.engagementRate ? formatPercent(kpiTargets.innovation.engagementRate) : undefined}
    benchmark={formatPercent(insights.benchmarks.engagementRate)}
  />
  <MetricTile
    title="Virality Rate"
    value={formatPercent(insights.innovation_metrics.viralityRate)}
    icon={MessageSquare}
    accentColor="green"
    target={kpiTargets?.innovation.viralityRate ? formatPercent(kpiTargets.innovation.viralityRate) : undefined}
    benchmark={formatPercent(insights.benchmarks.viralityRate)}
  />
</div>
```

---

## Vizuální design

```text
┌─────────────────────────────┐
│  ENGAGEMENT RATE      📈    │
│                             │
│  4.25%                      │  ← aktuální hodnota (tučně)
│  Avg: 3.80%                 │  ← benchmark (šedý)
│  🎯 5.00%                   │  ← target (s ikonou)
└─────────────────────────────┘
```

---

## Výpočet benchmarků (z content tabulky)

| Metrika | Vzorec |
|---------|--------|
| TSWB Cost | AVG(cost / tswb_minutes) ze všech content v reportech stejného typu |
| Interactions | AVG(likes + comments + saves + shares + reposts) ze všech content |
| Engagement Rate | AVG(engagement_rate) ze všech content |
| Virality Rate | AVG((shares + reposts) / views * 100) ze všech content |

---

## Pořadí implementace

1. Upravit `MetricTile.tsx` - přidat benchmark props a UI
2. Upravit `LeaderboardTable.tsx` - rozšířit Benchmarks interface
3. Upravit edge funkci - opravit filtr typu + přidat interactions
4. Nasadit edge funkci
5. Upravit `AIInsightsContent.tsx` - předat benchmarky do MetricTile

---

## Poznámky

- Pro existující reporty bude potřeba kliknout na "Regenerate" v AI Insights, aby se nová data s `benchmarks.interactions` naplnila
- Pokud v daném space není jiný report stejného typu, použije se jako benchmark průměr z aktuálního reportu (fallback logika už existuje v edge funkci)

