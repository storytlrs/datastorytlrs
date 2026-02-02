

# Plán: Úprava navigace a odstranění Settings tlačítka

## Přehled změn

Provedeme dvě jednoduché úpravy:
1. Odstraníme tlačítko Settings z detailu brand space
2. Změníme ikonu v hlavní navigaci z ozubeného kolečka na ikonu uživatele

---

## Změny

### 1. BrandDetail.tsx - Odstranění Settings tlačítka

Odstraníme celý blok s tlačítkem Settings v headeru (řádky 192-201):

```tsx
// PŘED - odstranit tento kód:
{isAdmin && (
  <Button
    variant="outline"
    onClick={() => setEditDialogOpen(true)}
    size="icon"
    className="rounded-[35px] border-foreground"
  >
    <Settings className="w-4 h-4" />
  </Button>
)}
```

Také odstraníme:
- Import `Settings` z lucide-react (řádek 5)
- State `editDialogOpen` (řádek 83)
- Komponentu `EditBrandDialog` a její import (řádky 16 a konec souboru)

### 2. MainNavigation.tsx - Změna ikony na User

Změníme import a ikonu:

```tsx
// PŘED:
import { LogOut, Settings, Building2, ChevronDown, Check, ArrowLeft } from "lucide-react";
// ...
<Settings className="h-4 w-4" />

// PO:
import { LogOut, User, Building2, ChevronDown, Check, ArrowLeft } from "lucide-react";
// ...
<User className="h-4 w-4" />
```

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/pages/BrandDetail.tsx` | Odstranit Settings tlačítko, EditBrandDialog a související kód |
| `src/components/MainNavigation.tsx` | Změnit ikonu Settings na User |

---

## Výsledek

- V detailu brandu nebude žádné tlačítko pro editaci (správa pouze přes Admin panel)
- V hlavní navigaci bude ikona uživatele místo ozubeného kolečka
- Funkčnost zůstává stejná: Admin uživatelé půjdou do Admin panelu, ostatní otevřou profil

