
# Plán: Vylepšení Admin Panelu

## Přehled změn

1. **Opravit zobrazení tabů** - "Brands" tab je oříznutý
2. **Převést Users a Brands na tabulky** - každý záznam jako řádek
3. **Přidat vyhledávání do Users**
4. **Odstranit popis pod nadpisem** "Manage users, brands, and permissions"
5. **Přidat tlačítko zpět do navigace** na brand stránku
6. **Změnit chování Settings tlačítka**:
   - Admin → Admin panel
   - Non-admin → Uživatelský profil
7. **Přidat editaci profilu pro všechny uživatele** (včetně adminů)

---

## 1. Oprava tabů v Admin.tsx

Problém: TabsList má `inline-flex` a nedostatečnou šířku, proto se "Brands" ořezává.

**Řešení:** Přidat `w-auto` k TabsList a zajistit, že oba triggery mají prostor.

```tsx
<TabsList className="mb-6 rounded-[35px] border border-foreground p-1 bg-transparent w-auto">
```

---

## 2. Users jako tabulka (UserList.tsx)

Převést z Card gridu na tabulku s kolonkami:
- Name
- Email  
- Role (dropdown)
- Brands (badges)
- Actions (Assign to Brand)

**Nová struktura:**

| Name | Email | Role | Brands | Actions |
|------|-------|------|--------|---------|
| Jan Novák | jan@email.cz | [Admin ▼] | `Brand1` `Brand2` | [Assign] |

**Přidat vyhledávání:**
- Search bar nad tabulkou
- Filtrování podle name a email

---

## 3. Brands jako tabulka (BrandsTab.tsx)

Převést z Card gridu na tabulku s kolonkami:
- Name
- Description
- Created
- Actions (View, Delete)

**Nová struktura:**

| Name | Description | Created | Actions |
|------|-------------|---------|---------|
| Birell | Pivo bez alkoholu | 15.1.2025 | [View] [🗑️] |

---

## 4. Odstranit popis v Admin.tsx

```tsx
// Odstranit tento řádek:
<p className="text-muted-foreground">
  Manage users, brands, and permissions
</p>
```

---

## 5. Přidat tlačítko zpět do MainNavigation.tsx

Přidat `ArrowLeft` tlačítko, které se zobrazí na Admin stránce a vrátí uživatele na dashboard.

```tsx
{isOnAdminPage && (
  <Button
    onClick={() => navigate("/dashboard")}
    variant="outline"
    size="icon"
    className="rounded-[35px] border-foreground"
  >
    <ArrowLeft className="h-4 w-4" />
  </Button>
)}
```

---

## 6. Změnit chování Settings tlačítka

**Pro Admin:**
- Klik → navigace na `/admin`

**Pro non-Admin (Analyst, Client):**
- Klik → otevření dialogu pro editaci profilu

**Pro všechny (včetně Admin):**
- Přidat možnost editovat vlastní profil z Admin panelu

---

## 7. Nová komponenta: EditProfileDialog.tsx

Dialog pro editaci uživatelského profilu:
- Full name (text input)
- Email (readonly - zobrazení)
- Tlačítka: Save, Cancel

**Props:**
```tsx
interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/pages/Admin.tsx` | Odstranit popis, opravit tabs šířku |
| `src/components/admin/UserList.tsx` | Převést na tabulku, přidat search |
| `src/components/admin/BrandsTab.tsx` | Převést na tabulku |
| `src/components/MainNavigation.tsx` | Přidat back button, změnit Settings logiku |
| `src/components/profile/EditProfileDialog.tsx` | Vytvořit (nový soubor) |

---

## Vizualizace výsledku

### Admin Panel - Users Tab

```text
┌─────────────────────────────────────────────────────────────────┐
│  Admin Panel                              [+ Create User]        │
├─────────────────────────────────────────────────────────────────┤
│  [ Users ]  [ Brands ]                                           │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search users...                                              │
├─────────────────────────────────────────────────────────────────┤
│  Name        │ Email           │ Role      │ Brands   │ Actions │
├──────────────┼─────────────────┼───────────┼──────────┼─────────┤
│  Jan Novák   │ jan@email.cz    │ [Admin ▼] │ Birell   │ [Assign]│
│  Marie K.    │ marie@test.cz   │ [Client▼] │ Brand2   │ [Assign]│
└──────────────┴─────────────────┴───────────┴──────────┴─────────┘
```

### Admin Panel - Brands Tab

```text
┌─────────────────────────────────────────────────────────────────┐
│  Admin Panel                                                     │
├─────────────────────────────────────────────────────────────────┤
│  [ Users ]  [ Brands ]                                           │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search brands...                                [+ New Brand]│
├─────────────────────────────────────────────────────────────────┤
│  Name        │ Description          │ Created    │ Actions       │
├──────────────┼──────────────────────┼────────────┼───────────────┤
│  Birell      │ Pivo bez alkoholu    │ 15.1.2025  │ [View] [🗑️]  │
│  Nike        │ Sportovní značka     │ 10.1.2025  │ [View] [🗑️]  │
└──────────────┴──────────────────────┴────────────┴───────────────┘
```

### Navigace - Pro Admin

```text
┌─────────────────────────────────────────────────────────────────┐
│  Story TLRS    [◀ Back]  [▼ Brand Name ▼]    [⚙️ Admin] [🚪]    │
└─────────────────────────────────────────────────────────────────┘
```

### Navigace - Pro non-Admin

```text
┌─────────────────────────────────────────────────────────────────┐
│  Story TLRS           [▼ Brand Name ▼]        [⚙️ Profile] [🚪] │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technické detaily

### UserList.tsx - Změny

1. Přidat state pro `searchQuery`
2. Přidat Input s ikonou Search nad tabulku
3. Nahradit Card grid za Table komponentu:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Brands</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredUsers.map((user) => (
      <TableRow key={user.id}>
        <TableCell>{user.full_name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell><RoleSelect /></TableCell>
        <TableCell><BrandBadges /></TableCell>
        <TableCell><AssignButton /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### BrandsTab.tsx - Změny

Nahradit grid karet za tabulku:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Description</TableHead>
      <TableHead>Created</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredBrands.map((brand) => (
      <TableRow key={brand.id}>
        <TableCell>{brand.name}</TableCell>
        <TableCell>{brand.description || "-"}</TableCell>
        <TableCell>{format(new Date(brand.created_at), "d.M.yyyy")}</TableCell>
        <TableCell>
          <Button onClick={() => navigate(`/brands/${brand.id}`)}>View</Button>
          <Button variant="ghost" onClick={handleDelete}><Trash2 /></Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### MainNavigation.tsx - Změny

1. Přidat `isOnAdminPage` check
2. Přidat back button pro admin stránku
3. Změnit Settings tlačítko:

```tsx
<Button
  onClick={() => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      setIsProfileDialogOpen(true);
    }
  }}
  variant="outline"
  size="icon"
>
  <Settings className="h-4 w-4" />
</Button>
```

4. Přidat EditProfileDialog do navigace

### EditProfileDialog.tsx - Nový soubor

```tsx
export const EditProfileDialog = ({ open, onOpenChange }: Props) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current user profile
  }, [open]);

  const handleSave = async () => {
    // Update profile in Supabase
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input value={fullName} onChange={...} placeholder="Full Name" />
          <Input value={email} disabled />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Admin profil editace

V Admin panelu přidat sekci nebo tlačítko "Edit My Profile" v headeru, které otevře stejný EditProfileDialog pro admina.
