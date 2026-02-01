
# Plán: Sjednocení chování buttonů a prvků napříč platformou

## Požadavky

1. **Tab přepínače** (jako Users/Brands v Admin panelu):
   - Černé pozadí s bílým textem
   - Aktivní tab označen zeleným badgem (pill) - jako na screenshotu

2. **Hover chování - inverze barev**:
   - Prvky s černým pozadím a bílým textem → při hoveru invertovat na bílé pozadí a černý text
   - Prvky s černým textem a černým outline na světlém pozadí → při hoveru invertovat na černé pozadí a bílý text

3. **Aktivní filtry a date pickery**:
   - Oranžové zvýraznění (toto už funguje správně)

---

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/components/ui/tabs.tsx` | Nový styl pro TabsList a TabsTrigger |
| `src/components/ui/button.tsx` | Přidat hover inverzi pro default a outline varianty |
| `src/pages/Admin.tsx` | Odstranit inline přepisování stylů tabs |
| `src/pages/ReportDetail.tsx` | Odstranit inline přepisování stylů tabs |
| `src/pages/BrandDetail.tsx` | Odstranit inline přepisování stylů tabs |
| `src/components/reports/DataTab.tsx` | Odstranit inline přepisování stylů tabs |
| `src/components/reports/AdsDataTab.tsx` | Odstranit inline přepisování stylů tabs |
| `src/components/reports/AlwaysOnDataTab.tsx` | Odstranit inline přepisování stylů tabs |
| `src/components/reports/AdsTab.tsx` | Odstranit inline přepisování stylů tabs |

---

## Vizuální cíl (ze screenshotu)

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │ ▪ Overview    ▪ Insights    ┌──────────┐             │   │
│   │                             │ Reports  │ ← zelený    │   │
│   │  (bílý text)                └──────────┘   badge     │   │
│   └──────────────────────────────────────────────────────┘   │
│        ↑ černé pozadí                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. Změny v tabs.tsx

### TabsList - nový defaultní styl:
```tsx
// Černé pozadí, zakulacené, padding pro badge efekt
"inline-flex h-12 items-center justify-center rounded-full bg-primary p-1.5 text-primary-foreground"
```

### TabsTrigger - aktivní stav se zeleným badge:
```tsx
// Neaktivní: bílý text, transparentní pozadí
// Aktivní: zelený badge (bg-accent-green), černý text, zakulacené
"inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium
 text-primary-foreground/80 transition-all
 hover:text-primary-foreground
 data-[state=active]:bg-accent-green 
 data-[state=active]:text-accent-green-foreground 
 data-[state=active]:shadow-sm"
```

---

## 2. Změny v button.tsx - hover inverze

### Varianta `default` (černé pozadí):
```tsx
// PŘED:
"border-primary bg-primary text-primary-foreground hover:bg-primary/90"

// PO (inverze na hover):
"border-primary bg-primary text-primary-foreground 
 hover:bg-background hover:text-foreground hover:border-foreground"
```

### Varianta `outline` (černý outline na světlém pozadí):
```tsx
// PŘED:
"border-primary bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground"

// PO (zůstává stejné - už má správnou inverzi):
"border-primary bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground"
```

---

## 3. Cleanup - odstranění inline stylů

Všechny stránky, které přepisují TabsList/TabsTrigger styly inline, budou zjednodušeny:

### Admin.tsx
```tsx
// PŘED:
<TabsList className="mb-6 rounded-[35px] border border-foreground p-1 bg-transparent w-auto inline-flex">
  <TabsTrigger
    value="users"
    className="rounded-[35px] px-6 py-2 text-foreground data-[state=active]:bg-accent-orange..."
  >

// PO:
<TabsList className="mb-6">
  <TabsTrigger value="users">
```

### ReportDetail.tsx, BrandDetail.tsx, DataTab.tsx, atd.
```tsx
// PŘED:
<TabsList className="rounded-[35px] border border-foreground mb-8">
  <TabsTrigger value="overview" className="rounded-[35px]">

// PO:
<TabsList className="mb-8">
  <TabsTrigger value="overview">
```

---

## 4. Výsledné chování prvků

| Prvek | Výchozí stav | Hover stav | Aktivní stav |
|-------|--------------|------------|--------------|
| Tab (neaktivní) | Černé pozadí, bílý text | Světlejší bílý text | - |
| Tab (aktivní) | - | - | Zelený badge, černý text |
| Button default | Černé pozadí, bílý text | Světlé pozadí, černý text | - |
| Button outline | Černý outline, černý text | Černé pozadí, bílý text | - |
| Filtr/DatePicker aktivní | - | - | Oranžové pozadí |

---

## Implementační kroky

1. **Upravit `tabs.tsx`** - nový styl TabsList (černé pozadí) a TabsTrigger (zelený aktivní badge)

2. **Upravit `button.tsx`** - přidat hover inverzi pro default variantu

3. **Vyčistit `Admin.tsx`** - odstranit inline styly tabs

4. **Vyčistit `ReportDetail.tsx`** - odstranit inline styly tabs

5. **Vyčistit `BrandDetail.tsx`** - odstranit inline styly tabs

6. **Vyčistit `DataTab.tsx`** - odstranit inline styly tabs

7. **Vyčistit `AdsDataTab.tsx`** - odstranit inline styly tabs

8. **Vyčistit `AlwaysOnDataTab.tsx`** - odstranit inline styly tabs

9. **Vyčistit `AdsTab.tsx`** - odstranit inline styly tabs
