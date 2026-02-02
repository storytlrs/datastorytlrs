
# Plán: Brand Overview Sub-taby s Dashboard strukturou

## Přehled změn

Refaktorujeme Brand Overview tab na 3 sub-taby s odlišnými datovými zdroji:

| Sub-tab | Zdroj dat | Typ reportů |
|---------|-----------|-------------|
| **Content** | Automatický import (bude přidán později) | Organický obsah |
| **Ads** | Automatický import (bude přidán později) | Placené reklamy |
| **Influencers** | Import do Influencer reportů | `creators`, `content`, `promo_codes` |

---

## Vizuální struktura

```text
┌─────────────────────────────────────────────────────────────┐
│  Brand Name                            [🏢 Brand ▼]  [⚙][↗] │
├─────────────────────────────────────────────────────────────┤
│  [Overview]  [Insights]  [Reports]                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌────────┐ ┌─────────────┐                     │
│  │ Content │ │  Ads   │ │ Influencers │   (sub-taby)        │
│  └─────────┘ └────────┘ └─────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│  Filters: [Start Date] [End Date] [Platform ▼] [Clear]      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │  📊 Monthly Performance Chart                           ││
│  │  [Views] [Reach] [Engagement] [Budget] ...              ││
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Top 5 Content                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ 🎬  │ │ 🎬  │ │ 🎬  │ │ 🎬  │ │ 🎬  │                   │
│  │Card │ │Card │ │Card │ │Card │ │Card │                   │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
├─────────────────────────────────────────────────────────────┤
│  KPI Tiles                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Reach   │ │ Views   │ │ ER      │ │ Budget  │           │
│  │ 1.2M    │ │ 5.4M    │ │ 3.2%    │ │ 250K    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Struktura jednotlivých dashboardů

### 1. Content Dashboard

**Datový zdroj:** Připraví se na tabulku `brand_content` (bude přidána později pro automatický import)

**Graf - metriky:**
- Views (default)
- Reach
- Engagement Rate
- Content Pieces

**Top 5 Content:**
- Vyhodnocení skóre: `(views × 0.4) + (engagement_rate × 100 × 0.3) + (shares × 0.2) + (saves × 0.1)`
- Zobrazení pomocí `ContentPreviewCard` komponenty

**KPI Tiles:**

| KPI | Ikona | Výpočet |
|-----|-------|---------|
| Reach | Users | Součet reach |
| Views | Eye | Součet impressions + views |
| Engagement Rate | TrendingUp | (interakce / views) × 100 |
| Content Pieces | FileText | Počet obsahu |
| Avg Views/Content | Eye | Views / počet obsahu |
| Virality Rate | Zap | (shares / views) × 100 |

---

### 2. Ads Dashboard

**Datový zdroj:** Připraví se na tabulku `brand_ads` (bude přidána později pro automatický import)

**Graf - metriky:**
- Spend (default)
- Impressions
- Clicks
- CTR
- ROAS

**Top 5 Content (Ad Creatives):**
- Vyhodnocení skóre: `(roas × 0.4) + (ctr × 100 × 0.3) + (conversions × 0.2) + (clicks × 0.1)`
- Zobrazení pomocí upraveného `ContentPreviewCard`

**KPI Tiles:**

| KPI | Ikona | Výpočet |
|-----|-------|---------|
| Total Spend | DollarSign | Součet spend |
| Impressions | Eye | Součet impressions |
| Clicks | MousePointer | Součet clicks |
| CTR | TrendingUp | (clicks / impressions) × 100 |
| Conversions | Target | Součet conversions |
| ROAS | TrendingUp | Průměrný ROAS |
| CPM | DollarSign | (spend / impressions) × 1000 |
| CPC | MousePointer | spend / clicks |

---

### 3. Influencers Dashboard

**Datový zdroj:** Tabulky `creators`, `content`, `promo_codes` z Influencer reportů (existující data)

**Graf - metriky:**
- Views (default)
- Budget
- Creators
- Engagement Rate
- Watch Time

**Top 5 Content:**
- Vyhodnocení skóre: `(views × 0.3) + (engagement_rate × 100 × 0.25) + (watch_time × 0.25) + (tswb × 0.2)`
- Zobrazení pomocí `ContentPreviewCard` komponenty

**KPI Tiles:**

| KPI | Ikona | Výpočet |
|-----|-------|---------|
| Creators | Users | Počet unikátních tvůrců |
| Content Pieces | FileText | Počet obsahu |
| Total Budget | DollarSign | Součet (count × cost) z creators |
| Views | Eye | Součet impressions + views |
| Watch Time | Clock | Součet watch_time (DD:HH:MM) |
| TSWB | Award | Součet TSWB indexu |
| Engagement Rate | TrendingUp | Průměrná míra zapojení |
| TSWB Cost/Min | Clock | Budget / (TSWB v minutách) |

---

## Společné filtry (všechny sub-taby)

| Filtr | Typ | Možnosti |
|-------|-----|----------|
| Start Date | Calendar picker | Libovolné datum |
| End Date | Calendar picker | Libovolné datum |
| Platform | Select dropdown | All, Instagram, TikTok, YouTube, Facebook, Twitter |
| Clear | Button | Reset všech filtrů |

---

## Top 5 Content - Scoring algoritmus

Každý content dostane kompozitní skóre pro spravedlivé vyhodnocení:

**Pro Content a Influencers:**
```typescript
score = 
  (normalize(views) × 0.30) +
  (normalize(engagementRate) × 0.25) +
  (normalize(watchTime) × 0.25) +
  (normalize(shares + saves) × 0.20)
