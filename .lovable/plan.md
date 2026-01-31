
# Plán: Kompletní redesign AI Insights sekce pro Influencer Report

## Přehled změn

Rozdělíme AI Insights do samostatných editovatelných bloků s novou strukturou dat a výpočtů. Každý blok bude vizuálně oddělený a editovatelný samostatně.

---

## 1. Změny v hlavní komponentě `AIInsightsTab.tsx`

### 1.1 Odstranění headline "AI Insights"
- Odstranit `<h2 className="text-2xl font-bold">AI Insights</h2>` z hlavního wrapperu
- Zachovat pouze tlačítka v horní části (Generate, Regenerovat, Upravit raw)

### 1.2 Nový state management
```typescript
// State pro jednotlivé editovatelné bloky
const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

// State pro manuálně vybraný top content
const [selectedTopContent, setSelectedTopContent] = useState<string[]>([]);
```

---

## 2. Nová komponenta `AIInsightsContent.tsx` - kompletní redesign

### 2.1 Executive Summary Block
**Struktura:**
```text
┌─────────────────────────────────────────────────────────────┐
│ [Editovatelný textový odstavec shrnutí]                     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 🎯 Icon      │  │ 🚀 Icon      │  │ ⭐ Icon      │       │
│  │ Main Goal    │  │ What We Did  │  │ Highlights   │       │
│  │ [text]       │  │ [text]       │  │ [text]       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```
- Všechny texty editovatelné (textarea při edit mode)
- 3 dlaždice vedle sebe: ikona + headline + editovatelný text
- Ikony: Target, Rocket, Star (z Lucide)

### 2.2 Top 5 Content Block
**Změny:**
- Přidat tlačítko "Vybrat content" pro ruční výběr
- Dialog s výběrem z dostupného contentu v sekci Content (checkbox)
- Možnost drag & drop pro změnu pořadí
- Aktuální zobrazení ContentPreviewCard zůstává

### 2.3 Základní přehled kampaně Block
**Změny v MetricTile:**
- Přidat nový prop `target?: number` do MetricTile
- Přidat do dlaždic ikonu terče (Target) + hodnotu KPI targetu
- Text šedý, stejná velikost jako název, pravý dolní roh

**Výpočet KPI Targets (z Data - Creators):**
- **Creators Target**: `SUM(creators.length)` - počet creatorů v plánu
- **Content Target**: `SUM(posts_count + reels_count + stories_count)` ze všech creatorů
- **Views Target**: `SUM(avg_views * (posts_count + reels_count + stories_count))` 
- **Avg CPM Target**: `SUM(total_cost) / SUM(avg_views * total_pieces) * 1000`

