
# Plán: Zobrazení reportů jako tabulka

## Přehled

Změním zobrazení reportů v tabu Reports z grid layoutu s kartami na tabulkové zobrazení, které odpovídá designu admin panelu (UserList).

## Současný stav

| Aspekt | Aktuálně |
|--------|----------|
| Layout | Grid 1-3 sloupce s kartami |
| Data | Ikona, název, typ, status, datum |
| Contributors | Nezobrazují se |
| Styling | Card komponenta s rounded-[35px] |

## Cílový stav

| Aspekt | Po změně |
|--------|----------|
| Layout | Tabulka se záhlavím |
| Data | Icon, Název, Type, Status, Start date, End date, Contributors |
| Contributors | Avatary přispěvatelů (ReportContributors komponenta) |
| Styling | Table s border border-foreground rounded-[20px] (jako UserList) |

## Technické řešení

### 1. Přidat fetch pro contributors

Bude potřeba načíst contributors pro všechny reporty najednou:

```typescript
// Nový state
const [reportContributors, setReportContributors] = useState<Record<string, Contributor[]>>({});

// Nová funkce - fetch contributors pro všechny reporty
const fetchReportContributors = async (reportIds: string[]) => {
  // 1. Fetch všech audit_log záznamů pro dané reporty
  // 2. Seskupit podle report_id
  // 3. Pro každý report načíst profily uživatelů
};
```

### 2. Nahradit grid tabulkou

Vyměním tento kód (řádky 533-573):
```tsx
// STARÉ - Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredReports.map((report) => (
    <Card>...</Card>
  ))}
</div>
```

Za tabulkové zobrazení:
```tsx
// NOVÉ - Table layout
<div className="border border-foreground rounded-[20px] overflow-hidden">
  <Table>
    <TableHeader>
      <TableRow className="border-foreground">
        <TableHead className="w-[50px]"></TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Start Date</TableHead>
        <TableHead>End Date</TableHead>
        <TableHead>Contributors</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredReports.map((report) => (
        <TableRow 
          key={report.id} 
          className="border-foreground cursor-pointer hover:bg-muted/50"
          onClick={() => navigate(`/reports/${report.id}`)}
        >
          <TableCell>
            <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
          </TableCell>
          <TableCell className="font-medium">{report.name}</TableCell>
          <TableCell>
            <Badge variant="outline">{reportTypeLabels[report.type]}</Badge>
          </TableCell>
          <TableCell className="capitalize">{report.status}</TableCell>
          <TableCell>{formattedStartDate}</TableCell>
          <TableCell>{formattedEndDate}</TableCell>
          <TableCell>
            <ReportContributors contributors={reportContributors[report.id] || []} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### 3. Aktualizovat importy

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportContributors, Contributor } from "@/components/reports/ReportContributors";
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/pages/BrandDetail.tsx` | Hlavní úprava - grid na tabulku, přidání fetchContributors |

---

## Vizuální náhled

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  Icon  │  Name           │  Type              │ Status │ Start  │ End    │ Contributors │
├────────┼─────────────────┼────────────────────┼────────┼────────┼────────┼──────────────┤
│  [🧑]  │  Q1 Campaign    │  Influencer camp.  │ active │ Jan 1  │ Mar 31 │  [👤👤+1]    │
│  [📊]  │  Summer Ads     │  Ads campaign      │ draft  │ Jun 1  │ Aug 31 │  [👤]        │
│  [📷]  │  Always-on IG   │  Always-on content │ active │ Jan 1  │ Dec 31 │  -           │
└────────┴─────────────────┴────────────────────┴────────┴────────┴────────┴──────────────┘
```

## Zachované prvky

- Vyhledávání a filtry zůstanou beze změny
- Prázdný stav s "No reports yet" zůstane stejný
- Kliknutí na řádek naviguje na detail reportu
- Tlačítko "New Report" zůstává nahoře

