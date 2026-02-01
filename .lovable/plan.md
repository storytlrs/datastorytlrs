
# Plán: Zmenšení zakulacení u dropdown seznamů

## Problém

Dropdowny používají `rounded-md` třídu, která se v Tailwind konfiguraci mapuje na `calc(var(--radius) - 2px)` = `33px`. To je příliš velké zakulacení pro dropdown seznamy a vypadá to divně, zejména s položkami uvnitř.

---

## Řešení

Nahradit `rounded-md` za `rounded-xl` (12px) u všech dropdown kontejnerů. Toto zakulacení je konzistentní, čisté a nekonfliktuje s hlavním design systémem (35px pro tlačítka a karty).

---

## Dotčené komponenty

| Komponenta | Soubor | Změna |
|------------|--------|-------|
| SelectContent | `src/components/ui/select.tsx` | `rounded-md` → `rounded-xl` |
| DropdownMenuContent | `src/components/ui/dropdown-menu.tsx` | `rounded-md` → `rounded-xl` |
| DropdownMenuSubContent | `src/components/ui/dropdown-menu.tsx` | `rounded-md` → `rounded-xl` |
| PopoverContent | `src/components/ui/popover.tsx` | `rounded-md` → `rounded-xl` |
| HoverCardContent | `src/components/ui/hover-card.tsx` | `rounded-md` → `rounded-xl` |
| TooltipContent | `src/components/ui/tooltip.tsx` | `rounded-md` → `rounded-xl` |
| ContextMenuContent | `src/components/ui/context-menu.tsx` | `rounded-md` → `rounded-xl` |
| ContextMenuSubContent | `src/components/ui/context-menu.tsx` | `rounded-md` → `rounded-xl` |
| MenubarContent | `src/components/ui/menubar.tsx` | `rounded-md` → `rounded-xl` |
| MenubarSubContent | `src/components/ui/menubar.tsx` | `rounded-md` → `rounded-xl` |
| Command | `src/components/ui/command.tsx` | `rounded-md` → `rounded-xl` |

---

## Vizuální porovnání

```text
PŘED (rounded-md = 33px):          PO (rounded-xl = 12px):
┌─────────────────────┐            ┌─────────────────────┐
│                     │            │                     │
│     Admin      ▼    │            │     Admin      ▼    │
│                     │            │                     │
└─────────────────────┘            └─────────────────────┘
        │                                  │
        ▼                                  ▼
  ╭───────────────────╮            ┌───────────────────┐
  │  ✓ Admin          │            │  ✓ Admin          │
  │    Analyst        │            │    Analyst        │
  │    Client         │            │    Client         │
  ╰───────────────────╯            └───────────────────┘
  (příliš zakulacené)              (přiměřené zakulacení)
```

---

## Technické detaily

`rounded-xl` v Tailwindu odpovídá `border-radius: 0.75rem` (12px), což je:
- Dostatečně zakulacené pro moderní vzhled
- Konzistentní s běžnými dropdown menu
- Nekonfliktuje s 35px zakulacením tlačítek a karet

---

## Implementační kroky

1. Upravit `select.tsx` - změnit `rounded-md` na `rounded-xl` v SelectContent
2. Upravit `dropdown-menu.tsx` - změnit zakulacení v Content a SubContent
3. Upravit `popover.tsx` - změnit zakulacení v PopoverContent
4. Upravit `hover-card.tsx` - změnit zakulacení v HoverCardContent
5. Upravit `tooltip.tsx` - změnit zakulacení v TooltipContent
6. Upravit `context-menu.tsx` - změnit zakulacení v Content a SubContent
7. Upravit `menubar.tsx` - změnit zakulacení v Content a SubContent
8. Upravit `command.tsx` - změnit zakulacení v Command komponentě
