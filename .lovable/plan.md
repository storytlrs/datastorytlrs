
# Plán: Přidání Edit tlačítka pro Brands

## Přehled

Přidáme tlačítko "Edit" do tabulky Brands v Admin panelu. Dialog pro editaci brandu (`EditBrandDialog`) již existuje, stačí ho pouze integrovat.

---

## Změny v BrandsTab.tsx

### 1. Import EditBrandDialog

```tsx
import EditBrandDialog from "@/components/brands/EditBrandDialog";
```

### 2. Přidat state pro editaci

```tsx
const [editBrand, setEditBrand] = useState<Brand | null>(null);
```

### 3. Přidat Edit tlačítko do Actions sloupce

Aktuální struktura:
```tsx
<Button variant="outline">View</Button>
<Button variant="ghost"><Trash2 /></Button>
```

Nová struktura:
```tsx
<Button variant="outline">Edit</Button>
<Button variant="outline">View</Button>
<Button variant="ghost"><Trash2 /></Button>
```

### 4. Přidat EditBrandDialog na konec komponenty

```tsx
{editBrand && (
  <EditBrandDialog
    open={!!editBrand}
    onOpenChange={(open) => !open && setEditBrand(null)}
    brand={editBrand}
    onSuccess={fetchBrands}
  />
)}
```

---

## Vizuální výsledek

| Name | Description | Created | Actions |
|------|-------------|---------|---------|
| Birell | Pivo bez alkoholu | 15.1.2025 | [Edit] [View] [🗑️] |

---

## Konzistence s Users

| Prvek | Users | Brands |
|-------|-------|--------|
| Edit button | ✅ [Edit] | ✅ [Edit] (nově) |
| View/Detail | - | ✅ [View] (navigace) |
| Delete button | ✅ [🗑️] | ✅ [🗑️] |

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/components/admin/BrandsTab.tsx` | Přidat Edit tlačítko a integrovat EditBrandDialog |
