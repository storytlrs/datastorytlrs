
# Plán: Jednotné benchmark KPI targets pro Innovation metriky

## Přehled

Aktuálně jsou Innovation KPI targets počítány nekonzistentně:
- **TSWB Cost, ER, Virality Rate**: Benchmarky z ostatních reportů v brand space
- **Interactions**: Plánovaná data z creatorů v aktuálním reportu

Uživatel požaduje:
1. **Všechny** Innovation targets (včetně Interactions) mají být benchmarky z reportů v brand space
2. Pokud existuje pouze jeden report ve space, použije se fallback z aktuálního reportu

---

## Změny

**Soubor:** `supabase/functions/generate-ai-insights/index.ts`

### 1. Rozšíření výpočtu benchmarků o Interactions

Přidáme `benchmarkInteractions` do benchmark kalkulace:

```typescript
// Řádky ~69-72 - přidat novou proměnnou
let benchmarkER = 0;
let benchmarkVirality = 0;
let benchmarkTswbCost = 0;
let benchmarkInteractions = 0;  // Nové
let benchmarkCount = 0;
```

A do smyčky přes benchmark content (řádky ~82-95):

```typescript
benchmarkContent.forEach((c) => {
  // ... existující logika pro ER, Virality, TSWB ...
  
  // Nové - přidat Interactions
  benchmarkInteractions += (c.likes || 0) + (c.comments || 0) + 
                           (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
  
  benchmarkCount++;
});

// Po smyčce - výpočet průměru
if (benchmarkCount > 0) {
  benchmarkER /= benchmarkCount;
  benchmarkVirality /= benchmarkCount;
  benchmarkTswbCost /= benchmarkCount;
  benchmarkInteractions /= benchmarkCount;  // Nové
}
```

### 2. Přidání fallback logiky pro jediný report ve space

Pokud neexistují jiné reporty, použít aktuální report data:

```typescript
// Po benchmark kalkulaci (kolem řádku 103)
const hasBenchmarks = spaceReports && spaceReports.length > 0 && benchmarkCount > 0;

// Fallback - použít aktuální report data
if (!hasBenchmarks && content && content.length > 0) {
  let fallbackER = 0;
  let fallbackVirality = 0;
  let fallbackTswbCost = 0;
  let fallbackInteractions = 0;
  let fallbackCount = 0;
  
  content.forEach((c) => {
    if (c.engagement_rate) fallbackER += c.engagement_rate;
    
    const views = (c.views || 0);
    const shares = (c.shares || 0) + (c.reposts || 0);
    if (views > 0) {
      fallbackVirality += (shares / views) * 100;
    }
    
    const tswb = (c.watch_time || 0) + ((c.likes || 0) * 3) + ((c.comments || 0) * 5) + 
                 (((c.saves || 0) + (c.shares || 0) + (c.reposts || 0)) * 10);
    const tswbMinutes = tswb / 60;
    if (tswbMinutes > 0 && c.cost) {
      fallbackTswbCost += c.cost / tswbMinutes;
    }
    
    fallbackInteractions += (c.likes || 0) + (c.comments || 0) + 
                            (c.saves || 0) + (c.shares || 0) + (c.reposts || 0);
    
    fallbackCount++;
  });
  
  if (fallbackCount > 0) {
    benchmarkER = fallbackER / fallbackCount;
    benchmarkVirality = fallbackVirality / fallbackCount;
    benchmarkTswbCost = fallbackTswbCost / fallbackCount;
    benchmarkInteractions = fallbackInteractions / fallbackCount;
  }
}
```

### 3. Aktualizace KPI targets struktury

Změnit `innovation.interactions` tak, aby používal benchmark:

```typescript
// Řádky ~139-144
return {
  overview: {
    creators: creators.length,
    content: totalPieces,
    views: totalExpectedViews,
    avgCpm: avgCpmTarget,
  },
  innovation: {
    tswbCost: benchmarkTswbCost,
    interactions: benchmarkInteractions,  // Změna z totalExpectedInteractions
    engagementRate: benchmarkER,
    viralityRate: benchmarkVirality,
  },
};
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `supabase/functions/generate-ai-insights/index.ts` | Jednotný benchmark výpočet pro všechny Innovation metriky + fallback logika |

---

## Technické detaily

### Logika výpočtu
1. Načíst všechny ostatní influencer reporty ve stejném brand space
2. Spočítat průměrné hodnoty (ER, Virality, TSWB Cost, Interactions) ze všech content pieces
3. **Fallback**: Pokud žádné jiné reporty neexistují, použít průměry z aktuálního reportu
4. Uložit tyto benchmarky jako `kpi_targets.innovation`

### Datový tok
```
Jiné reporty ve space existují?
    ├── ANO → Použít benchmark průměry z ostatních reportů
    └── NE → Použít fallback průměry z aktuálního reportu
```

### UI zobrazení
Změny ve frontendu nejsou potřeba - UI již správně zobrazuje `kpiTargets.innovation.interactions` target.
