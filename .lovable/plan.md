
# Plán: Export Insights do PDF (A4 Landscape, každý creator na vlastní stránku)

## Přehled

Export celé stránky Insights do PDF ve formátu A4 landscape, kde každý blok (sekce) začne na nové stránce. Sekce "Content Performance" bude rozdělena tak, že **každý creator bude na samostatné stránce**.

---

## Technický přístup

Použijeme knihovnu **html2pdf.js** s CSS třídou `pdf-page-break` pro vynucení stránkování mezi sekcemi.

---

## Struktura stránek v PDF

| # | Sekce | Popis |
|---|-------|-------|
| 1 | Executive Summary | Shrnutí + Campaign Context tiles |
| 2 | Top 5 Content | Grid 5 content preview karet |
| 3 | Základní přehled kampaně | 4 metriky (Creators, Content, Views, Avg CPM) |
| 4 | Inovativní a kvalitativní metriky | 4 metriky (TSWB Cost, Interactions, ER, VR) |
| 5 | Sentiment kampaně | Sentiment analýza + topics |
| 6 | Creators Leaderboard | Tabulka výkonnosti creatorů |
| 7+ | Content Performance (per creator) | **Každý creator na vlastní stránce** |
| Poslední | Summary & Takeaways | What works / doesn't work / recommendations |

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `package.json` | Přidání závislosti `html2pdf.js` |
| `src/index.css` | Přidání CSS třídy pro page breaks |
| `src/components/reports/AIInsightsContent.tsx` | Přidání `forwardRef` + page break třídy na sekce + individuální page break per creator |
| `src/components/reports/AIInsightsTab.tsx` | Přidání tlačítka "Export PDF" + logiky exportu |

---

## Detailní změny

### 1. Instalace knihovny

```json
"html2pdf.js": "^0.10.1"
```

### 2. CSS pro stránkování (src/index.css)

```css
/* PDF Export - Page Breaks */
@media print {
  .pdf-page-break {
    page-break-before: always;
  }
}

.pdf-page-break {
  break-before: page;
}
```

### 3. AIInsightsContent.tsx - struktura s page breaks

Komponenta bude použita s `forwardRef` a jednotlivé sekce dostanou třídu `pdf-page-break`:

```tsx
import { useState, forwardRef } from "react";

export const AIInsightsContent = forwardRef<HTMLDivElement, AIInsightsContentProps>(({
  insights,
  // ... ostatní props
}, ref) => {
  // ... existující logika ...

  return (
    <div ref={ref} className="space-y-8">
      {/* Executive Summary - strana 1 (bez page break) */}
      <Card className="p-6 rounded-[20px] border-foreground">
        ...
      </Card>

      {/* Top 5 Content - strana 2 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>

      {/* Základní přehled - strana 3 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>

      {/* Inovativní metriky - strana 4 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>

      {/* Sentiment - strana 5 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>

      {/* Creators Leaderboard - strana 6 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>

      {/* Content Performance - KAŽDÝ CREATOR NA VLASTNÍ STRÁNCE */}
      {insights.creator_performance?.map((creator, index) => (
        <div 
          key={creator.handle} 
          className={index === 0 ? "pdf-page-break" : "pdf-page-break"}
        >
          <h2 className="text-xl font-bold mb-4">
            Content Performance: @{creator.handle}
          </h2>
          <CreatorPerformanceCard
            creator={transformedCreator}
            canEdit={canEdit}
            ...
          />
        </div>
      ))}

      {/* Summary & Takeaways - poslední strana */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break">
        ...
      </Card>
    </div>
  );
});
```

### 4. AIInsightsTab.tsx - export funkce

```tsx
import { useState, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import html2pdf from "html2pdf.js";

export const AIInsightsTab = ({ reportId }: AIInsightsTabProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const opt = {
        margin: [10, 15, 10, 15],
        filename: `insights-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'landscape'
        },
        pagebreak: { 
          mode: ['css'],
          before: '.pdf-page-break'
        }
      };
      
      await html2pdf().set(opt).from(contentRef.current).save();
      toast.success("PDF exportováno úspěšně!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Nepodařilo se exportovat PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={handleExportPDF}
          disabled={isExporting}
          variant="outline"
          className="rounded-[35px] border-foreground"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export PDF
        </Button>
        {canEdit && (
          <Button onClick={handleRegenerate}>Regenerate</Button>
        )}
      </div>

      <AIInsightsContent
        ref={contentRef}
        insights={structuredData}
        ...
      />
    </div>
  );
};
```

---

## Výsledný PDF dokument

| Vlastnost | Hodnota |
|-----------|---------|
| Formát | A4 (297 × 210 mm) |
| Orientace | Landscape (na šířku) |
| Počet stran | 7 + počet creatorů |
| Kvalita | Vysoká (scale: 2) |

---

## Příklad struktury PDF (pro 3 creatory)

```text
┌─────────────────────────────────────────┐
│  Strana 1: Executive Summary            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 2: Top 5 Content                │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 3: Základní přehled kampaně     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 4: Inovativní metriky           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 5: Sentiment kampaně            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 6: Creators Leaderboard         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 7: Content Performance @creator1│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 8: Content Performance @creator2│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 9: Content Performance @creator3│
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Strana 10: Summary & Takeaways         │
└─────────────────────────────────────────┘
```

---

## Implementační kroky

1. Přidat závislost `html2pdf.js` do package.json
2. Přidat CSS třídu `pdf-page-break` do index.css
3. Upravit `AIInsightsContent.tsx` na forwardRef + přidat page break třídy na každou sekci + rozdělit Content Performance per creator
4. Přidat export funkci a tlačítko do `AIInsightsTab.tsx`
5. Otestovat export
