
# Plán: Oprava výpočtu benchmarků a TSWB Cost v AI Insights

## Identifikované problémy

| Problém | Aktuální stav | Správný stav |
|---------|---------------|--------------|
| Benchmark Interactions | 2 427 (= 53 410 / 22 content pieces) | 53 410 (průměr per report, ne per content) |
| TSWB Cost | 0 Kč (bere cost z content tabulky = NULL) | 13,59 Kč (z plánovaného budgetu creators) |
| Fallback (1 report) | Průměr per content item | Identické hodnoty jako aktuální report |

---

## Dotčený soubor

| Soubor | Změny |
|--------|-------|
| `supabase/functions/generate-ai-insights/index.ts` | Oprava výpočtu benchmarků a TSWB Cost |

---

## Změny

### 1. Oprava výpočtu TSWB Cost (řádky 245-246)

Použít plánovaný budget z creators místo `totalCost` z content:

```typescript
// Calculate budget from creators (planned costs)
let totalBudget = 0;
creators?.forEach((c: any) => {
  totalBudget += ((c.posts_count || 0) * (c.posts_cost || 0)) +
                 ((c.reels_count || 0) * (c.reels_cost || 0)) +
                 ((c.stories_count || 0) * (c.stories_cost || 0));
});

const tswbMinutes = totalTswb / 60;
const tswbCost = tswbMinutes > 0 ? totalBudget / tswbMinutes : 0;
```

### 2. Oprava výpočtu benchmarků z jiných reportů (řádky 75-106)

Místo průměru per content item, počítat celkové součty per report a pak průměrovat:

```typescript
if (spaceReports && spaceReports.length > 0) {
  const reportIds = spaceReports.map((r) => r.id);
  
  // Pro každý report v space počítat celkové hodnoty
  for (const reportId of reportIds) {
    const { data: reportContent } = await supabase
      .from("content")
      .select("engagement_rate, shares, reposts, views, watch_time, likes, comments, saves")
      .eq("report_id", reportId);
    
    const { data: reportCreators } = await supabase
      .from("creators")
      .select("posts_count, posts_cost, reels_count, reels_cost, stories_count, stories_cost")
      .eq("report_id", reportId);
    
    if (reportContent && reportContent.length > 0) {
      // Součty pro tento report
      let reportER = 0, reportERCount = 0;
      let reportVirality = 0, reportViralityCount = 0;
      let reportInteractions = 0;
      let reportTswb = 0;
      
      reportContent.forEach((c) => {
        if (c.engagement_rate) { reportER += c.engagement_rate; reportERCount++; }
        const views = c.views || 0;
        const shares = (c.shares || 0) + (c.reposts || 0);
        if (views > 0) { reportVirality += (shares / views) * 100; reportViralityCount++; }
        reportInteractions += (c.likes || 0) + (c.comments || 0) + (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
        reportTswb += (c.watch_time || 0) + ((c.likes || 0) * 3) + ((c.comments || 0) * 5) + 
                      (((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10);
      });
      
      // Budget z creators
      let reportBudget = 0;
      reportCreators?.forEach((c: any) => {
        reportBudget += ((c.posts_count || 0) * (c.posts_cost || 0)) +
                        ((c.reels_count || 0) * (c.reels_cost || 0)) +
                        ((c.stories_count || 0) * (c.stories_cost || 0));
      });
      
      // Přidat průměry tohoto reportu do celkových benchmarků
      if (reportERCount > 0) benchmarkER += reportER / reportERCount;
      if (reportViralityCount > 0) benchmarkVirality += reportVirality / reportViralityCount;
      benchmarkInteractions += reportInteractions;  // Celkové interactions per report
      const reportTswbMinutes = reportTswb / 60;
      if (reportTswbMinutes > 0) benchmarkTswbCost += reportBudget / reportTswbMinutes;
      
      benchmarkCount++;
    }
  }
  
  // Vydělit počtem reportů
  if (benchmarkCount > 0) {
    benchmarkER /= benchmarkCount;
    benchmarkVirality /= benchmarkCount;
    benchmarkTswbCost /= benchmarkCount;
    benchmarkInteractions /= benchmarkCount;  // Průměr celkových interactions per report
  }
}
```

### 3. Oprava fallback logiky (řádky 109-146)

Když je pouze 1 report, použít identické hodnoty:

```typescript
const hasBenchmarks = spaceReports && spaceReports.length > 0 && benchmarkCount > 0;
if (!hasBenchmarks) {
  // Fallback: použít totožné hodnoty jako aktuální report
  benchmarkER = avgER;
  benchmarkVirality = avgVirality;
  benchmarkTswbCost = tswbCost;
  benchmarkInteractions = totalInteractions;
}
```

---

## Výsledné chování

| Metrika | Aktuální hodnota | Benchmark (1 report) |
|---------|------------------|---------------------|
| TSWB Cost | 13,59 Kč | 13,59 Kč |
| Interactions | 53.4K | 53.4K |
| Engagement Rate | 2.25% | 2.25% |
| Virality Rate | 0.16% | 0.16% |

Při více reportech bude benchmark průměrem celkových hodnot jednotlivých reportů.

---

## Implementační kroky

1. Upravit edge funkci `generate-ai-insights/index.ts`
2. Deploy edge funkce
3. Kliknout na "Regenerate" v AI Insights pro otestování
