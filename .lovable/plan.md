
# Plán: Přidání filtru podle platformy do Overview sekce

## Přehled

V sekci Overview reportu přidáme nový filtr, který umožní filtrovat metriky nejen podle data a creatora, ale také podle platformy (Instagram, TikTok, YouTube, Facebook, Twitter).

---

## Změny

**Soubor:** `src/components/reports/OverviewTab.tsx`

### 1. Rozšíření Content interface (řádky 50-65)

Přidáme pole `platform` do interface:

```typescript
interface Content {
  id: string;
  creator_id: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter";
  reach: number | null;
  // ... ostatní pole
}
```

### 2. Rozšíření Supabase query (řádek 113)

Přidáme `platform` do select query:

```typescript
supabase.from("content").select("id, creator_id, platform, reach, impressions, views, watch_time, likes, comments, shares, saves, link_clicks, sticker_clicks, published_date, reposts").eq("report_id", reportId),
```

### 3. Přidání stavu pro platform filter (řádek 106)

```typescript
const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
```

### 4. Rozšíření filter logiky (řádky 123-130)

Přidáme filtrování podle platformy do `filteredContent`:

```typescript
const filteredContent = useMemo(() => {
  return content.filter((item) => {
    if (selectedCreator !== "all" && item.creator_id !== selectedCreator) return false;
    if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;
    if (dateRange.start && item.published_date && new Date(item.published_date) < dateRange.start) return false;
    if (dateRange.end && item.published_date && new Date(item.published_date) > dateRange.end) return false;
    return true;
  });
}, [content, selectedCreator, selectedPlatform, dateRange]);
```

### 5. Extrakce unikátních platforem z dat

```typescript
const availablePlatforms = useMemo(() => {
  const platforms = [...new Set(content.map((c) => c.platform))];
  return platforms.sort();
}, [content]);
```

### 6. Aktualizace clearFilters a hasFilters (řádky 245-250)

```typescript
const clearFilters = () => {
  setDateRange({ start: null, end: null });
  setSelectedCreator("all");
  setSelectedPlatform("all");
};

const hasFilters = dateRange.start || dateRange.end || selectedCreator !== "all" || selectedPlatform !== "all";
```

### 7. Přidání Platform Select do UI (řádky 346-355)

Za Creator filter přidáme nový Select pro platformy:

```tsx
{/* Platform Filter */}
<Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
  <SelectTrigger className={cn(
    "w-[180px] rounded-[35px]",
    selectedPlatform !== "all"
      ? "border-accent-orange bg-accent-orange text-foreground"
      : ""
  )}>
    <SelectValue placeholder="All platforms" />
  </SelectTrigger>
  <SelectContent className="rounded-[20px]">
    <SelectItem value="all">All platforms</SelectItem>
    {availablePlatforms.map((platform) => (
      <SelectItem key={platform} value={platform}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `src/components/reports/OverviewTab.tsx` | Přidání platform filtru: interface, stav, query, filter logika, UI select |

---

## Výsledné chování

1. Uživatel uvidí 4 filtry: Start date, End date, Creator, **Platform**
2. Platform dropdown zobrazí pouze platformy, které existují v datech reportu
3. Všechny KPI metriky (Awareness, Engagement, Effectiveness) se přepočítají podle zvoleného filtru
4. Aktivní filtry budou vizuálně odlišeny (oranžová barva)
5. Tlačítko "Clear filters" vymaže všechny filtry včetně platformy

### Platformy v systému
- Instagram
- TikTok
- YouTube
- Facebook
- Twitter
