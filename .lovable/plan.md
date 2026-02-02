
# Plán: Brand Picker na všech stránkách

## Problém

Brand picker se aktuálně zobrazuje pouze na stránkách `/brands/:brandId`, protože:
1. Podmínka `isOnBrandPage = location.pathname.startsWith("/brands/")` skryje picker na `/reports/:reportId`
2. `useParams()` vrací `brandId` pouze z URL, takže na report stránce je `undefined`

---

## Řešení

Upravíme `MainNavigation.tsx` tak, aby:
1. Zobrazoval brand picker na všech stránkách (kromě admin)
2. Na stránce reportu zjistil `brandId` z reportu v databázi

---

## Vizuální náhled

```text
Před (Report Detail):
┌────────────────────────────────────────────────────────┐
│  Story TLRS              [nic]              [⚙] [↗]   │
└────────────────────────────────────────────────────────┘

Po (Report Detail):
┌────────────────────────────────────────────────────────┐
│  Story TLRS         [🏢 Brand Name ▼]       [⚙] [↗]   │
└────────────────────────────────────────────────────────┘
```

---

## Implementace

### Úprava `MainNavigation.tsx`

1. **Přidat `reportId` z useParams**
   - Získat `reportId` pokud jsme na stránce reportu

2. **Přidat fetch pro report brand**
   - Pokud máme `reportId`, načíst `space_id` z reportu

3. **Upravit logiku pro currentBrand**
   - Použít `brandId` z URL nebo `space_id` z reportu

4. **Změnit podmínku pro zobrazení pickeru**
   - Zobrazit na všech stránkách kromě admin

---

## Změny v kódu

```tsx
// 1. Rozšířit useParams
const { brandId, reportId } = useParams();

// 2. Nový state pro report brand
const [reportBrandId, setReportBrandId] = useState<string | null>(null);

// 3. Fetch report brand když jsme na stránce reportu
useEffect(() => {
  const fetchReportBrand = async () => {
    if (reportId) {
      const { data } = await supabase
        .from("reports")
        .select("space_id")
        .eq("id", reportId)
        .single();
      setReportBrandId(data?.space_id || null);
    } else {
      setReportBrandId(null);
    }
  };
  fetchReportBrand();
}, [reportId]);

// 4. Použít activeBrandId - buď z URL nebo z reportu
const activeBrandId = brandId || reportBrandId;

// 5. Upravit useEffect pro currentBrand
useEffect(() => {
  if (activeBrandId && brands.length > 0) {
    const brand = brands.find((b) => b.id === activeBrandId);
    setCurrentBrand(brand || null);
  } else {
    setCurrentBrand(null);
  }
}, [activeBrandId, brands]);

// 6. Změnit podmínku pro zobrazení - zobrazit všude kromě admin
const isOnAdminPage = location.pathname === "/admin";

// V JSX:
{!isOnAdminPage && brands.length > 0 && (
  <DropdownMenu>
    ...
  </DropdownMenu>
)}
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/MainNavigation.tsx` | Upravit - přidat podporu pro report stránky |

---

## Výsledek

- Brand picker viditelný na `/brands/:brandId` ✅
- Brand picker viditelný na `/reports/:reportId` ✅ (s automatickou detekcí brandu)
- Brand picker skrytý na `/admin` ✅
