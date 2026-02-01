
# Plán: PDF Export bez stránkování (single continuous page)

## Cíl

Změnit PDF export tak, aby generoval **jeden souvislý dokument** bez nucených page breaks mezi sekcemi. Obsah bude plynulý jako na webu.

---

## Technický přístup

1. **Odstranit `.pdf-page` wrappers** - nebudeme používat pevné A4 rozměry pro každou sekci
2. **Použít jednoduchý kontejner** s pozadím `#E9E9E9` a fixní šířkou
3. **Nechat html2pdf automaticky rozdělit** obsah podle potřeby (bez nuceného `break-before`)
4. **Zjednodušit CSS** - odebrat page-break pravidla

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/index.css` | Odstranit `.pdf-page` styly, přidat jednoduchý `.pdf-continuous` wrapper |
| `src/components/reports/AIInsightsContentPDF.tsx` | Odstranit `.pdf-page` wrappers, použít plynulý layout |
| `src/components/reports/AIInsightsTab.tsx` | Zjednodušit html2pdf konfiguraci |

---

## Detailní změny

### 1. src/index.css - Zjednodušené PDF styly

Odstranit:
```css
.pdf-page { ... }
.pdf-page + .pdf-page { break-before: page; }
```

Přidat:
```css
/* PDF Continuous Export (no forced page breaks) */
.pdf-continuous {
  background-color: #E9E9E9;
  width: 1100px; /* Fixed width for consistent rendering */
  padding: 20px;
}

.pdf-continuous * {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

### 2. AIInsightsContentPDF.tsx - Plynulý layout

Kompletní refactor - místo `.pdf-page` wrapperů použít:

```tsx
export const AIInsightsContentPDF = forwardRef<HTMLDivElement, AIInsightsContentPDFProps>(({
  insights,
  // ...
}, ref) => {
  return (
    <div ref={ref} className="pdf-continuous space-y-6">
      {/* Executive Summary */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2>Executive Summary</h2>
        {/* ... content ... */}
      </Card>

      {/* Top 5 Content */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2>Top 5 Content</h2>
        {/* ... content ... */}
      </Card>

      {/* ... ostatní sekce bez page-break wrapperů ... */}

      {/* Creator Performance - všichni v jednom plynulém toku */}
      {insights.creator_performance?.map((creator) => (
        <Card key={creator.handle} className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
          <h2>Content Performance: @{creator.handle}</h2>
          {/* ... content ... */}
        </Card>
      ))}

      {/* Summary & Takeaways */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        {/* ... content ... */}
      </Card>
    </div>
  );
});
```

### 3. AIInsightsTab.tsx - Jednodušší export konfigurace

```tsx
const handleExportPDF = async () => {
  // ...
  const opt = {
    margin: 10, // Small margin around content
    filename: `insights-report-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#E9E9E9',
      width: 1100, // Fixed width
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'landscape'
    },
    // NO pagebreak config - let html2pdf handle it naturally
  };
  
  await html2pdf().set(opt).from(pdfRef.current).save();
};
```

---

## Výsledek

| Vlastnost | Před | Po |
|-----------|------|-----|
| Stránkování | Nucené per sekce | Automatické (plynulé) |
| Prázdné stránky | Ano | Ne |
| Pozadí | Bílé okraje | Jednotné #E9E9E9 |
| Layout | Rozbitý | Plynulý |

---

## Vizuální struktura PDF

```text
┌─────────────────────────────────────────┐
│  Executive Summary                       │
│  + Campaign Context tiles                │
├─────────────────────────────────────────┤
│  Top 5 Content                           │
│  (5 karet vedle sebe)                    │
├─────────────────────────────────────────┤
│  Základní přehled kampaně               │
│  (4 metriky)                             │
├─────────────────────────────────────────┤
│  Inovativní metriky                      │
│  (4 metriky)                             │
├─────────────────────────────────────────┤
│  Sentiment kampaně                       │
├─────────────────────────────────────────┤
│  Creators Leaderboard                    │
├─────────────────────────────────────────┤
│  Content Performance: @creator1          │
├─────────────────────────────────────────┤
│  Content Performance: @creator2          │
├─────────────────────────────────────────┤
│  ... (další creatori)                    │
├─────────────────────────────────────────┤
│  Summary & Takeaways                     │
│  (What Works / Doesn't / Recommendations)│
└─────────────────────────────────────────┘
   ↓ Pokračuje na další stránky automaticky
```

---

## Implementační kroky

1. Upravit `src/index.css` - nahradit `.pdf-page` za `.pdf-continuous`
2. Refaktorovat `src/components/reports/AIInsightsContentPDF.tsx` - odstranit page wrappers
3. Zjednodušit `src/components/reports/AIInsightsTab.tsx` - odstranit pagebreak config
4. Otestovat export
