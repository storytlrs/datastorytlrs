
# Plán: Přidání Benchmarků do Report Overview KPIs

## Přehled

Přidáme benchmark (průměrnou hodnotu ze všech reportů v daném space) ke každé KPI metrice v Overview sekci reportů. Benchmark se zobrazí šedým textem pod hodnotou metriky, ve stejném stylu jako název KPI.

---

## Architektura řešení

### Výpočet benchmarku

Pro každý report potřebujeme:
1. Zjistit `space_id` aktuálního reportu
2. Načíst všechny ostatní reporty v daném space
3. Načíst content a creators data ze všech těchto reportů
4. Vypočítat průměrné hodnoty pro každou metriku
5. Zobrazit tyto benchmarky v KPICard komponentě

### Vzorec výpočtu

```text
Benchmark pro metriku X = SUM(hodnota X ze všech reportů v space) / počet reportů
```

---

## Dotčené soubory

| Soubor | Změny |
|--------|-------|
| `src/components/reports/KPICard.tsx` | Přidání podpory pro benchmark prop |
| `src/components/reports/OverviewTab.tsx` | Načtení space benchmarků, předání do KPICard |

---

## Změny

### 1. KPICard.tsx - Rozšíření interface a UI

**Přidání props pro benchmark:**

```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  tooltip?: string;
  benchmark?: string | number;  // NOVÉ
  benchmarkLabel?: string;      // NOVÉ - např. "Avg:" nebo "Space avg:"
}
```

**Přidání zobrazení benchmarku pod hodnotu:**

Benchmark se zobrazí stejným stylem jako title (šedá, menší text):

```tsx
<div className="space-y-1">
  <p className="text-3xl font-bold text-foreground">
    {value}
  </p>
  {benchmark !== undefined && (
    <p className="text-sm font-medium text-muted-foreground">
      {benchmarkLabel || "Avg:"} {benchmark}
    </p>
  )}
  {change !== undefined && (
    <p className={cn("text-sm font-medium", changeColor)}>
      {change > 0 ? "+" : ""}{change}%
    </p>
  )}
</div>
```

### 2. OverviewTab.tsx - Načtení a výpočet benchmarků

**Krok 1: Přidání stavů pro space data**

```typescript
const [spaceId, setSpaceId] = useState<string | null>(null);
const [spaceContent, setSpaceContent] = useState<Content[]>([]);
const [spaceCreators, setSpaceCreators] = useState<Creator[]>([]);
const [spaceReportCount, setSpaceReportCount] = useState(0);
```

**Krok 2: Rozšíření useEffect pro načtení dat**

1. Nejprve načíst report pro získání `space_id`
2. Potom načíst všechny reporty v daném space
3. Načíst content a creators pro všechny reporty v space
4. Uložit do stavů

```typescript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    
    // 1. Načíst aktuální report pro space_id
    const { data: reportData } = await supabase
      .from("reports")
      .select("space_id")
      .eq("id", reportId)
      .single();
    
    const currentSpaceId = reportData?.space_id;
    setSpaceId(currentSpaceId);
    
    // 2. Načíst všechny reporty v space
    const { data: spaceReports } = await supabase
      .from("reports")
      .select("id")
      .eq("space_id", currentSpaceId);
    
    const allReportIds = spaceReports?.map(r => r.id) || [];
    setSpaceReportCount(allReportIds.length);
    
    // 3. Načíst content a creators pro aktuální report
    const [creatorsRes, contentRes] = await Promise.all([
      supabase.from("creators").select("...").eq("report_id", reportId),
      supabase.from("content").select("...").eq("report_id", reportId),
    ]);
    
    // 4. Načíst content a creators pro všechny reporty v space (pro benchmark)
    const [spaceCreatorsRes, spaceContentRes] = await Promise.all([
      supabase.from("creators").select("...").in("report_id", allReportIds),
      supabase.from("content").select("...").in("report_id", allReportIds),
    ]);
    
    setCreators(creatorsRes.data || []);
    setContent(contentRes.data || []);
    setSpaceCreators(spaceCreatorsRes.data || []);
    setSpaceContent(spaceContentRes.data || []);
    setLoading(false);
  };
  fetchData();
}, [reportId]);
```

**Krok 3: Výpočet benchmarků pomocí useMemo**