```text
┌──────────────────────────────────────────────────────────────┐
│ [Editovatelný odstavec o efektivitě]                         │
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐│
│ │ Creators    │ │ Content     │ │ Views       │ │ Avg CPM   ││
│ │ 15          │ │ 47          │ │ 2.5M        │ │ 45 CZK    ││
│ │      🎯 10  │ │      🎯 50  │ │      🎯 2M  │ │    🎯 50  ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Inovativní a kvalitativní metriky Block
**KPI Targets = Benchmarky z ostatních reportů v Brand space:**
- Načíst všechny influencer reporty v daném space_id
- Vypočítat average hodnoty metrik: ER, Virality Rate, TSWB Cost
- Zobrazit jako target hodnoty v dlaždicích

### 2.5 Sentiment kampaně Block - kompletní redesign
**Nová struktura:**
```text
┌──────────────────────────────────────────────────────────────┐
│ Sentiment kampaně                                            │
│                                                               │
│ [Editovatelný summary text - analýza sentiment_summary]      │
│                                                               │
│ Average: POSITIVE / NEUTRAL / NEGATIVE (badge)               │
│                                                               │
│ Top témata:                                                   │
│ ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌───────┐│
│ │ Téma 1  │ │ Téma 2   │ │ Téma 3    │ │ Téma 4  │ │ Téma 5││
│ └─────────┘ └──────────┘ └───────────┘ └─────────┘ └───────┘│
└──────────────────────────────────────────────────────────────┘
```

**Výpočet:**
- Summary: AI analýza nad všemi `sentiment_summary` z Content table
- Average: Modus hodnoty `sentiment` ze všech content items
- Top 5 témat: Extrakce z AI nebo manuální zadání

**Barevné badges pro témata** (stejný styl jako StatusBadge):
- Různé barvy pro různá témata (green, blue, orange, purple, cyan)

### 2.6 Creators Leaderboard Block
**Změny:**
- Přejmenovat z "Influencer Leaderboard" na "Creators Leaderboard"
- Sloupec "Influencer" přejmenovat na "Creator"
- Úprava barev StatusBadge:
  - FAIL: `bg-accent-orange` (oranžová)
  - OK: `bg-accent-purple` (fialová) - NOVÁ
  - VIRAL: `bg-accent-blue` (modrá)
  - WOW!: `bg-accent-green` (zelená)

**Výpočet Status - vylepšená logika:**
```typescript
const getCreatorStatus = (creator, allCreators, benchmarks) => {
  // 1. Porovnání s benchmarky
  const erRatio = creator.er / benchmarks.er;
  const vrRatio = creator.virality / benchmarks.virality;
  const costRatio = benchmarks.tswbCost / creator.tswbCost; // inverted
  
  // 2. Porovnání mezi creatory (percentil)
  const erPercentile = getPercentile(creator.er, allCreators.map(c => c.er));
  const viewsPercentile = getPercentile(creator.views, allCreators.map(c => c.views));
  
  // 3. Kombinovaný score
  const benchmarkScore = (erRatio + vrRatio + costRatio) / 3;
  const relativeScore = (erPercentile + viewsPercentile) / 2;
  const combinedScore = (benchmarkScore * 0.6) + (relativeScore * 0.4);
  
  if (combinedScore >= 1.5) return "WOW!";
  if (combinedScore >= 1.2) return "VIRAL";
  if (combinedScore >= 0.8) return "OK";
  return "FAIL";
};
```

### 2.7 Content Performance Block - kompletní redesign
**Nová struktura pro každého creatora:**
```text
┌──────────────────────────────────────────────────────────────┐
│ @handle                                    instagram, tiktok │
│                                                               │
│ ┌────────────┐  Sentiment Breakdown:                         │
│ │  TOP POST  │  45% Positive | 35% Neutral | 20% Negative   │
│ │  preview   │                                               │
│ │            │  Relevance: HIGH / MEDIUM / LOW              │
│ └────────────┘                                               │
│                                                               │
│ Key Insight: [editovatelný text]                             │
│                                                               │
│ Positive Topics:    Negative Topics:                         │
│ ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐                          │
│ │topic│ │topic│    │topic│ │topic│                          │
│ └─────┘ └─────┘    └─────┘ └─────┘                          │
└──────────────────────────────────────────────────────────────┘
```

**Data pro každého creatora:**
- `handle`: z creators table
- `platforms`: agregované z content (může mít content na více platformách)
- `top_content`: dle metriky relevantní pro hlavní cíl kampaně
- `sentiment_breakdown`: % positive/neutral/negative z content items
- `relevance`: nové pole - jak relevantní jsou komentáře k brand message
- `key_insight`: editovatelný text
- `positive_topics`: pole stringů (barevné badges)
- `negative_topics`: pole stringů (barevné badges)

### 2.8 Summary & Takeaways Block
**Změny:**
- Přejmenovat z "Shrnutí a doporučení" na "Summary & Takeaways"
- Aktualizovat headlines:
  - "✓ Co funguje" → "✓ What Works"
  - "✗ Co nefunguje" → "✗ What Doesn't Work"  
  - "→ Doporučení" → "→ Recommendations"

---

## 3. Aktualizace komponenty `StatusBadge.tsx`

```typescript
const statusConfig: Record<StatusType, { bg: string; text: string }> = {
  "WOW!": { bg: "bg-accent-green", text: "text-accent-green-foreground" },
  "VIRAL": { bg: "bg-accent-blue", text: "text-white" },
  "OK": { bg: "bg-accent-purple", text: "text-white" }, // ZMĚNA z bg-muted
  "FAIL": { bg: "bg-accent-orange", text: "text-accent-orange-foreground" },
};
```

**Poznámka:** Je potřeba přidat `accent-purple` do Tailwind konfigurace pokud neexistuje.

---

## 4. Aktualizace komponenty `MetricTile.tsx`

```typescript
interface MetricTileProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  size?: "small" | "medium";
  target?: number | string; // NOVÉ - KPI target hodnota
  targetLabel?: string;     // NOVÉ - label pro target (default "Target")
}

// V renderingu přidat:
{target && (
  <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
    <Target className="w-3 h-3" />
    <span>{targetLabel || "Target"}: {target}</span>
  </div>
)}
```

---

## 5. Nová komponenta `TopicBadge.tsx`

Pro zobrazení témat v Sentiment a Content Performance sekcích:

```typescript
interface TopicBadgeProps {
  topic: string;
  variant?: "positive" | "negative" | "neutral";
}

