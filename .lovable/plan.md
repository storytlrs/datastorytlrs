
# Plán: Abecední řazení filtrů pro Creators a Platforms

## Přehled

Nastavíme abecední řazení (A-Z) pro možnosti ve filtrech Creators a Platforms v Overview sekci.

---

## Aktuální stav

| Filtr | Aktuální řazení |
|-------|-----------------|
| Platforms | Již řazeno abecedně (`.sort()` na řádku 127) |
| Creators | Neřazeno - zobrazuje se v pořadí z databáze |

---

## Změny

**Soubor:** `src/components/reports/OverviewTab.tsx`

### Přidání memoizovaného seřazeného seznamu creators (za řádek 128)

Vytvoříme nový useMemo hook pro seřazené creators:

```typescript
// Sorted creators for filter dropdown
const sortedCreators = useMemo(() => {
  return [...creators].sort((a, b) => 
    a.handle.toLowerCase().localeCompare(b.handle.toLowerCase())
  );
}, [creators]);
```

### Aktualizace Creator filtru v UI (řádky 350-354)

Změníme `creators.map` na `sortedCreators.map`:

```tsx
{sortedCreators.map((creator) => (
  <SelectItem key={creator.id} value={creator.id}>
    {creator.handle}
  </SelectItem>
))}
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `src/components/reports/OverviewTab.tsx` | Přidání `sortedCreators` useMemo hook, aktualizace mapování v UI |

---

## Technické poznámky

- Použijeme `localeCompare()` pro správné řazení včetně diakritiky
- Řazení bude case-insensitive (`.toLowerCase()`)
- Platformy již fungují správně - není potřeba měnit
