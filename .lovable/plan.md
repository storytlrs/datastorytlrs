
# Plán: Odstranit text "X contributors"

## Změna

Odstraním text "X contributors" z komponenty `ReportContributors`. Zůstanou pouze překrývající se avatary s tooltipem.

---

## Před a Po

```text
Před:  👤👤👤 3 contributors
Po:    👤👤👤
```

---

## Úprava

### `src/components/reports/ReportContributors.tsx`

Odstraním řádky 87-89:
```tsx
<span className="ml-2 text-sm">
  {contributors.length} contributor{contributors.length !== 1 ? "s" : ""}
</span>
```

---

## Výsledný kód

```tsx
return (
  <TooltipProvider>
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {/* Avatary zůstávají beze změny */}
      </div>
      {/* Text odstraněn */}
    </div>
  </TooltipProvider>
);
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/reports/ReportContributors.tsx` | Odstranit text "X contributors" |
