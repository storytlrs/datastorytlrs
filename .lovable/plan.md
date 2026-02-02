

# Plán: Změna navigace v Brand Space

## Přehled změn

Nahradíme stávající strukturu s Overview tabem a sub-taby za jednoduchou plochou navigaci, kde Content, Ads a Influencers budou přímo v hlavní navigaci.

---

## Aktuální vs. nová struktura

### Před změnou:
```text
[Overview]  [Insights]  [Reports]
    │
    └── [Content] [Ads] [Influencers]  (sub-taby)
```

### Po změně:
```text
[Content]  [Ads]  [Influencers]  [Insights]  [Reports]
```

---

## Vizuální náhled

```text
┌─────────────────────────────────────────────────────────────┐
│  Brand Name                            [🏢 Brand ▼]  [⚙][↗] │
├─────────────────────────────────────────────────────────────┤
│  [Content]  [Ads]  [Influencers]  [Insights]  [Reports]     │
├─────────────────────────────────────────────────────────────┤
│  Filters: [Start Date] [End Date] [Platform ▼] [Clear]      │
│  (pouze pro Content, Ads, Influencers taby)                 │
├─────────────────────────────────────────────────────────────┤
│  Dashboard content...                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### Změny v `BrandDetail.tsx`:

1. **Nová struktura tabů**:
   - Nahradíme `overview`, `insights`, `reports` za `content`, `ads`, `influencers`, `insights`, `reports`
   - Default tab bude `content` místo `overview`

2. **Přesun filtrů z BrandOverviewTab**:
   - Filter state (`dateRange`, `platform`) přesuneme do `BrandDetail.tsx`
   - Filtry budeme zobrazovat pouze pro taby `content`, `ads`, `influencers`

3. **Přímé použití dashboard komponent**:
   - Místo `<BrandOverviewTab>` použijeme přímo `<BrandContentDashboard>`, `<BrandAdsDashboard>`, `<BrandInfluencersDashboard>`

4. **Úprava URL parametrů**:
   - `?tab=overview` bude deprecated, nový default je `?tab=content`
   - Zachováme zpětnou kompatibilitu - pokud přijde `overview`, přesměrujeme na `content`

### Smazání `BrandOverviewTab.tsx`:

- Komponenta již nebude potřeba - její logika (filtry, tab switching) se přesune do `BrandDetail.tsx`

---

## Logika zobrazení filtrů

```typescript
// Filtry se zobrazí pouze pro dashboard taby
const showDashboardFilters = ["content", "ads", "influencers"].includes(activeTab);
```

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/pages/BrandDetail.tsx` | Refaktor - nová struktura tabů, přidání filtrů |
| `src/components/brands/BrandOverviewTab.tsx` | Smazat - logika přesunuta do BrandDetail |

---

## Výsledek

- Jednodušší navigace bez vnořených tabů
- Content, Ads a Influencers jsou přímo dostupné z hlavní navigace
- Filtry sdílené mezi dashboard taby (Content, Ads, Influencers)
- Insights a Reports taby zůstávají bez změny
- Lepší UX - méně klikání pro přístup k dashboardům

