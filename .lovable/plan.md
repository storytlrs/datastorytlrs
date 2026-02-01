
# Plán: Oprava PDF exportu - správné pozadí a obsah na jedné stránce

## Identifikované problémy

Na základě analýzy exportovaného PDF:

| Problém | Popis |
|---------|-------|
| Prázdné stránky | Stránky 9, 11, 13, 15 jsou prázdné - obsah přetéká |
| Bílé pozadí | PDF má bílé pozadí místo #E9E9E9 |
| Rozpadlé karty | Content Performance karty se nevejdou na 1 stránku |
| Dvojitý Card | CreatorPerformanceCard má vlastní Card wrapper |

---

## Řešení

### 1. Přidání pozadí PDF

Obalíme celý obsah divem s explicitní barvou pozadí, která se zachytí při exportu:

```tsx
<div ref={ref} className="space-y-8 bg-background" style={{ backgroundColor: '#E9E9E9' }}>
```

A každý Card wrapper dostane také explicitní pozadí:

```tsx
<Card className="p-6 rounded-[20px] border-foreground pdf-page-break bg-card" 
      style={{ backgroundColor: '#E9E9E9' }}>
```

### 2. Odstranění dvojitého Card wrapperu

`CreatorPerformanceCard` má vlastní `<Card>` wrapper (řádek 100). V `AIInsightsContent` je pak obalena dalším `<Card>` (řádek 784). 

Řešení: Vytvořit PDF-specifickou variantu bez vnějšího Card wrapperu nebo upravit strukturu.

### 3. Zmenšení obsahu pro PDF

Pro Content Performance bloky:
- Zmenšit padding a spacing
- Použít kompaktnější layout
- Zajistit, že se vše vejde na landscape A4

### 4. CSS pro PDF optimalizaci

Přidáme specifické CSS třídy pro PDF export:

```css
/* PDF-specific styling */
.pdf-export-container {
  background-color: #E9E9E9;
}

.pdf-export-container .pdf-page-break {
  break-before: page;
  page-break-before: always;
}

/* Prevent content from breaking inside cards */
.pdf-export-container .pdf-no-break {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/index.css` | Přidání PDF-specifických CSS tříd |
| `src/components/reports/AIInsightsContent.tsx` | Úprava struktury pro PDF, přidání pozadí, kompaktnější layout |
| `src/components/reports/CreatorPerformanceCard.tsx` | Přidání prop pro variantu bez Card wrapperu |
| `src/components/reports/AIInsightsTab.tsx` | Úprava html2pdf konfigurace |

---

## Detailní změny

### 1. src/index.css - PDF styling

```css
/* PDF Export Styles */
.pdf-export-container {
  background-color: #E9E9E9 !important;
}

.pdf-page-break {
  break-before: page;
  page-break-before: always;
}

/* Prevent breaking inside cards */
.pdf-no-break {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Compact mode for PDF cards */
.pdf-compact .p-6 {
  padding: 1rem !important;
}

.pdf-compact .space-y-8 > * + * {
  margin-top: 1.5rem !important;
}

.pdf-compact .gap-6 {
  gap: 1rem !important;
}
```

### 2. AIInsightsContent.tsx - Struktura s pozadím

```tsx
export const AIInsightsContent = forwardRef<HTMLDivElement, AIInsightsContentProps>(({
  // ... props
}, ref) => {
  // ...

  return (
    <div 
      ref={ref} 
      className="space-y-8"
      style={{ backgroundColor: '#E9E9E9' }}
    >
      {/* Executive Summary - strana 1 */}
      <div 
        className="p-6 rounded-[20px] border border-foreground"
        style={{ backgroundColor: '#E9E9E9' }}
      >
        {/* ... obsah ... */}
      </div>

      {/* Top 5 Content - strana 2 */}
      <div 
        className="p-6 rounded-[20px] border border-foreground pdf-page-break"
        style={{ backgroundColor: '#E9E9E9' }}
      >
        {/* ... obsah ... */}
      </div>

      {/* Content Performance - každý creator */}
      {insights.creator_performance?.map((creator) => (
        <div 
          key={creator.handle} 
          className="p-6 rounded-[20px] border border-foreground pdf-page-break"
          style={{ backgroundColor: '#E9E9E9' }}
        >
          <h2 className="text-xl font-bold mb-4">
            Content Performance: @{creator.handle}
          </h2>
          {/* Inline obsah místo CreatorPerformanceCard */}
          <CreatorPerformanceCard
            creator={transformedCreator}
            variant="flat" // Bez vlastního Card wrapperu
            canEdit={canEdit}
            // ...
          />
        </div>
      ))}

      {/* ... další sekce ... */}
    </div>
  );
});
```

### 3. CreatorPerformanceCard.tsx - Varianta bez Card

```tsx
interface CreatorPerformanceCardProps {
  creator: CreatorPerformanceData;
  canEdit?: boolean;
  variant?: 'default' | 'flat'; // flat = bez Card wrapperu
  onSaveKeyInsight?: (handle: string, insight: string) => void;
  onSaveTopics?: (handle: string, positiveTopics: string[], negativeTopics: string[]) => void;
}

export const CreatorPerformanceCard = ({
  creator,
  canEdit = false,
  variant = 'default',
  onSaveKeyInsight,
  onSaveTopics,
}: CreatorPerformanceCardProps) => {
  // ... existující logika ...

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {/* ... */}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {/* ... obsah ... */}
      </div>
    </>
  );

  // Flat variant - bez Card wrapperu
  if (variant === 'flat') {
    return <div className="pdf-no-break">{content}</div>;
  }

  // Default - s Card wrapperem
  return (
    <Card className="p-6 rounded-[20px] border-foreground">
      {content}
    </Card>
  );
};
```

### 4. AIInsightsTab.tsx - Vylepšená konfigurace

```tsx
const handleExportPDF = async () => {
  if (!contentRef.current) return;
  
  setIsExporting(true);
  try {
    const opt = {
      margin: [8, 12, 8, 12], // Menší marginy pro více prostoru
      filename: `insights-report-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#E9E9E9', // Explicitní barva pozadí
        windowWidth: 1200, // Fixní šířka pro konzistentní rendering
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape'
      },
      pagebreak: { 
        mode: ['css'],
        before: '.pdf-page-break',
        avoid: ['.pdf-no-break'] // Zabránit rozbití uvnitř karet
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
```

---

## Výsledek

| Vlastnost | Před | Po |
|-----------|------|-----|
| Pozadí PDF | Bílé | #E9E9E9 (shodné s UI) |
| Content Performance | Přetéká na 2 stránky | Vše na 1 stránce |
| Prázdné stránky | Ano (9, 11, 13, 15) | Ne |
| Card struktura | Dvojitý wrapper | Jednoduchý wrapper |

---

## Technické poznámky

- `html2canvas.backgroundColor` nastaví explicitní pozadí pro canvas
- `html2canvas.windowWidth` zajistí konzistentní rendering bez závislosti na viewport
- `pagebreak.avoid` zabrání rozbití obsahu uvnitř označených elementů
- Inline styles s `backgroundColor` zajistí, že barvy budou zachyceny html2canvas
- Varianta `flat` pro CreatorPerformanceCard odstraní duplicitní Card border/padding