```typescript
const benchmarks = useMemo(() => {
  if (spaceReportCount === 0) return null;
  
  // Awareness benchmarks
  const totalReach = spaceContent.reduce((sum, c) => sum + (c.reach || 0), 0);
  const totalViews = spaceContent.reduce((sum, c) => sum + (c.impressions || 0) + (c.views || 0), 0);
  const totalWatchTime = spaceContent.reduce((sum, c) => sum + (c.watch_time || 0), 0);
  
  // Engagement benchmarks
  const totalLikes = spaceContent.reduce((sum, c) => sum + (c.likes || 0), 0);
  const totalComments = spaceContent.reduce((sum, c) => sum + (c.comments || 0), 0);
  const totalShares = spaceContent.reduce((sum, c) => sum + (c.shares || 0), 0);
  const totalSaves = spaceContent.reduce((sum, c) => sum + (c.saves || 0), 0);
  const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
  const avgEngagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
  // ... další metriky
  
  // Effectiveness benchmarks
  const avgBudget = spaceCreators.reduce((sum, c) => {
    return sum + 
      (c.posts_count || 0) * (c.posts_cost || 0) +
      (c.reels_count || 0) * (c.reels_cost || 0) +
      (c.stories_count || 0) * (c.stories_cost || 0);
  }, 0) / spaceReportCount;
  
  // Avg CPM, CPC etc.
  
  return {
    reach: totalReach / spaceReportCount,
    views: totalViews / spaceReportCount,
    watchTime: totalWatchTime / spaceReportCount,
    interactions: totalInteractions / spaceReportCount,
    likes: totalLikes / spaceReportCount,
    // ... všechny metriky
    engagementRate: avgEngagementRate,
    budget: avgBudget,
    cpm: avgCPM,
    cpc: avgCPC,
  };
}, [spaceContent, spaceCreators, spaceReportCount]);
```

**Krok 4: Předání benchmarků do KPICard**

```tsx
<KPICard 
  title="Reach" 
  value={formatNumber(awarenessKPIs.reach)} 
  icon={Users} 
  accentColor="blue"
  benchmark={benchmarks ? formatNumber(benchmarks.reach) : undefined}
  benchmarkLabel="Avg:"
/>

<KPICard 
  title="Engagement Rate" 
  value={formatPercent(engagementKPIs.engagementRate)} 
  icon={TrendingUp} 
  accentColor="green"
  benchmark={benchmarks ? formatPercent(benchmarks.engagementRate) : undefined}
  benchmarkLabel="Avg:"
/>
```

---

## Seznam všech KPI metrik s benchmarky

### Awareness (3 metriky)
| Metrika | Benchmark výpočet |
|---------|-------------------|
| Reach | SUM(reach) / počet reportů |
| Views | SUM(impressions + views) / počet reportů |
| Watch Time | SUM(watch_time) / počet reportů |

### Engagement (12 metrik)
| Metrika | Benchmark výpočet |
|---------|-------------------|
| Interactions | SUM(likes+comments+shares+saves) / počet reportů |
| Likes | SUM(likes) / počet reportů |
| Comments | SUM(comments) / počet reportů |
| Shares | SUM(shares) / počet reportů |
| Saves | SUM(saves) / počet reportů |
| Reposts | SUM(reposts) / počet reportů |
| TSWB | SUM(tswb) / počet reportů |
| Engagement Rate | AVG((interactions/views)*100) napříč reporty |
| Virality Rate | AVG((shares/views)*100) napříč reporty |
| Utility Score | AVG((saves/views)*100) napříč reporty |
| Link Clicks | SUM(link_clicks) / počet reportů |
| Sticker Clicks | SUM(sticker_clicks) / počet reportů |

### Effectiveness (6 metrik)
| Metrika | Benchmark výpočet |
|---------|-------------------|
| Creators | Počet creators / počet reportů |
| Content Pieces | Počet content / počet reportů |
| Budget Spent | SUM(budget) / počet reportů |
| TSWB Cost per Minute | AVG(budget / tswb_minutes) |
| CPM | AVG((budget/views)*1000) |
| CPC | AVG(budget/link_clicks) |

---

## Vizuální design

```text
┌─────────────────────────────────┐
│  REACH                    👤    │
│                                 │
│  2.5M                           │
│  Avg: 1.8M                      │  ← šedý text, stejná velikost jako title
└─────────────────────────────────┘
```

Benchmark text:
- Barva: `text-muted-foreground` (šedá)
- Velikost: `text-sm` (stejná jako title)
- Font weight: `font-medium`
- Prefix: "Avg:" nebo bez prefixu

---

## Technické poznámky

### Optimalizace výkonu
- Všechna data se načtou jedním dotazem při loadování komponenty
- Benchmarky se počítají pomocí useMemo - přepočítají se pouze při změně dat
- Použití `.in("report_id", allReportIds)` pro efektivní batch query

### Edge cases
- Pokud je v space pouze jeden report, benchmark = aktuální hodnoty
- Pokud nejsou žádná data, benchmark se nezobrazí
- Prázdné/null hodnoty se počítají jako 0

### Formátování
- Čísla: formatNumber() - 1.2K, 2.5M
- Procenta: formatPercent() - 2.25%
- Měna: formatCurrency() - 1 234 Kč
- Čas: secondsToReadableTime() - 2d 5h 30m
