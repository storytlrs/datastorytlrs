
# Plán: Přejmenování "AI Insights" na "Insights"

## Přehled

Přejmenujeme záložku "AI Insights" na "Insights" ve všech místech, kde se zobrazuje jako tab/záložka. Texty uvnitř komponent (jako "Generate AI Insights") zůstanou nezměněny.

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/pages/ReportDetail.tsx` | Přejmenování tabu z "AI Insights" na "Insights" |
| `src/pages/BrandDetail.tsx` | Přejmenování tabu a nadpisu sekce z "AI Insights" na "Insights" |

---

## Změny

### 1. ReportDetail.tsx (řádek 190)

```tsx
// Před
<TabsTrigger value="insights" className="rounded-[35px]">
  AI Insights
</TabsTrigger>

// Po
<TabsTrigger value="insights" className="rounded-[35px]">
  Insights
</TabsTrigger>
```

### 2. BrandDetail.tsx (řádky 185 a 196)

**Tab (řádek 185):**
```tsx
// Před
<TabsTrigger value="insights" className="rounded-[35px]">AI Insights</TabsTrigger>

// Po
<TabsTrigger value="insights" className="rounded-[35px]">Insights</TabsTrigger>
```

**Nadpis sekce (řádek 196):**
```tsx
// Před
<h2 className="text-2xl font-bold">AI Insights</h2>

// Po
<h2 className="text-2xl font-bold">Insights</h2>
```

---

## Poznámky

- Texty tlačítek ("Generate AI Insights") a interní toast zprávy zůstanou nezměněny, protože uživatel požádal pouze o přejmenování tabů
- Název komponenty `AIInsightsTab` a souboru zůstane nezměněn pro zachování konzistence kódu
