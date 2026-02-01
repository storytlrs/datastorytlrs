

# Plán: Univerzální Import s Mapováním Sloupců

## Přehled

Vytvoříme nový importní systém, který:
1. Přijme jakýkoliv XLSX/CSV soubor
2. Automaticky extrahuje názvy sloupců a ukázkové hodnoty
3. Umožní uživateli namapovat každý sloupec na pole v tabulkách Creators, Content nebo Promo Codes
4. Importuje data podle mapování do všech tří tabulek najednou

---

## Uživatelský Flow

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Step 1: Upload │ --> │  Step 2: Map    │ --> │  Step 3: Review │
│                 │     │                 │     │                 │
│  Nahrát soubor  │     │  Přiřadit       │     │  Zkontrolovat   │
│  XLSX/CSV       │     │  sloupce k      │     │  a potvrdit     │
│                 │     │  Creators,      │     │  import         │
│                 │     │  Content,       │     │                 │
│                 │     │  Promo Codes    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Vizuální náhled mapovacího kroku

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           Map Columns to Fields                                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  File: campaign_export.xlsx  |  12 columns detected  |  45 rows               │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Source Column     │ Sample Data           │ Map to                     │   │
│  ├───────────────────┼───────────────────────┼────────────────────────────┤   │
│  │ Username          │ @anna_fit, @foodie... │ [Creators: Handle       ▼] │   │
│  │ Platform          │ instagram, tiktok...  │ [Creators: Platform     ▼] │   │
│  │ Followers         │ 125000, 89000...      │ [Creators: Followers    ▼] │   │
│  │ Post URL          │ https://insta...      │ [Content: URL           ▼] │   │
│  │ Post Type         │ reel, story, post...  │ [Content: Content Type  ▼] │   │
│  │ Published         │ 2026-01-15, ...       │ [Content: Published Date▼] │   │
│  │ Reach             │ 45000, 32000...       │ [Content: Reach         ▼] │   │
│  │ Views             │ 120000, 85000...      │ [Content: Views         ▼] │   │
│  │ Likes             │ 4500, 2800...         │ [Content: Likes         ▼] │   │
│  │ Comments          │ 120, 85...            │ [Content: Comments      ▼] │   │
│  │ Promo Code        │ ANNA20, FOOD15...     │ [Promo Codes: Code      ▼] │   │
│  │ Revenue           │ 15000, 8000...        │ [Promo Codes: Revenue   ▼] │   │
│  └───────────────────┴───────────────────────┴────────────────────────────┘   │
│                                                                                │
│  Legend: Pole označená jako "required" jsou nutná pro import daného typu      │
│                                                                                │
│                                            [← Back]  [Cancel]  [Import →]     │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mapovací konfigurace

### Cílová pole rozdělená podle tabulky:

**Creators (influenceři)**
| Pole | Popis | Povinné |
|------|-------|---------|
| handle | Handle/username | ✅ |
| platform | instagram, tiktok, youtube | ✅ |
| followers | Počet sledujících | |
| posts_count | Plánovaný počet postů | |
| posts_cost | Cena za post | |
| reels_count | Plánovaný počet reels | |
| reels_cost | Cena za reel | |
| stories_count | Plánovaný počet stories | |
| stories_cost | Cena za story | |
| currency | Měna (CZK, EUR, USD) | |
| avg_reach | Očekávaný průměrný reach | |
| avg_views | Očekávané průměrné views | |
| avg_engagement_rate | Očekávané ER % | |
| profile_url | URL profilu | |
| notes | Poznámky | |

**Content (příspěvky)**
| Pole | Popis | Povinné |
|------|-------|---------|
| creator_handle | Handle tvůrce (pro propojení) | ✅ |
| platform | Platforma | ✅ |
| content_type | post, reel, story, video, short | ✅ |
| url | URL příspěvku | |
| published_date | Datum publikace | |
| reach | Dosah | |
| impressions | Zobrazení | |
| views | Zhlédnutí | |
| likes | Lajky | |
| comments | Komentáře | |
| shares | Sdílení | |
| saves | Uložení | |
| reposts | Reposts | |
| sticker_clicks | Sticker clicks | |
| link_clicks | Link clicks | |
| watch_time | Watch time (sekundy) | |
| avg_watch_time | Průměrný watch time | |
| engagement_rate | ER % | |
| sentiment | positive/negative/neutral | |
| sentiment_summary | Souhrn sentimentu | |

**Promo Codes (e-commerce)**
| Pole | Popis | Povinné |
|------|-------|---------|
| creator_handle | Handle tvůrce (pro propojení) | |
| code | Promo kód | ✅ |
| clicks | Počet kliků | |
| purchases | Počet nákupů | |
| revenue | Tržby | |
| conversion_rate | Konverze % | |

---

## Logika automatického mapování (suggestions)

Systém automaticky navrhne mapování na základě názvu sloupce:

