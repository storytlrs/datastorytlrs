
# Plán: Zarovnání textů v badges a přidání záhlaví do PDF

## Problémy

1. **TopicBadge texty nejsou vertikálně na středu** - screenshot ukazuje, že texty v bublinách (positive/negative topics) nejsou správně zarovnány
2. **Chybí záhlaví v PDF** - je třeba přidat header s názvem kampaně, typem reportu, statusem a datumem

---

## Řešení

### 1. Oprava zarovnání textů v TopicBadge

V komponentě `TopicBadge` přidat `justify-center` a `text-center` pro horizontální zarovnání textu na střed bubliny.

**Soubor:** `src/components/reports/TopicBadge.tsx`

```tsx
// PŘED:
"inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"

// PO:
"inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
```

### 2. Přidání záhlaví do PDF

Přidat props pro report metadata do `AIInsightsContentPDF` a zobrazit je v záhlaví.

**Soubor:** `src/components/reports/AIInsightsContentPDF.tsx`

- Přidat nové props: `reportName`, `reportType`, `reportStatus`, `startDate`, `endDate`
- Přidat header sekci na začátek dokumentu:

```tsx
{/* PDF Header */}
<div className="mb-6">
  <h1 className="text-2xl font-bold">{reportName}</h1>
  <p className="text-sm text-muted-foreground">
    {getReportTypeLabel(reportType)} • {reportStatus === "active" ? "Published" : reportStatus}
  </p>
  {startDate && endDate && (
    <p className="text-xs text-muted-foreground mt-1">
      {formatDate(startDate)} - {formatDate(endDate)}
    </p>
  )}
</div>
```

**Soubor:** `src/components/reports/AIInsightsTab.tsx`

- Načíst report data (name, type, status, start_date, end_date) a předat do PDF komponenty:

```tsx
// Rozšířit fetchReportData nebo přidat nový dotaz
const { data: reportData } = await supabase
  .from("reports")
  .select("name, type, status, start_date, end_date")
  .eq("id", reportId)
  .single();

// Předat do komponenty
<AIInsightsContentPDF
  ref={pdfRef}
  insights={structuredData}
  reportName={reportData?.name}
  reportType={reportData?.type}
  reportStatus={reportData?.status}
  startDate={reportData?.start_date}
  endDate={reportData?.end_date}
  ...
/>
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/reports/TopicBadge.tsx` | Přidat `justify-center text-center` pro zarovnání |
| `src/components/reports/AIInsightsContentPDF.tsx` | Přidat props pro report metadata a header sekci |
| `src/components/reports/AIInsightsTab.tsx` | Načíst a předat report metadata do PDF komponenty |

---

## Vizualizace výsledku

### TopicBadge (zarovnání)

```text
PŘED:                  PO:
┌─────────────────┐    ┌─────────────────┐
│BĚŽECKÉ VÝKONY   │    │ BĚŽECKÉ VÝKONY  │
└─────────────────┘    └─────────────────┘
(text vlevo)           (text na středu)
```

### PDF Header

```text
┌─────────────────────────────────────────┐
│  Influencer Campaign                     │  ← Název reportu (h1, bold)
│  Influencer campaign • draft             │  ← Typ + status
│  01/11/2025 - 30/11/2025                 │  ← Datum rozsah
├─────────────────────────────────────────┤
│  Executive Summary                       │
│  ...                                     │
└─────────────────────────────────────────┘
```

---

## Implementační kroky

1. Upravit `TopicBadge.tsx` - přidat zarovnání textu na střed
2. Rozšířit props v `AIInsightsContentPDF.tsx` a přidat header
3. Upravit `AIInsightsTab.tsx` - načíst report data a předat do PDF komponenty
