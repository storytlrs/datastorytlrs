

# Vylepšení AI Insights -- konkrétnost, benchmarky, big picture

## Problem
Aktualni AI Insights generuji genericke dlazdice bez kontextu (obdobi, zdroj reportu), bez srovnani (benchmark vs. aktualni), a neplni funkci "big picture" prehledu aktivit brandu. Prompt je prilis vseobecny a data posilana do AI postradi klicove informace (KPI cile, per-report breakdown, TSWB, sentiment, watch_time).

## Zmeny

### 1. Edge Function: rozsirit data kontext

Doplnit do datoveho kontextu posilaneho AI:

- **Per-report breakdown**: u kazdeho reportu zahrnout jeho nazev, typ, obdobi (start_date -- end_date), a jeho agregovane metriky (views, ER, cost, TSWB, sentiment breakdown). AI tak muze rikat "v reportu X za obdobi Y..."
- **KPI targets**: nacist z tabulky `kpi_targets` planovane vs. skutecne hodnoty a zahrnout je -- AI bude moci prioritizovat podle cilovych metrik
- **TSWB vypocet**: watch_time + likes*3 + comments*5 + (saves+shares+reposts)*10, agregovat per report i celkove
- **TSWB Cost**: total cost / TSWB v minutach
- **Sentiment breakdown**: pocet positive/negative/neutral/mixed sentimentu per report
- **Watch time**: celkovy a prumery, vcetne avg_watch_time
- **Per-creator stats**: creator handle + report name + total views, total cost, content count, avg ER, TSWB -- aby AI mohl identifikovat "nejlepsiho influencera"
- **Per-campaign stats**: campaign name + spend + impressions + CPM + CTR -- pro "nejlepsi kampan"

### 2. Edge Function: prepsat system prompt

Novy prompt bude mnohem specificjsi:

- Vyzadovat ze kazda dlazdice musi obsahovat konkretni cisla, nazvy reportu/kampani/creatoru a obdobi
- Vyzadovat benchmarky: srovnani nejlepsiho vs. prumeru vs. nejhorsiho kde to dava smysl
- Definovat prioritni metriky: **Views, ER, CPM, TSWB Cost, Sentiment**
- Vyzadovat "big picture" dlazdici (typ text) jako prvni -- shrnuti vsech aktivit, kolik reportu, kolik creatoru, kolik kampani, celkovy budget
- Vyzadovat profesionalni, strucny a srozumitelny jazyk
- Vyzadovat ze AI musi zohlednit KPI cile (pokud existuji) a prioritizovat podle nich
- Instruovat AI aby pouzival ruzne velikosti dlazdic (size field: "small", "medium", "large")

### 3. Tile data model: pridat `size` field

Pridat do tile schematu novy field:
- `size`: `"small"` (1 col), `"medium"` (1 col, vyssi), `"large"` (2 cols span)

To umozni AI rozhodovat o velikosti dlazdic podle priority a mnozstvi obsahu.

### 4. UI: InsightTile.tsx -- podpora ruznych velikosti

- `small`: kompaktni metrika (soucasny vzhled)
- `medium`: standardni (chart, content preview)
- `large`: `col-span-2`, pro textove shrnuti nebo velke grafy

### 5. UI: BrandAIInsights.tsx -- grid layout

Zmenit grid na auto-fill s podporou `col-span-2` pro large tiles.

## Technicke detaily

### Soubor: `supabase/functions/generate-space-ai-insights/index.ts`

**Nove datove zdroje (pridano do Promise.all):**
- `kpi_targets` -- nacist vsechny KPI targets pro vsechny reporty v space
- Rozsirit content SELECT o `watch_time`, `avg_watch_time`, `sentiment`, `shares`, `saves`, `reposts`

**Per-report agregace:**
```text
reports.map(report => ({
  name, type, period, start_date, end_date,
  content_count, total_views, avg_er, total_cost,
  tswb, tswb_cost, sentiment: { positive, negative, neutral, mixed },
  kpi_targets: [{ kpi_name, planned_value, actual_value }]
}))
```

**Per-creator agregace:**
```text
creators.map(creator => ({
  handle, platform, report_name,
  content_count, total_views, total_cost, avg_er, tswb
}))
```

**Novy system prompt (klicove casti):**
- "Kazda dlazdice MUSI obsahovat konkretni cisla a nazvy (report, kampan, creator)"
- "U metrik uvadej srovnani: hodnota vs. prumer vsech reportu"
- "Prioritni metriky: Views, Engagement Rate, CPM, TSWB Cost, Sentiment"
- "Prvni dlazdice (priority 1) musi byt 'Prehled aktivit' typu text, size large"
- "Zohledni KPI cile pokud existuji -- prioritizuj dlazdice podle plneni/neplneni cilu"
- "Pouzij ruzne velikosti: small pro jednoduche metriky, medium pro grafy, large pro shrnuti"
- "Bud profesionalni, strucny, konkretni. Zadne vseobecne fraze."

**Novy tool schema -- pridano:**
- `size`: enum `["small", "medium", "large"]`
- `benchmark`: string (volitelny, pro srovnavaci text pod hodnotou)

### Soubor: `src/components/brands/InsightTile.tsx`

- Pridat `size` a `benchmark` do `TileData` interface
- Metric tile: zobrazit benchmark pod hodnotou (mensi font, sedy text)
- Exportovat CSS tridu na zaklade `size` pro pouziti v gridu

### Soubor: `src/components/brands/BrandAIInsights.tsx`

- Zmenit grid renderovani: kazda dlazdice dostane `className` podle `tile.size` -- `lg:col-span-2` pro "large"

### Upravovane soubory
1. `supabase/functions/generate-space-ai-insights/index.ts` -- rozsireni dat + novy prompt
2. `src/components/brands/InsightTile.tsx` -- size + benchmark podpora
3. `src/components/brands/BrandAIInsights.tsx` -- grid layout s col-span

