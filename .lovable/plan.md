
# Plán: Sjednocení struktury Admin Panelu

## Přehled změn

1. **Sjednotit layout Users a Brands** - obě sekce budou mít stejnou strukturu (Search + Create button vedle sebe)
2. **Změnit styling tab přepínače** - aktivní tab oranžově, neaktivní černý text
3. **Přidat Edit a Delete tlačítka pro Users** - konzistentní akce jako u Brands
4. **Vytvořit EditUserDialog** - dialog pro editaci uživatele

---

## Vizuální cíl

```text
┌─────────────────────────────────────────────────────────────────┐
│  Admin Panel                                                     │
├─────────────────────────────────────────────────────────────────┤
│  [ Users (oranžově) ]  [ Brands (černě) ]                        │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search users...                              [+ New User]    │
├─────────────────────────────────────────────────────────────────┤
│  Name    │ Email          │ Role     │ Brands  │ Actions        │
├──────────┼────────────────┼──────────┼─────────┼────────────────┤
│  Jan N.  │ jan@email.cz   │ [Admin▼] │ Brand1  │ [Edit] [🗑️]   │
└──────────┴────────────────┴──────────┴─────────┴────────────────┘
```

---

## Změny v souborech

### 1. src/pages/Admin.tsx

**Změny:**
- Přesunout "Create User" tlačítko do `UserList` komponenty (stejně jako u Brands)
- Změnit styling TabsTrigger:
  - Aktivní: oranžové pozadí (`bg-accent-orange text-accent-orange-foreground`)
  - Neaktivní: transparentní s černým textem

```tsx
<TabsTrigger
  value="users"
  className="rounded-[35px] px-6 py-2 text-foreground data-[state=active]:bg-accent-orange data-[state=active]:text-accent-orange-foreground"
>
  Users
</TabsTrigger>
```

### 2. src/components/admin/UserList.tsx

**Změny:**
- Přidat layout jako u Brands: Search vlevo, "New User" button vpravo
- Odstranit sloupec "Brands" (zjednodušení tabulky)
- Přidat sloupce: Edit a Delete v Actions
- Přidat dialog pro editaci uživatele
- Přidat potvrzovací dialog pro smazání uživatele

**Nová struktura tabulky:**

| Name | Email | Role | Actions |
|------|-------|------|---------|
| Jan Novák | jan@email.cz | [Admin ▼] | [Edit] [🗑️] |

**Nová hlavička:**
```tsx
<div className="flex gap-4">
  <div className="flex-1 relative">
    <Search className="..." />
    <Input placeholder="Search users..." />
  </div>
  <Button onClick={() => setIsCreateDialogOpen(true)}>
    <Plus /> New User
  </Button>
</div>
```

### 3. src/components/admin/EditUserDialog.tsx (NOVÝ)

Dialog pro editaci uživatele s polemi:
- Full Name (editovatelné)
- Email (pouze zobrazení - read-only)
- Role (select: Admin / Analyst / Client)

```tsx
interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "analyst" | "client";
  };
  onSuccess: () => void;
}
```

---

## Detailní změny

### Admin.tsx

```tsx
// PŘED:
{activeTab === "users" && (
  <Button onClick={() => setIsCreateDialogOpen(true)}>
    <UserPlus /> Create User
  </Button>
)}

// PO:
// Odstranit - tlačítko bude v UserList komponentě
```

**Tab styling:**
```tsx
// PŘED:
data-[state=active]:bg-foreground data-[state=active]:text-background

// PO:
data-[state=active]:bg-accent-orange data-[state=active]:text-accent-orange-foreground
```

### UserList.tsx

**Přidat state:**
```tsx
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
const [editUser, setEditUser] = useState<UserWithRole | null>(null);
const [deleteUserDialog, setDeleteUserDialog] = useState<UserWithRole | null>(null);
```

**Přidat funkci pro smazání:**
```tsx
const handleDeleteUser = async () => {
  // Smazat uživatele z profiles, user_roles, space_users
};
```

**Upravit Actions sloupec:**
```tsx
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    <Button variant="outline" size="sm" onClick={() => setEditUser(user)}>
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
    <Button variant="ghost" size="icon" onClick={() => setDeleteUserDialog(user)}>
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/pages/Admin.tsx` | Změnit tab styling, odstranit Create button |
| `src/components/admin/UserList.tsx` | Přidat header s Create button, Edit/Delete akce |
| `src/components/admin/EditUserDialog.tsx` | Vytvořit (nový soubor) |

---

## Výsledná konzistence

| Prvek | Users | Brands |
|-------|-------|--------|
| Search bar | ✅ Vlevo | ✅ Vlevo |
| Create button | ✅ Vpravo (New User) | ✅ Vpravo (New Brand) |
| Tabulka | ✅ Stejný styl | ✅ Stejný styl |
| Edit button | ✅ [Edit] | ✅ [View] (navigace) |
| Delete button | ✅ [🗑️] | ✅ [🗑️] |
| Tab aktivní | ✅ Oranžově | ✅ Oranžově |
| Tab neaktivní | ✅ Černý text | ✅ Černý text |
