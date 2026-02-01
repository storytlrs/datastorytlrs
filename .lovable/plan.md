
# Plán: Odstranění tlačítka "Edit raw"

## Přehled

Odstraníme tlačítko "Edit raw" ze sekce AI Insights, které se nachází vedle tlačítka "Regenerate".

---

## Změny

**Soubor:** `src/components/reports/AIInsightsTab.tsx`

### Odstranění tlačítka (řádky 259-267)

Odstraníme tento kód:

```tsx
<Button
  onClick={() => setIsEditing(true)}
  variant="ghost"
  size="sm"
  className="rounded-[35px]"
>
  <Pencil className="w-4 h-4 mr-2" />
  Edit raw
</Button>
```

Po změně zůstane pouze tlačítko "Regenerate":

```tsx
<div className="flex items-center justify-end gap-2">
  {canEdit && (
    <Button
      onClick={() => setIsInputDialogOpen(true)}
      variant="outline"
      className="rounded-[35px] border-foreground"
      title="Vygenerovat nové AI Insights"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Regenerate
    </Button>
  )}
</div>
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `src/components/reports/AIInsightsTab.tsx` | Odstranění tlačítka "Edit raw" (řádky 259-267) |

---

## Poznámka

Stav `isEditing` a související logika pro raw editaci zůstanou v kódu (pro případné budoucí použití), ale tlačítko pro přepnutí do tohoto režimu bude odstraněno.
