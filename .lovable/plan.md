
# Plán: Abecední řazení filtrů napříč platformou

## Přehled

Implementujeme konzistentní abecední řazení (A-Z) pro všechny dynamické filtry a dropdown selecty napříč celou platformou. Použijeme `localeCompare()` pro správné řazení včetně diakritiky.

---

## Dotčené soubory

| Soubor | Typ filtru | Aktuální stav |
|--------|-----------|---------------|
| `src/components/reports/OverviewTab.tsx` | Creators, Platforms | Creators řazeno, Platforms řazeno |
| `src/components/reports/ContentTab.tsx` | Creators, Platforms | Neřazeno |
| `src/components/reports/AdCreativesTab.tsx` | Campaigns, Platforms, Ad Types | Neřazeno |
| `src/pages/BrandDetail.tsx` | Projects | Řazeno v DB dotazu |
| `src/components/reports/CreateContentDialog.tsx` | Creators | Řazeno v DB dotazu |
| `src/components/reports/EditContentDialog.tsx` | Creators | Neřazeno |
| `src/components/reports/CreatePromoCodeDialog.tsx` | Creators | Řazeno v DB dotazu |
| `src/components/admin/AssignUserToBrand.tsx` | Brands | Řazeno v DB dotazu |
| `src/components/reports/EditReportDialog.tsx` | Projects | Řazeno v DB dotazu |

---

## Změny

### 1. ContentTab.tsx

**Řádky 159-169** - Přidání sortování pro creators a platforms:

```typescript
// Get unique creators and platforms for filters
const uniqueCreators = useMemo(() => {
  const creators = content
    .filter(item => item.creators)
    .map(item => ({ id: item.creators!.id, handle: item.creators!.handle }));
  return Array.from(new Map(creators.map(c => [c.id, c])).values())
    .sort((a, b) => a.handle.toLowerCase().localeCompare(b.handle.toLowerCase()));
}, [content]);

const uniquePlatforms = useMemo(() => {
  return Array.from(new Set(content.map(item => item.platform))).sort();
}, [content]);
```

### 2. AdCreativesTab.tsx

**Řádky 144-155** - Přidání sortování pro campaigns, platforms a ad types:

```typescript
// Get unique values for filters
const uniqueCampaigns = useMemo(() => {
  return Array.from(new Set(adCreatives.filter(item => item.campaign_name).map(item => item.campaign_name!)))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}, [adCreatives]);

const uniquePlatforms = useMemo(() => {
  return Array.from(new Set(adCreatives.map(item => item.platform))).sort();
}, [adCreatives]);

const uniqueAdTypes = useMemo(() => {
  return Array.from(new Set(adCreatives.filter(item => item.ad_type).map(item => item.ad_type!)))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}, [adCreatives]);
```

### 3. EditContentDialog.tsx

**Řádky 143-152** - Přidání sortování při fetchování creators:

```typescript
const fetchCreators = async () => {
  const { data } = await supabase
    .from("creators")
    .select("id, handle, platform")
    .eq("report_id", content.report_id)
    .order("handle");
  
  setCreators(data || []);
};
```

Případně přidat client-side sorting jako fallback:

```typescript
const sortedCreators = useMemo(() => {
  return [...creators].sort((a, b) => 
    a.handle.toLowerCase().localeCompare(b.handle.toLowerCase())
  );
}, [creators]);
```

---

## Souhrn změn

| Soubor | Změna |
|--------|-------|
| `src/components/reports/ContentTab.tsx` | Přidání `.sort()` do `uniqueCreators` a `uniquePlatforms` |
| `src/components/reports/AdCreativesTab.tsx` | Přidání `.sort()` do `uniqueCampaigns`, `uniquePlatforms`, `uniqueAdTypes` |
| `src/components/reports/EditContentDialog.tsx` | Přidání `.order("handle")` do DB dotazu |

---

## Technické poznámky

### Metoda řazení
- **Pro strings (platformy, typy)**: `.sort()` - defaultní abecední řazení
- **Pro objekty (creators)**: `.sort((a, b) => a.handle.toLowerCase().localeCompare(b.handle.toLowerCase()))`
- **V DB dotazech**: `.order("field_name")` - využívá PostgreSQL collation

### Již korektně implementováno
- `OverviewTab.tsx` - sortedCreators a availablePlatforms
- `BrandDetail.tsx` - projects (`.order("name")`)
- `CreateContentDialog.tsx` - creators (`.order("handle")`)
- `CreatePromoCodeDialog.tsx` - creators (`.order("handle")`)
- `AssignUserToBrand.tsx` - brands (`.order("name")`)
- `EditReportDialog.tsx` - projects (`.order("name")`)

### Výsledné chování
Po implementaci budou všechny filtry řazeny konzistentně od A do Z:
- Creators: podle handle
- Platforms: instagram, facebook, tiktok, twitter, youtube
- Campaigns: podle názvu
- Ad Types: podle názvu
- Projects: podle názvu
- Brands: podle názvu
