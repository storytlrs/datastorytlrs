

# Plán: Odstranění headline a zarovnání search baru

## Přehled

Odstraním nadpis "Reports" nad tabulkou a přesunu search bar na stejný řádek jako tlačítko "New Report".

## Současný stav

```text
Reports                                    [New Report]
┌──────────────────────────────────────────┐
│ 🔍 Search reports...                     │
└──────────────────────────────────────────┘
[Date filters] [Type filter] [Project filter]
```

## Cílový stav

```text
🔍 Search reports...                       [New Report]
[Date filters] [Type filter] [Project filter]
```

## Technické řešení

### Změna v BrandDetail.tsx (řádky 399-425)

**Stávající kód:**
```tsx
<TabsContent value="reports">
  {/* Header with New Report button */}
  <div className="flex items-center justify-between mb-6">
    <h2 className="text-2xl font-bold">Reports</h2>
    {canEdit && (
      <Button ...>
        New Report
      </Button>
    )}
  </div>

  {/* Filter Bar */}
  <div className="mb-6 space-y-4">
    {/* Search Bar */}
    <div className="relative">
      <Search ... />
      <Input ... />
    </div>
    
    {/* Filters */}
    <div className="flex flex-wrap gap-3">
```

**Nový kód:**
```tsx
<TabsContent value="reports">
  {/* Header with Search and New Report button */}
  <div className="flex items-center gap-4 mb-6">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder="Search reports..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 rounded-[35px]"
      />
    </div>
    {canEdit && (
      <Button 
        className="rounded-[35px]"
        onClick={() => setCreateDialogOpen(true)}
      >
        <Plus className="w-5 h-5 mr-2" />
        New Report
      </Button>
    )}
  </div>

  {/* Filters */}
  <div className="flex flex-wrap gap-3 mb-6">
```

---

## Shrnutí změn

| Změna | Detail |
|-------|--------|
| Odstranit headline | `<h2 className="text-2xl font-bold">Reports</h2>` |
| Přesunout search bar | Do header divu vedle tlačítka |
| Upravit layout | Search bar s `flex-1` pro roztažení, gap-4 mezi prvky |
| Zjednodušit Filter Bar | Odstranit obalující `space-y-4` div |

## Dotčené soubory

| Soubor | Změna |
|--------|-------|
| `src/pages/BrandDetail.tsx` | Úprava layoutu header sekce (řádky 399-428) |