const variantConfig = {
  positive: "bg-accent-green text-accent-green-foreground",
  negative: "bg-accent-orange text-accent-orange-foreground",
  neutral: "bg-accent-blue text-white",
};
```

---

## 6. Nová komponenta `ContentSelectorDialog.tsx`

Dialog pro ruční výběr Top 5 contentu:

```typescript
interface ContentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  maxSelections?: number; // default 5
}
```

- Zobrazí grid všech content items z Content sekce
- Checkbox pro výběr
- Drag & drop pro změnu pořadí
- Omezení na max 5 položek

---

## 7. Aktualizace komponenty `LeaderboardTable.tsx`

### 7.1 Změna názvu sloupce
- "Influencer" → "Creator"

### 7.2 Aktualizace getOverallStatus funkce
Implementovat vylepšenou logiku výpočtu statusu (viz bod 2.6)

---

## 8. Aktualizace Edge Function `generate-ai-insights`

### 8.1 Rozšířit AI prompt
Přidat generování:
- 5 nejčastějších témat ze sentiment analysis
- Relevance score pro každého creatora
- Key insight pro každého creatora
- Positive/negative topics pro každého creatora

### 8.2 Výpočet KPI Targets
Přidat do structured_data:
```typescript
kpi_targets: {
  overview: {
    creators: number;
    content: number;
    views: number;
    avgCpm: number;
  };
  innovation: {
    tswbCost: number;
    interactions: number;
    engagementRate: number;
    viralityRate: number;
  };
}
```

### 8.3 Rozšířit creator_performance strukturu
```typescript
creator_performance: {
  handle: string;
  platforms: string[]; // pole platforem
  top_content: TopContent | null;
  sentiment_breakdown: {
    positive: number; // percentage
    neutral: number;
    negative: number;
  };
  relevance: "high" | "medium" | "low";
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}[]
```

---

## 9. Databázové změny

### 9.1 Rozšířit `ai_insights_structured` JSONB schéma
Přidat:
- `selected_top_content_ids: string[]` - manuálně vybraný top content
- `kpi_targets` - vypočtené target hodnoty
- `top_sentiment_topics: string[]` - 5 nejčastějších témat
- Rozšířená `creator_performance` struktura

**Poznámka:** Není potřeba databázová migrace - JSONB pole jsou flexibilní.

---

## 10. Aktualizace Tailwind konfigurace

Přidat `accent-purple` pokud neexistuje:

```typescript
// tailwind.config.ts
extend: {
  colors: {
    'accent-purple': {
      DEFAULT: '#9795F9',
      foreground: '#000000',
    }
  }
}
```

---

## Souhrn souborů ke změně

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/components/reports/AIInsightsTab.tsx` | UPDATE | Odstranit headline, přidat state pro editaci |
| `src/components/reports/AIInsightsContent.tsx` | UPDATE | Kompletní redesign struktury bloků |
| `src/components/reports/StatusBadge.tsx` | UPDATE | Změna barev (OK → purple) |
| `src/components/reports/MetricTile.tsx` | UPDATE | Přidat target prop |
| `src/components/reports/LeaderboardTable.tsx` | UPDATE | Přejmenovat sloupec, update status logiky |
| `src/components/reports/TopicBadge.tsx` | CREATE | Nová komponenta pro témata |
| `src/components/reports/ContentSelectorDialog.tsx` | CREATE | Dialog pro výběr top contentu |
| `src/components/reports/CreatorPerformanceCard.tsx` | CREATE | Nová komponenta pro content performance |
| `supabase/functions/generate-ai-insights/index.ts` | UPDATE | Rozšířit AI prompt a výpočty |
| `tailwind.config.ts` | UPDATE | Přidat accent-purple (pokud neexistuje) |

---

## Technické poznámky

### Editace jednotlivých bloků
Každý blok bude mít:
- Edit button (ceruzka ikona) viditelný pro users s `canEdit` permission
- Při kliknutí se text oblasti změní na textarea
- Save button pro uložení změn do `ai_insights_structured`

### Výpočet KPI Targets z Creators
```typescript
const calculateOverviewTargets = (creators: Creator[]) => {
  const totalPieces = creators.reduce((sum, c) => 
    sum + (c.posts_count || 0) + (c.reels_count || 0) + (c.stories_count || 0), 0);
  
  const totalExpectedViews = creators.reduce((sum, c) => {
    const pieces = (c.posts_count || 0) + (c.reels_count || 0) + (c.stories_count || 0);
    return sum + ((c.avg_views || 0) * pieces);
  }, 0);
  
  const totalCost = creators.reduce((sum, c) => 
    sum + ((c.posts_count || 0) * (c.posts_cost || 0)) +
          ((c.reels_count || 0) * (c.reels_cost || 0)) +
          ((c.stories_count || 0) * (c.stories_cost || 0)), 0);
  
  return {
    creators: creators.length,
    content: totalPieces,
    views: totalExpectedViews,
    avgCpm: totalExpectedViews > 0 ? (totalCost / totalExpectedViews) * 1000 : 0,
  };
};
```

### Výpočet Benchmark pro Innovation Metrics
```typescript
const calculateBenchmarks = async (spaceId: string, currentReportId: string) => {
  // Fetch all influencer reports in this space except current
  const { data: reports } = await supabase
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .eq("type", "influencer")
    .neq("id", currentReportId);
  
  // Fetch content from all these reports and calculate averages
  // ...existing benchmark calculation logic...
};
```
