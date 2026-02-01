
# Plán: PDF Export jako jeden souvislý dokument bez stránkování

## Problém

`html2pdf.js` standardně používá pevný formát stránky (A4) a automaticky dělí obsah na více stránek. To způsobuje:
- Bílé marginy na každé stránce
- Nucené page breaks, které mohou "rozříznout" obsah

## Řešení

Místo standardního `html2pdf()` použijeme **ruční workflow**:
1. Vyrendrovat HTML pomocí `html2canvas`
2. Získat rozměry výsledného canvas
3. Vytvořit jsPDF s **vlastními rozměry odpovídajícími obsahu**
4. Vložit canvas jako jeden obrázek (bez stránkování)

Výsledkem bude **jeden souvislý PDF dokument** s dynamickou výškou.

---

## Technické změny

### 1. src/components/reports/AIInsightsTab.tsx

Kompletní přepsání `handleExportPDF` funkce:

```tsx
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const handleExportPDF = async () => {
  if (!structuredData) return;
  
  setIsExporting(true);
  setIsPdfMode(true);
  
  try {
    // Wait for DOM to settle
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    await new Promise(r => setTimeout(r, 200));
    
    if (!pdfRef.current) {
      throw new Error("PDF container not ready");
    }
    
    await waitForImages(pdfRef.current);
    
    // Step 1: Render to canvas
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#E9E9E9',
      width: 1100,
    });
    
    // Step 2: Get canvas dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Step 3: Convert to mm (96 DPI * scale factor)
    const pxToMm = 25.4 / (96 * 2); // 2 is the scale factor
    const pdfWidth = imgWidth * pxToMm;
    const pdfHeight = imgHeight * pxToMm;
    
    // Step 4: Create PDF with custom dimensions (single page)
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight], // Custom size = one continuous page
    });
    
    // Step 5: Add image to fill entire page
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    // Step 6: Save
    pdf.save(`insights-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success("PDF exportováno úspěšně!");
  } catch (error) {
    console.error("Error exporting PDF:", error);
    toast.error("Nepodařilo se exportovat PDF");
  } finally {
    setIsPdfMode(false);
    setIsExporting(false);
  }
};
```

### 2. Nové importy

```tsx
// Změnit import na přímé použití knihoven
// html2pdf.js interně používá html2canvas a jspdf, ale my je použijeme přímo
```

Poznámka: `html2pdf.js` již obsahuje `html2canvas` a `jspdf` jako závislosti, takže je nemusíme instalovat zvlášť - můžeme je importovat přímo.

### 3. src/components/reports/AIInsightsContentPDF.tsx

Ponechat beze změn - již má správný kontinuální layout s `.pdf-continuous`.

### 4. src/index.css

Ponechat beze změn - `.pdf-continuous` je správně nastavený.

---

## Výsledek

| Vlastnost | Před | Po |
|-----------|------|-----|
| Počet stránek | Mnoho (A4) | 1 kontinuální |
| Bílé marginy | Ano (na každé stránce) | Ne |
| Page breaks | Automatické (nežádoucí) | Žádné |
| Rozměry | Fixní A4 | Dynamické podle obsahu |

---

## Vizualizace

```text
PŘED (A4 stránkování):
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Page 1  │ │ Page 2  │ │ Page 3  │
│ [margin]│ │ [margin]│ │ [margin]│
│ Content │ │ Content │ │ Content │
│ [margin]│ │ [margin]│ │ [margin]│
└─────────┘ └─────────┘ └─────────┘

PO (jeden souvislý dokument):
┌─────────────────────────────────┐
│                                 │
│  Executive Summary              │
│  Top 5 Content                  │
│  Metrics                        │
│  Leaderboard                    │
│  Creator 1                      │
│  Creator 2                      │
│  ...                            │
│  Summary                        │
│                                 │
└─────────────────────────────────┘
(Jeden velký "papír")
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/reports/AIInsightsTab.tsx` | Přepsat `handleExportPDF` na ruční html2canvas + jsPDF workflow |

---

## Technické poznámky

1. **Import knihoven**: `html2pdf.js` obsahuje `html2canvas` a `jspdf` jako bundled dependencies. Můžeme:
   - Buď importovat přímo z html2pdf.js (pokud exportuje)
   - Nebo přidat explicitní import jspdf (již by měl být v node_modules)

2. **Rozměry PDF**: Použijeme `format: [width, height]` v mm, což vytvoří custom page size

3. **Kvalita**: Zachováme scale: 2 pro vysoké rozlišení, JPEG quality 0.95

4. **Paměť**: Pro velmi dlouhé dokumenty může být canvas velký, ale pro běžné reporty by měl být v pořádku
