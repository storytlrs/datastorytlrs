

# Plán: Regenerate bez opětovného vyplňování formuláře

## Přehled

Upravíme tlačítko "Regenerate" v AI Insights tak, aby automaticky použilo existující data z `campaign_context` (Main goal, Actions, Highlights) uložené ve strukturovaných datech. Uživatel nebude muset znovu vyplňovat formulář.

---

## Aktuální chování

1. Kliknutí na "Regenerate" → Otevře se `AIInsightsInputDialog`
2. Uživatel musí znovu vyplnit Main goal, Actions, Highlights
3. Po odeslání se generují nové insights

## Nové chování

1. Kliknutí na "Regenerate" → Přímo se zavolá `handleGenerateInsights` s existujícími daty
2. Není potřeba dialog
3. Pokud data neexistují (edge case), zobrazí se chybová hláška

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/reports/AIInsightsTab.tsx` | Nová funkce `handleRegenerate`, úprava onClick na Regenerate tlačítku |

---

## Změny

### AIInsightsTab.tsx

**1. Nová funkce pro regeneraci (po řádku ~195)**

```typescript
const handleRegenerate = async () => {
  // Načteme existující campaign_context ze strukturovaných dat
  if (!structuredData?.campaign_context) {
    toast.error("Chybí kontext kampaně. Použijte 'Generate AI Insights' pro první generování.");
    return;
  }
  
  // Zavoláme generování s existujícím kontextem
  await handleGenerateInsights(structuredData.campaign_context);
};
```

**2. Úprava onClick u Regenerate tlačítka (řádky 249-257)**

Z:
```tsx
<Button
  onClick={() => setIsInputDialogOpen(true)}
  variant="outline"
  className="rounded-[35px] border-foreground"
  title="Vygenerovat nové AI Insights"
>
  <RefreshCw className="w-4 h-4 mr-2" />
  Regenerate
</Button>
```

Na:
```tsx
<Button
  onClick={handleRegenerate}
  disabled={isGenerating}
  variant="outline"
  className="rounded-[35px] border-foreground"
  title="Regenerovat AI Insights s existujícím kontextem"
>
  {isGenerating ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <RefreshCw className="w-4 h-4 mr-2" />
  )}
  Regenerate
</Button>
```

**3. Odstranění nepotřebného dialogu ze strukturovaného view (řádky 272-278)**

Dialog `AIInsightsInputDialog` ve strukturovaném view již není potřeba, protože Regenerate nepoužívá dialog.

---

## Výsledné chování

| Akce | Výsledek |
|------|----------|
| První generování (bez dat) | Otevře se dialog pro vyplnění kontextu |
| Regenerace (s existujícími daty) | Přímo se zavolá AI s uloženým kontextem |
| Regenerace (bez kontextu - edge case) | Toast error "Chybí kontext kampaně" |

---

## Technické poznámky

### Kde je uložen campaign_context

Data jsou uložena v `ai_insights_structured.campaign_context`:
```typescript
interface CampaignContext {
  mainGoal: string;
  actions: string;
  highlights: string;
}
```

### Loading state

Tlačítko Regenerate bude:
- Zobrazovat spinner během generování (`isGenerating` state)
- Být disabled během generování

### Edge case handling

Pokud by `campaign_context` neexistoval (starší data), zobrazí se chybová hláška a uživatel bude muset použít první generování s dialogem.

