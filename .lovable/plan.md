
# Plán: Oprava hover stavu tlačítka "All reports"

## Problém

Tlačítko "All reports" v detailu reportu má inline přepsané hover styly:
```tsx
className="... hover:bg-accent-green ..."
```

Toto přepisuje standardní `ghost` variantu, která už má správné černé hover chování.

---

## Řešení

Odstranit inline hover styly a nechat tlačítko používat standardní `ghost` variantu.

---

## Změna

### `src/pages/ReportDetail.tsx` (řádek 128-135)

**Před:**
```tsx
<Button
  variant="ghost"
  onClick={() => navigate(`/brands/${report.space_id}?tab=reports`)}
  className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground hover:bg-accent-green rounded-[35px] px-2 mb-2"
>
```

**Po:**
```tsx
<Button
  variant="ghost"
  onClick={() => navigate(`/brands/${report.space_id}?tab=reports`)}
  className="p-0 h-auto font-normal text-muted-foreground rounded-[35px] px-2 mb-2"
>
```

Odstraněno:
- `hover:text-foreground` (ghost varianta už má `hover:text-primary-foreground`)
- `hover:bg-accent-green` (ghost varianta už má `hover:bg-primary`)

---

## Výsledek

| Stav | Před | Po |
|------|------|-----|
| Výchozí | Šedý text, transparentní pozadí | Šedý text, transparentní pozadí |
| Hover | Černý text, **zelené** pozadí | **Bílý** text, **černé** pozadí |

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/pages/ReportDetail.tsx` | Odstranit inline hover styly u "All reports" tlačítka |
