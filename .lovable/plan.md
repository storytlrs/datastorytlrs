

# Plán: Benchmarky podle typu reportu

## Přehled

Upravíme výpočet benchmarků tak, aby se počítaly pouze z reportů stejného typu (influencer, ads, always_on) v rámci daného space. Nyní se benchmarky počítají ze všech reportů v space bez ohledu na typ.

---

## Problém

Aktuální kód (řádky 119-134):
```typescript
// 1. Get current report to find space_id
const { data: reportData } = await supabase
  .from("reports")
  .select("space_id")  // Chybí "type"
  .eq("id", reportId)
  .single();

// 2. Get all reports in the same space
const { data: spaceReports } = await supabase
  .from("reports")
  .select("id")
  .eq("space_id", currentSpaceId);  // Chybí filter .eq("type", reportType)
```

---

## Změny

**Soubor:** `src/components/reports/OverviewTab.tsx`

### 1. Rozšíření dotazu na aktuální report (řádek 121-124)

Přidáme načtení typu reportu spolu se space_id:

```typescript
// 1. Get current report to find space_id and type
const { data: reportData } = await supabase
  .from("reports")
  .select("space_id, type")  // Přidáno "type"
  .eq("id", reportId)
  .single();

const currentSpaceId = reportData?.space_id;
const currentReportType = reportData?.type;
```

### 2. Filtrování reportů podle typu (řádky 128-134)

Přidáme filter podle typu reportu:

```typescript
// 2. Get all reports in the same space WITH SAME TYPE
const { data: spaceReports } = await supabase
  .from("reports")
  .select("id")
  .eq("space_id", currentSpaceId)
  .eq("type", currentReportType);  // Přidán filter podle typu

const allReportIds = spaceReports?.map(r => r.id) || [];
setSpaceReportCount(allReportIds.length);
```

---

## Souhrn

| Řádek | Změna |
|-------|-------|
| 121-124 | `.select("space_id")` → `.select("space_id, type")` |
| 129-132 | Přidání `.eq("type", currentReportType)` do dotazu |

---

## Výsledné chování

| Typ reportu | Benchmarky se počítají z |
|-------------|--------------------------|
| influencer | Všech influencer reportů v daném space |
| ads | Všech ads reportů v daném space |
| always_on | Všech always_on reportů v daném space |

Pokud je v space pouze jeden report daného typu, benchmark = aktuální hodnoty.

