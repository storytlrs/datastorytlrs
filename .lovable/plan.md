
# Plán: Opravit ořezávání textů v PDF

## Problém

V PDF exportu je text "Key Insight" ořezáván kvůli CSS třídě `.pdf-line-clamp`, která omezuje zobrazení na 5 řádků pomocí `-webkit-line-clamp: 5` a `overflow: hidden`.

Screenshot ukazuje, že text u @filipsido končí uprostřed věty: "...Nízká zmínka Birellu v komentářích ukazuje na malou přímou relevanci."

---

## Řešení

1. **Odstranit** třídu `pdf-line-clamp` z elementu Key Insight v `AIInsightsContentPDF.tsx`
2. **Alternativně** nebo **navíc**: Upravit CSS, aby `.pdf-line-clamp` neořezával text (pro případ, že by byla použita jinde)

---

## Změny

### 1. src/components/reports/AIInsightsContentPDF.tsx

**Řádek 434** - Odstranit třídu `pdf-line-clamp`:

```tsx
// PŘED:
<p className="text-xs pdf-line-clamp">{creator.key_insight || "No insight available"}</p>

// PO:
<p className="text-xs leading-relaxed">{creator.key_insight || "No insight available"}</p>
```

Přidání `leading-relaxed` zajistí lepší čitelnost delšího textu.

### 2. src/index.css

**Řádky 166-172** - Odstranit nebo upravit `.pdf-line-clamp` pravidlo (pro jistotu):

```css
/* PŘED: */
.pdf-continuous .pdf-line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* PO: Odstranit celý blok nebo změnit na vyšší limit */
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/reports/AIInsightsContentPDF.tsx` | Odstranit `pdf-line-clamp` třídu z Key Insight |
| `src/index.css` | Odstranit `.pdf-line-clamp` CSS pravidlo |

---

## Výsledek

| Vlastnost | Před | Po |
|-----------|------|-----|
| Key Insight text | Ořezaný na 5 řádků | Plný text bez ořezání |
| Ostatní sekce | Beze změny | Beze změny |