```typescript
const autoSuggestions: Record<string, string> = {
  // Creators
  "handle": "creators.handle",
  "username": "creators.handle",
  "account": "creators.handle",
  "influencer": "creators.handle",
  "creator": "creators.handle",
  "followers": "creators.followers",
  "platform": "creators.platform",
  
  // Content
  "url": "content.url",
  "post url": "content.url",
  "link": "content.url",
  "type": "content.content_type",
  "content type": "content.content_type",
  "post type": "content.content_type",
  "date": "content.published_date",
  "published": "content.published_date",
  "post date": "content.published_date",
  "reach": "content.reach",
  "impressions": "content.impressions",
  "views": "content.views",
  "likes": "content.likes",
  "comments": "content.comments",
  "shares": "content.shares",
  "saves": "content.saves",
  "er": "content.engagement_rate",
  "engagement": "content.engagement_rate",
  "watch time": "content.watch_time",
  "sentiment": "content.sentiment",
  
  // Promo Codes
  "promo code": "promo_codes.code",
  "promocode": "promo_codes.code",
  "code": "promo_codes.code",
  "coupon": "promo_codes.code",
  "clicks": "promo_codes.clicks",
  "purchases": "promo_codes.purchases",
  "revenue": "promo_codes.revenue",
  "conversion": "promo_codes.conversion_rate",
};
```

---

## Struktura souborů

```text
src/
  components/
    reports/
      import/
        ImportWizard.tsx           # Hlavní wizard komponenta (3 kroky)
        FileUploadStep.tsx         # Step 1: Upload souboru
        ColumnMappingStep.tsx      # Step 2: Mapování sloupců
        ImportReviewStep.tsx       # Step 3: Přehled a potvrzení
        ColumnMappingRow.tsx       # Jednotlivý řádek mapování
        MappingFieldSelect.tsx     # Dropdown pro výběr cílového pole
        mappingConfig.ts           # Konfigurace všech mapovatelných polí
        fileParser.ts              # Parsování XLSX/CSV souborů
      ImportDataDialog.tsx         # Upravený - používá ImportWizard
      CreateReportDialog.tsx       # Upravený - Step 2 používá ImportWizard
```

---

## Nová Edge Funkce: `import-mapped-data`

Nahradí původní `import-hypeauditor` a bude přijímat:

```typescript
interface ImportRequest {
  reportId: string;
  fileName: string;
  mappings: Array<{
    sourceColumn: string;      // Název sloupce v souboru
    targetTable: "creators" | "content" | "promo_codes";
    targetField: string;       // Název pole v tabulce
  }>;
  rows: Array<Record<string, any>>;  // Data ze souboru
}
```

### Logika zpracování:

1. **Identifikace unikátních creatorů** - projít řádky a najít unikátní kombinace handle + platform
2. **Vytvoření/aktualizace creatorů** - upsert do tabulky creators
3. **Vytvoření contentu** - pro každý řádek s content daty vytvořit záznam, propojit s creator_id
4. **Vytvoření promo codes** - pro každý řádek s promo code daty vytvořit záznam

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/components/reports/import/ImportWizard.tsx` | Vytvořit - hlavní wizard |
| `src/components/reports/import/FileUploadStep.tsx` | Vytvořit - step 1 |
| `src/components/reports/import/ColumnMappingStep.tsx` | Vytvořit - step 2 |
| `src/components/reports/import/ImportReviewStep.tsx` | Vytvořit - step 3 |
| `src/components/reports/import/ColumnMappingRow.tsx` | Vytvořit - mapping row |
| `src/components/reports/import/MappingFieldSelect.tsx` | Vytvořit - field dropdown |
| `src/components/reports/import/mappingConfig.ts` | Vytvořit - konfigurace polí |
| `src/components/reports/import/fileParser.ts` | Vytvořit - file parsing |
| `src/components/reports/ImportDataDialog.tsx` | Přepsat - použít ImportWizard |
| `src/components/reports/CreateReportDialog.tsx` | Upravit - použít ImportWizard v Step 2 |
| `supabase/functions/import-mapped-data/index.ts` | Vytvořit - nová edge funkce |
| `supabase/config.toml` | Přidat novou funkci |

---

## Implementační kroky

1. **Vytvořit konfigurační soubory**
   - `mappingConfig.ts` - definice všech polí a auto-suggestions
   - `fileParser.ts` - parsování XLSX a CSV

2. **Vytvořit UI komponenty**
   - `FileUploadStep.tsx` - drag & drop + file info
   - `ColumnMappingRow.tsx` - jeden řádek mapování
   - `MappingFieldSelect.tsx` - grouped dropdown (Creators / Content / Promo Codes)
   - `ColumnMappingStep.tsx` - tabulka s mapováním
   - `ImportReviewStep.tsx` - souhrn před importem
   - `ImportWizard.tsx` - orchestrace kroků

3. **Vytvořit Edge funkci**
   - `import-mapped-data/index.ts` - zpracování mapovaných dat

4. **Integrovat do existujících dialogů**
   - Přepsat `ImportDataDialog.tsx`
   - Upravit `CreateReportDialog.tsx`

---

## Technické detaily

### Parsování souboru (client-side)

```typescript
interface ParsedFile {
  columns: Array<{
    name: string;
    sampleValues: string[];
    suggestedMapping: string | null;
  }>;
  rows: Array<Record<string, any>>;
  totalRows: number;
}
```

### Validace před importem

- Kontrola povinných polí (handle + platform pro Creators, code pro Promo Codes)
- Kontrola formátů (platform musí být instagram/tiktok/youtube, content_type musí být post/reel/story...)
- Zobrazení varování pokud chybí důležitá data

### Propojování dat

Pro Content a Promo Codes je klíčové propojení s Creators:
1. Uživatel namapuje sloupec na `content.creator_handle` nebo `promo_codes.creator_handle`
2. Při importu systém najde odpovídajícího creatora podle handle+platform
3. Pokud creator neexistuje, vytvoří se automaticky

