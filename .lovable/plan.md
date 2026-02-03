
# Restrukturalizace Ads databázových tabulek

## Přehled změn

Provedeme restrukturalizaci databáze pro ads kampně podle hierarchie:
- **campaign_meta** (přejmenováno z campaign_planning) - metadata kampaně
- **ad_sets** (přejmenováno z ad_creatives) - ad sety s agregovanými daty
- **ads** (nová tabulka) - jednotlivé reklamy s detailními metrikami

## Databázové změny

### 1. Přejmenování tabulky `campaign_planning` na `campaign_meta`
Tabulka zůstane beze změn struktury, pouze přejmenujeme:
- Název tabulky: `campaign_planning` -> `campaign_meta`
- Aktualizace RLS politik
- Aktualizace foreign key constraints

### 2. Přejmenování tabulky `ad_creatives` na `ad_sets`
Tabulka zůstane beze změn struktury (bude obsahovat agregovaná data pro ad set):
- Název tabulky: `ad_creatives` -> `ad_sets`
- Aktualizace RLS politik
- Aktualizace foreign key constraints

### 3. Vytvoření nové tabulky `ads`
Nová tabulka pro jednotlivé reklamy s detailními metrikami:

| Sloupec | Typ | Nullable | Popis |
|---------|-----|----------|-------|
| id | uuid | Ne | Primary key |
| ad_set_id | uuid | Ne | Foreign key na ad_sets |
| report_id | uuid | Ne | Foreign key na reports |
| ad_id | text | Ano | Externí ID reklamy |
| ad_name | text | Ne | Název reklamy |
| date_start | date | Ano | Začátek období |
| date_stop | date | Ano | Konec období |
| age | text | Ano | Věková skupina |
| gender | text | Ano | Pohlaví (male/female/all) |
| platform | platform_type | Ne | Platforma |
| amount_spent | numeric | Ano | Utracená částka |
| reach | integer | Ano | Dosah |
| impressions | integer | Ano | Zobrazení |
| frequency | numeric | Ano | Frekvence |
| cpm | numeric | Ano | CPM |
| thruplays | integer | Ano | Počet ThruPlays |
| thruplay_rate | numeric | Ano | ThruPlay rate |
| cost_per_thruplay | numeric | Ano | Cena za ThruPlay |
| video_3s_plays | integer | Ano | 3s video plays |
| view_rate_3s | numeric | Ano | View rate (3s) |
| cost_per_3s_play | numeric | Ano | Cena za 3s play |
| video_avg_play_time | numeric | Ano | Průměrná doba sledování |
| engagement_rate | numeric | Ano | ER |
| cpe | numeric | Ano | Cost per engagement |
| post_reactions | integer | Ano | Reakce na post |
| post_comments | integer | Ano | Komentáře |
| post_shares | integer | Ano | Sdílení |
| post_saves | integer | Ano | Uložení |
| instagram_profile_visits | integer | Ano | Návštěvy profilu |
| instagram_follows | integer | Ano | Nové sledování |
| link_clicks | integer | Ano | Kliknutí na odkaz |
| ctr | numeric | Ano | CTR |
| cpc | numeric | Ano | CPC |
| created_at | timestamp | Ne | Vytvořeno |
| updated_at | timestamp | Ne | Aktualizováno |

RLS politiky pro `ads` budou kopírovat vzor z `ad_creatives`:
- Admins a analysts mohou spravovat (ALL)
- Users mohou zobrazit ads ve svých spaces (SELECT)

## Změny v kódu

### Soubory k úpravě (13 souborů):

**Databázové dotazy:**
1. `src/components/reports/AdsDataTab.tsx`
   - Změna `campaign_planning` -> `campaign_meta`
   - Změna `ad_creatives` -> `ad_sets`
   - Přidání nové záložky pro tabulku `ads`

2. `src/components/reports/AlwaysOnDataTab.tsx`
   - Změna `campaign_planning` -> `campaign_meta`

3. `src/components/reports/AdCreativesTab.tsx`
   - Změna `ad_creatives` -> `ad_sets`

4. `src/components/brands/BrandAdsDashboard.tsx`
   - Změna `ad_creatives` -> `ad_sets`

**Dialogy:**
5. `src/components/reports/CreateAdCreativeDialog.tsx`
   - Přejmenovat na `CreateAdSetDialog.tsx`
   - Změna tabulky na `ad_sets`

6. `src/components/reports/EditAdCreativeDialog.tsx`
   - Přejmenovat na `EditAdSetDialog.tsx`
   - Změna tabulky na `ad_sets`

7. `src/components/reports/CreatePlanningItemDialog.tsx`
   - Změna tabulky na `campaign_meta`

8. `src/components/reports/EditPlanningItemDialog.tsx`
   - Změna tabulky na `campaign_meta`

**Nové soubory:**
9. `src/components/reports/CreateAdDialog.tsx` - dialog pro vytvoření nové ads
10. `src/components/reports/EditAdDialog.tsx` - dialog pro úpravu ads

**Typy (automaticky regenerované):**
11. `src/integrations/supabase/types.ts` - bude automaticky regenerováno po migraci

## Technické detaily

### SQL migrace:
```text
-- 1. Přejmenování campaign_planning na campaign_meta
ALTER TABLE campaign_planning RENAME TO campaign_meta;

-- 2. Přejmenování ad_creatives na ad_sets  
ALTER TABLE ad_creatives RENAME TO ad_sets;

-- 3. Vytvoření nové tabulky ads
CREATE TABLE ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id uuid NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  ad_id text,
  ad_name text NOT NULL,
  date_start date,
  date_stop date,
  age text,
  gender text,
  platform platform_type NOT NULL,
  amount_spent numeric DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  frequency numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  thruplays integer DEFAULT 0,
  thruplay_rate numeric DEFAULT 0,
  cost_per_thruplay numeric DEFAULT 0,
  video_3s_plays integer DEFAULT 0,
  view_rate_3s numeric DEFAULT 0,
  cost_per_3s_play numeric DEFAULT 0,
  video_avg_play_time numeric DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  cpe numeric DEFAULT 0,
  post_reactions integer DEFAULT 0,
  post_comments integer DEFAULT 0,
  post_shares integer DEFAULT 0,
  post_saves integer DEFAULT 0,
  instagram_profile_visits integer DEFAULT 0,
  instagram_follows integer DEFAULT 0,
  link_clicks integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and analysts can manage ads"
  ON ads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Users can view ads in their spaces"
  ON ads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reports r
    JOIN space_users su ON r.space_id = su.space_id
    WHERE r.id = ads.report_id AND su.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'));
```

### Hierarchie dat:
```text
Report
  └── campaign_meta (plánování kampaně)
  └── ad_sets (ad sety - agregovaná data)
        └── ads (jednotlivé reklamy - detailní metriky)
```

## Dopad na existující data

- Existující data v `campaign_planning` budou zachována v přejmenované tabulce `campaign_meta`
- Existující data v `ad_creatives` budou zachována v přejmenované tabulce `ad_sets`
- Nová tabulka `ads` bude prázdná a připravená na import dat
