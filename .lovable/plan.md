

# Plán: Vylepšení DatePickeru - Výběr Měsíce a Roku

## Požadavky

1. **Kliknutí na Měsíc/Rok** - umožnit přímý výběr měsíce a roku přes dropdown
2. **Stabilní velikost kontejneru** - při navigaci šipkami se nesmí měnit velikost kalendáře

---

## Řešení

React Day Picker v8 (nainstalovaná verze 8.10.1) má vestavěnou podporu pro dropdown výběr měsíce a roku pomocí prop `captionLayout="dropdown"`.

---

## Vizuální náhled

```text
Současný stav:                     Nový stav:
┌─────────────────────────┐        ┌─────────────────────────┐
│  ◄    January 2026    ► │        │  ◄  [Jan ▼] [2026 ▼]  ► │
├─────────────────────────┤        ├─────────────────────────┤
│ Mo Tu We Th Fr Sa Su    │        │ Mo Tu We Th Fr Sa Su    │
│        1  2  3  4  5    │        │        1  2  3  4  5    │
│  6  7  8  9 10 11 12    │        │  6  7  8  9 10 11 12    │
│ ...                     │        │ ...                     │
└─────────────────────────┘        └─────────────────────────┘
```

---

## Změny

### 1. Úprava `src/components/ui/calendar.tsx`

**Přidané vlastnosti:**

| Prop | Hodnota | Účel |
|------|---------|------|
| `captionLayout` | `"dropdown"` | Dropdown pro měsíc a rok |
| `startMonth` | `new Date(2020, 0)` | Od ledna 2020 |
| `endMonth` | `new Date(2030, 11)` | Do prosince 2030 |
| `fixedWeeks` | `true` | Vždy 6 řádků - stabilní výška |

**Nové CSS třídy pro dropdowny:**

```tsx
caption_dropdowns: "flex gap-1 items-center justify-center",
dropdown: "...",  // Stylování dropdown prvků
dropdown_month: "...",
dropdown_year: "...",
vhidden: "hidden",  // Skrytí screen reader textu
```

**Fixní šířka kontejneru:**

```tsx
month: "space-y-4 w-[280px]",  // Fixní šířka pro stabilitu
```

---

## Implementace

### Upravený `calendar.tsx`

```tsx
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      fixedWeeks
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-[280px]",
        caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex gap-1 items-center",
        dropdown: "appearance-none bg-transparent border border-foreground rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-foreground hover:text-background focus:outline-none focus:ring-2 focus:ring-ring",
        dropdown_month: "",
        dropdown_year: "",
        vhidden: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative ...",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        // ... ostatní existující třídy
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/ui/calendar.tsx` | Upravit - přidat dropdown layout a fixní velikost |

---

## Výsledek

- **Měsíc a Rok** - kliknutím se otevře dropdown pro rychlý výběr
- **Stabilní velikost** - `fixedWeeks` zajistí vždy 6 řádků, `w-[280px]` fixní šířku
- **Konzistentní styling** - dropdowny budou mít černý outline a hover inverzi jako ostatní prvky

