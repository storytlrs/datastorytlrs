
# Plán: Restrukturalizace navigace platformy

## Přehled změn

Po přihlášení bude uživatel přesměrován přímo na detail prvního dostupného brandu (sekce Overview). Horní navigace "Brands / Reports" bude nahrazena **dropdownem pro přepínání mezi brandy**. Aktuální seznam značek (stránka `/brands`) se přesune do **Admin panelu**.

---

## Nová struktura navigace

```text
PŘED:
┌─────────────────────────────────────────────────────────┐
│  Story TLRS    [ Brands | Reports ]    [⚙️] [🚪]       │
└─────────────────────────────────────────────────────────┘

PO:
┌─────────────────────────────────────────────────────────┐
│  Story TLRS    [▼ Brand Name ▼]        [⚙️] [🚪]       │
└─────────────────────────────────────────────────────────┘
```

---

## Tok uživatele

```text
┌──────────┐      ┌─────────────────────────────┐
│  Login   │ ───► │  Brand Detail (Overview)    │
└──────────┘      │  - První dostupný brand     │
                  │  - Dropdown pro přepínání   │
                  └─────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
    ┌─────────┐        ┌───────────┐      ┌───────────┐
    │ Overview│        │ Insights  │      │  Reports  │
    └─────────┘        └───────────┘      └───────────┘
```

---

## Změny v souborech

### 1. src/App.tsx

**Změny:**
- Přidat novou route `/` pro přesměrování na první dostupný brand
- Odstranit route `/brands` (přesune se do admin)
- Route `/brands/:brandId` zůstává (= hlavní stránka po přihlášení)

```tsx
// Nová struktura routes:
<Route path="/" element={<Navigate to="/dashboard" replace />} />
<Route path="/auth" element={<Auth />} />
<Route path="/dashboard" element={<MainLayout><DashboardRedirect /></MainLayout>} />
<Route path="/brands/:brandId" element={<MainLayout><BrandDetail /></MainLayout>} />
<Route path="/reports/:reportId" element={<MainLayout><ReportDetail /></MainLayout>} />
<Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
```

### 2. src/pages/DashboardRedirect.tsx (NOVÝ SOUBOR)

Komponenta, která:
- Načte brandy dostupné pro aktuálního uživatele
- Přesměruje na první dostupný brand (`/brands/{firstBrandId}`)
- Zobrazí chybovou zprávu, pokud uživatel nemá přístup k žádnému brandu

```tsx
const DashboardRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchFirstBrand = async () => {
      const { data: brands } = await supabase
        .from("spaces")
        .select("id")
        .order("name")
        .limit(1);
      
      if (brands && brands.length > 0) {
        navigate(`/brands/${brands[0].id}`, { replace: true });
      }
    };
    fetchFirstBrand();
  }, []);
  
  return <Loading />;
};
```

### 3. src/components/MainNavigation.tsx

**Odstranit:**
- Tabs "Brands" a "Reports"

**Přidat:**
- Dropdown pro přepínání mezi brandy
- Aktuální brand se zobrazuje jako vybraný
- Načítá seznam brandů z databáze

```tsx
// Nová navigace:
<nav>
  <div>Story TLRS</div>
  
  {/* Brand Switcher Dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="rounded-[35px] gap-2">
        <Building2 className="h-4 w-4" />
        {currentBrand?.name || "Select brand"}
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {brands.map(brand => (
        <DropdownMenuItem 
          key={brand.id}
          onClick={() => navigate(`/brands/${brand.id}`)}
        >
          {brand.name}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
  
  <div>
    {isAdmin && <SettingsButton />}
    <LogoutButton />
  </div>
</nav>
```

### 4. src/pages/Admin.tsx

**Přidat:**
- Tabs pro přepínání mezi "Users" a "Brands"
- Sekce "Brands" obsahuje grid karet značek (přesunutá funkcionalita z `/brands`)

```tsx
<Tabs defaultValue="users">
  <TabsList>
    <TabsTrigger value="users">Users</TabsTrigger>
    <TabsTrigger value="brands">Brands</TabsTrigger>
  </TabsList>
  
  <TabsContent value="users">
    <UserList />
  </TabsContent>
  
  <TabsContent value="brands">
    {/* Přesunutý obsah z Brands.tsx */}
    <BrandsGrid />
  </TabsContent>
</Tabs>
```

### 5. src/components/admin/BrandsTab.tsx (NOVÝ SOUBOR)

Nová komponenta obsahující:
- Search bar pro vyhledávání značek
- Tlačítko "New Brand" pro vytvoření nové značky
- Grid karet značek (BrandCard komponenta)
- CreateBrandDialog

```tsx
export const BrandsTab = () => {
  const [brands, setBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Logika z původního Brands.tsx
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <SearchInput />
        <CreateBrandButton />
      </div>
      <BrandsGrid brands={filteredBrands} />
      <CreateBrandDialog />
    </div>
  );
};
```

### 6. src/pages/Auth.tsx

**Změnit:**
- Přesměrování po přihlášení z `/brands` na `/dashboard`

```tsx
// PŘED:
navigate("/brands");

// PO:
navigate("/dashboard");
```

### 7. src/components/MainLayout.tsx

**Změnit:**
- Přesměrování nepřihlášených uživatelů na `/auth` zůstává
- Upravit fallback redirect z `/brands` na `/dashboard`

### 8. Odstranit src/pages/Brands.tsx

Stránka už nebude potřeba - funkcionalita se přesune do Admin panelu.

### 9. Odstranit src/pages/Reports.tsx

Stránka s globálním přehledem reportů už nebude potřeba - reporty se zobrazují v rámci detailu brandu.

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/App.tsx` | Upravit routes |
| `src/pages/DashboardRedirect.tsx` | Vytvořit (přesměrování na první brand) |
| `src/components/MainNavigation.tsx` | Přepsat (brand dropdown místo tabs) |
| `src/pages/Admin.tsx` | Přidat tabs Users/Brands |
| `src/components/admin/BrandsTab.tsx` | Vytvořit (přesunout z Brands.tsx) |
| `src/pages/Auth.tsx` | Změnit redirect na `/dashboard` |
| `src/components/MainLayout.tsx` | Změnit fallback redirect |
| `src/pages/Brands.tsx` | Odstranit |
| `src/pages/Reports.tsx` | Odstranit |

---

## Edge cases

1. **Uživatel bez brandů**: Zobrazí se zpráva "No brands assigned. Contact your administrator."
2. **Admin bez brandů**: Zobrazí se odkaz na Admin panel pro vytvoření brandu
3. **Změna brandu**: Dropdown okamžitě přesměruje na nový brand (Overview tab)
4. **Oprávnění**: BrandsTab v adminu je přístupný pouze pro admin role

---

## Výsledek

| Před | Po |
|------|-----|
| Login → Seznam brandů | Login → Detail prvního brandu |
| Navigace: Brands / Reports tabs | Navigace: Brand dropdown |
| Správa brandů: `/brands` | Správa brandů: `/admin` (Brands tab) |
| Globální Reports: `/reports` | Odstraněno (reporty jsou v rámci brandu) |
