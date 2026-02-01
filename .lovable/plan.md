
# Plán: Sjednocení hover stavů na černou

## Problém

1. **Settings ikony** (v navigaci, BrandDetail, ReportDetail) - při hoveru oranžová, má být černá
2. **"Clear filters" tlačítko** (ghost varianta) - při hoveru fialová (`hover:bg-accent`), má být černá

---

## Změny

### 1. Odstranit inline hover styly u Settings tlačítek

| Soubor | Akce |
|--------|------|
| `src/components/MainNavigation.tsx` | Odstranit `hover:bg-accent-orange hover:border-accent-orange hover:text-accent-orange-foreground` |
| `src/pages/BrandDetail.tsx` | Odstranit `hover:bg-accent-orange hover:border-accent-orange hover:text-accent-orange-foreground` |
| `src/pages/ReportDetail.tsx` | Odstranit `hover:bg-accent-orange hover:border-accent-orange hover:text-accent-orange-foreground` |

Settings tlačítka používají `variant="outline"`, který už má správnou inverzi:
```tsx
outline: "... hover:bg-primary hover:text-primary-foreground"
// = černé pozadí, bílý text na hover ✓
```

### 2. Upravit ghost variantu v button.tsx

```tsx
// PŘED:
ghost: "border-transparent hover:bg-accent hover:text-accent-foreground"
// = fialové pozadí na hover

// PO:
ghost: "border-transparent hover:bg-primary hover:text-primary-foreground"
// = černé pozadí, bílý text na hover
```

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/ui/button.tsx` | Ghost varianta: `hover:bg-primary hover:text-primary-foreground` |
| `src/components/MainNavigation.tsx` | Odstranit inline hover styly u Settings |
| `src/pages/BrandDetail.tsx` | Odstranit inline hover styly u Settings |
| `src/pages/ReportDetail.tsx` | Odstranit inline hover styly u Settings |

---

## Výsledné chování

| Prvek | Výchozí | Hover |
|-------|---------|-------|
| Settings (outline) | Černý outline, černý text | Černé pozadí, bílý text |
| Clear filters (ghost) | Transparentní, černý text | Černé pozadí, bílý text |
| Back button (outline) | Černý outline, černý text | Černé pozadí, bílý text |
