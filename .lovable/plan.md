

# Plán: Oprava barvy vybrané položky v Command dropdown

## Problém

Vybraná položka v Command dropdownu (project filter) používá fialovou barvu (`bg-accent`), ale podle design systému by měla používat černé pozadí s bílým textem.

---

## Řešení

Upravíme `CommandItem` komponentu tak, aby použila stejný styl jako ostatní dropdown položky v projektu.

---

## Změna

### src/components/ui/command.tsx

**Řádek 108 - změna stylů pro selected stav:**

```tsx
// PŘED:
"data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground"

// PO:
"data-[selected='true']:bg-foreground data-[selected=true]:text-background"
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/ui/command.tsx` | Změnit barvu selected stavu z fialové na černou |

---

## Výsledek

- Vybraná položka bude mít černé pozadí s bílým textem
- Konzistentní vzhled s ostatními dropdown komponentami v projektu
- Odpovídá design systému (hover inverze)

