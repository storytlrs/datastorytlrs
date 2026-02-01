
# Plán: Editovatelné odstavce pro Základní přehled a Inovativní metriky

## Přehled

Přidáme editovatelné AI-generované odstavce pod headline v sekcích "Základní přehled kampaně" a "Inovativní a kvalitativní metriky". Tyto texty budou:
1. Automaticky generovány AI při vytváření insights
2. Persistovány v databázi v rámci `ai_insights_structured`
3. Editovatelné pomocí stejného patternu jako ostatní sekce

---

## Změny

### 1. Aktualizace TypeScript rozhraní

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

Přidáme nová pole do `StructuredInsights` interface:

```typescript
interface StructuredInsights {
  // ... existující pole
  overview_summary?: string;      // Nové
  innovation_summary?: string;    // Nové
  // ...
}
```

### 2. Přidání lokálního stavu pro editaci

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

```typescript
// Přidat do komponenty
const [overviewSummary, setOverviewSummary] = useState(
  insights.overview_summary || overviewParagraph || ''
);
const [innovationSummary, setInnovationSummary] = useState(
  insights.innovation_summary || innovationParagraph || ''
);
```

### 3. Rozšíření handleSaveSection

Přidáme handling pro nové sekce:

```typescript
case "overview_summary":
  setOverviewSummary(value);
  if (onSaveInsights) {
    await onSaveInsights({ overview_summary: value });
  }
  break;
case "innovation_summary":
  setInnovationSummary(value);
  if (onSaveInsights) {
    await onSaveInsights({ innovation_summary: value });
  }
  break;
```

### 4. Úprava UI sekcí

**Základní přehled kampaně:**

```tsx
<Card className="p-6 rounded-[20px] border-foreground">
  <h2 className="text-xl font-bold mb-4">
    Základní přehled kampaně
  </h2>
  
  {/* Nový editovatelný odstavec */}
  <div className="mb-4">
    <EditableSection
      value={overviewSummary}
      isEditing={editingSections.has("overview_summary")}
      onStartEdit={() => startEditing("overview_summary")}
      onSave={(value) => handleSaveSection("overview_summary", value)}
      onCancel={() => stopEditing("overview_summary")}
      canEdit={canEdit}
      placeholder="AI summary of campaign overview metrics..."
    />
  </div>
  
  {/* Existující metriky */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* MetricTile komponenty */}
  </div>
</Card>
```

**Inovativní a kvalitativní metriky:**

```tsx
<Card className="p-6 rounded-[20px] border-foreground">
  <h2 className="text-xl font-bold mb-4">
    Inovativní a kvalitativní metriky
  </h2>
  
  {/* Nový editovatelný odstavec */}
  <div className="mb-4">
    <EditableSection
      value={innovationSummary}
      isEditing={editingSections.has("innovation_summary")}
      onStartEdit={() => startEditing("innovation_summary")}
      onSave={(value) => handleSaveSection("innovation_summary", value)}
      onCancel={() => stopEditing("innovation_summary")}
      canEdit={canEdit}
      placeholder="AI summary of innovation metrics..."
    />
  </div>
  
  {/* Existující metriky */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* MetricTile komponenty */}
  </div>
</Card>
```

### 5. Aktualizace Edge funkce

**Soubor:** `supabase/functions/generate-ai-insights/index.ts`

Přidáme nová pole do uloženého strukturovaného objektu:

```typescript
const structuredInsights = {
  // ... existující pole
  overview_summary: aiContent.overview_paragraph,    // Nové
  innovation_summary: aiContent.innovation_paragraph, // Nové
  // ...
};
```

### 6. Aktualizace AIInsightsTab

**Soubor:** `src/components/reports/AIInsightsTab.tsx`

Také aktualizujeme interface a předávání dat:

```typescript
interface StructuredInsights {
  // ... existující pole
  overview_summary?: string;
  innovation_summary?: string;
  // ...
}
```

---

## Souhrn souborů ke změně

| Soubor | Změny |
|--------|-------|
| `src/components/reports/AIInsightsContent.tsx` | Interface, state, handlery, UI pro editaci obou odstavců |
| `src/components/reports/AIInsightsTab.tsx` | Aktualizace interface |
| `supabase/functions/generate-ai-insights/index.ts` | Uložení odstavců do struktury |

---

## Technické detaily

### Datový tok

1. **Generování**: AI vytvoří `overview_paragraph` a `innovation_paragraph`
2. **Uložení**: Edge funkce uloží do `ai_insights_structured.overview_summary` a `ai_insights_structured.innovation_summary`
3. **Načtení**: Frontend načte z `ai_insights_structured`
4. **Editace**: Uživatel může upravit text pomocí `EditableSection`
5. **Persistování**: Změny se ukládají zpět do `ai_insights_structured`

### Zpětná kompatibilita

Komponenta bude využívat prioritně:
1. `insights.overview_summary` (nově uložená data)
2. `overviewParagraph` prop (legacy data z API response)
3. Prázdný string jako fallback

### UX

- Odstavec se zobrazí pod headline, nad metrikami
- Při hoveru se objeví ikona tužky pro editaci
- Kliknutím se otevře Textarea
- Save/Cancel tlačítka pro potvrzení/zrušení změn
