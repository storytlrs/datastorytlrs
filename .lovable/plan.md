
# Plán: Odstranění sekce "Ads" z Influencer campaign reportů

## Přehled

Odstraníme záložku "Ads" a její obsah z reportů typu Influencer campaign. Tato sekce se nachází v souboru `ReportDetail.tsx`.

---

## Změny

**Soubor:** `src/pages/ReportDetail.tsx`

### 1. Odstranění importu AdsTab (řádek 11)

```typescript
// Odstranit tento import
import { AdsTab } from "@/components/reports/AdsTab";
```

### 2. Odstranění TabsTrigger pro "Ads" (řádky 202-204)

V sekci Influencer-specific tabs odstraníme:

```tsx
<TabsTrigger value="ads" className="rounded-[35px]">
  Ads
</TabsTrigger>
```

### 3. Odstranění TabsContent pro "Ads" (řádky 256-258)

V sekci Influencer-specific content odstraníme:

```tsx
<TabsContent value="ads">
  <AdsTab />
</TabsContent>
```

---

## Výsledný kód

Po úpravě bude sekce Influencer tabs vypadat takto:

```tsx
{/* Influencer-specific tabs */}
{isInfluencer && (
  <>
    <TabsTrigger value="creators" className="rounded-[35px]">
      Creators
    </TabsTrigger>
    <TabsTrigger value="content" className="rounded-[35px]">
      Content
    </TabsTrigger>
    <TabsTrigger value="data" className="rounded-[35px]">
      Data
    </TabsTrigger>
  </>
)}
```

A sekce Influencer content:

```tsx
{/* Influencer-specific content */}
{isInfluencer && (
  <>
    <TabsContent value="creators">
      <CreatorsTab reportId={reportId!} />
    </TabsContent>

    <TabsContent value="content">
      <ContentTab reportId={reportId!} />
    </TabsContent>

    <TabsContent value="data">
      <DataTab reportId={reportId!} onImportSuccess={fetchReport} />
    </TabsContent>
  </>
)}
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `src/pages/ReportDetail.tsx` | Odstranění importu `AdsTab`, TabsTrigger a TabsContent pro "Ads" |

---

## Poznámka

Soubor `src/components/reports/AdsTab.tsx` zůstane v projektu pro případné budoucí použití, ale nebude již importován ani zobrazen v Influencer campaign reportech.