```

**Pro Ads:**
```typescript
score = 
  (normalize(roas) × 0.35) +
  (normalize(ctr) × 0.30) +
  (normalize(conversions) × 0.20) +
  (normalize(clicks) × 0.15)
```

---

## Technická implementace

### Nové komponenty

| Soubor | Popis |
|--------|-------|
| `src/components/brands/BrandContentDashboard.tsx` | Content sub-tab dashboard |
| `src/components/brands/BrandAdsDashboard.tsx` | Ads sub-tab dashboard |
| `src/components/brands/BrandInfluencersDashboard.tsx` | Influencers sub-tab dashboard |
| `src/components/brands/TopContentGrid.tsx` | Sdílená komponenta pro Top 5 content |

### Úprava existující komponenty

| Soubor | Změna |
|--------|-------|
| `src/components/brands/BrandOverviewTab.tsx` | Refaktor - přidat sub-taby, platform filtr, orchestrace dashboardů |

---

## Datová struktura

```typescript
// Společný filter state
interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string; // "all" | "instagram" | "tiktok" | ...
}

// Props pro všechny sub-dashboardy
interface DashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

// Top content item
interface TopContentItem {
  id: string;
  thumbnailUrl: string | null;
  contentType: string;
  platform: string;
  views: number;
  engagementRate: number;
  url: string | null;
  creatorHandle?: string;
  score: number;
}
```

---

## Připravenost na budoucí rozšíření

### Content a Ads taby

V první verzi:
- Zobrazí placeholder zprávu "Data import coming soon" nebo
- Načtou data z existujících tabulek (`content` pro always_on reporty, `ad_creatives` pro ads reporty)

Později (když přidáme automatický import):
- Přidáme nové tabulky `brand_content` a `brand_ads` s přímou vazbou na `space_id`
- Data se budou importovat automaticky a pravidelně
- Reports budou vznikat jako snapshoty s filtry nad těmito tabulkami

### Influencers tab

Plně funkční od začátku - používá existující data z Influencer reportů.

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/components/brands/BrandOverviewTab.tsx` | Refaktor - sub-taby, filtry, routing |
| `src/components/brands/BrandContentDashboard.tsx` | Vytvořit |
| `src/components/brands/BrandAdsDashboard.tsx` | Vytvořit |
| `src/components/brands/BrandInfluencersDashboard.tsx` | Vytvořit |
| `src/components/brands/TopContentGrid.tsx` | Vytvořit |

---

## Výsledek

- 3 specializované dashboardy místo jednoho přeplněného
- Konzistentní struktura: Graf → Top 5 → KPI tiles
- Platform filtr pro cross-platform analýzu
- Influencers tab plně funkční ihned
- Content a Ads připravené na budoucí automatický import
