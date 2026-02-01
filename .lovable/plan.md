
# Plán: Úpravy sekce Content Performance

## Přehled změn

1. Odstranění linky pod headline "Content Performance"
2. Přidání možnosti editovat topics (positive_topics a negative_topics)
3. Změna zobrazení relevance z textových hodnot na procenta
4. Oprava oříznutého preview postu
5. Změna barvy Instagram badge na fialovou

---

## 1. Odstranění linky pod headline

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

Řádek 658 - odstranit `border-b border-border pb-2`:
```tsx
// Před
<h2 className="text-xl font-bold mb-4 border-b border-border pb-2">

// Po
<h2 className="text-xl font-bold mb-4">
```

---

## 2. Editovatelné topics

**Soubor:** `src/components/reports/CreatorPerformanceCard.tsx`

### 2.1 Rozšíření interface a props
```typescript
interface CreatorPerformanceCardProps {
  creator: CreatorPerformanceData;
  canEdit?: boolean;
  onSaveKeyInsight?: (handle: string, insight: string) => void;
  onSaveTopics?: (handle: string, positiveTopics: string[], negativeTopics: string[]) => void; // NOVÉ
}
```

### 2.2 Přidání editačního stavu pro topics
```typescript
const [isEditingPositiveTopics, setIsEditingPositiveTopics] = useState(false);
const [isEditingNegativeTopics, setIsEditingNegativeTopics] = useState(false);
const [editedPositiveTopics, setEditedPositiveTopics] = useState(creator.positive_topics.join(', '));
const [editedNegativeTopics, setEditedNegativeTopics] = useState(creator.negative_topics.join(', '));
```

### 2.3 Editovatelné zobrazení topics
- Input field místo badge listu při editaci
- Topicy oddělené čárkou
- Save/Cancel tlačítka

---

## 3. Relevance jako procenta

**Soubor:** `src/components/reports/CreatorPerformanceCard.tsx`

### 3.1 Změna interface
```typescript
// Před
relevance: "high" | "medium" | "low";

// Po
relevance: number; // 0-100
```

### 3.2 Úprava zobrazení
```typescript
// Před
<span className={`font-bold ${getRelevanceColor(creator.relevance)}`}>
  {getRelevanceLabel(creator.relevance)}
</span>

// Po
<span className={`font-bold ${getRelevanceColor(creator.relevance)}`}>
  {creator.relevance}%
</span>
```

### 3.3 Úprava funkce pro barvu
```typescript
const getRelevanceColor = (relevance: number) => {
  if (relevance >= 70) return "text-accent-green";
  if (relevance >= 40) return "text-accent-orange";
  return "text-muted-foreground";
};
```

**Soubor:** `src/components/reports/AIInsightsContent.tsx`
- Aktualizovat transform logiku pro převod starých hodnot na procenta:
  - "high" → 85
  - "medium" → 55
  - "low" → 25

---

## 4. Oprava oříznutého preview

**Soubor:** `src/components/reports/CreatorPerformanceCard.tsx`

Problém: `max-w-[200px]` a `aspect-[9/16]` s `max-h-[300px]` ořezává obsah.

### 4.1 Úprava kontejneru pro top_content
```tsx
// Před
<div className="max-w-[200px]">
  <ContentPreviewCard ... />
</div>

// Po
<div className="w-[180px] flex-shrink-0">
  <ContentPreviewCard ... />
</div>
```

**Soubor:** `src/components/reports/ContentPreviewCard.tsx`

### 4.2 Úprava aspect ratio kontejneru
```tsx
// Před
<div className="relative aspect-[9/16] max-h-[300px] bg-muted">

// Po  
<div className="relative aspect-[9/16] bg-muted overflow-hidden">
```

Odstranit `max-h-[300px]` aby se obrázek zobrazil celý podle aspect ratio a šířky kontejneru.

---

## 5. Instagram badge fialově

**Soubor:** `src/components/reports/CreatorPerformanceCard.tsx`

### 5.1 Úprava platform badge
```tsx
// Před
<span
  key={platform}
  className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded-full"
>
  {platform}
</span>

// Po
<span
  key={platform}
  className={cn(
    "text-xs capitalize px-2 py-1 rounded-full",
    platform.toLowerCase() === "instagram" 
      ? "bg-accent-purple text-accent-purple-foreground" 
      : "bg-muted text-muted-foreground"
  )}
>
  {platform}
</span>
```

**Soubor:** `src/components/reports/ContentPreviewCard.tsx`

### 5.2 Úprava platform badge v preview kartě (konzistence)
```tsx
// Řádek 80-82
<span className={cn(
  "px-2 py-1 backdrop-blur-sm rounded-full text-xs font-medium capitalize",
  platform.toLowerCase() === "instagram"
    ? "bg-accent-purple text-accent-purple-foreground"
    : "bg-background/80"
)}>
  {platform}
</span>
```

---

## Souhrn souborů ke změně

| Soubor | Změny |
|--------|-------|
| `src/components/reports/CreatorPerformanceCard.tsx` | Editovatelné topics, relevance %, Instagram badge fialově, oprava layoutu |
| `src/components/reports/ContentPreviewCard.tsx` | Odstranění max-h, Instagram badge fialově |
| `src/components/reports/AIInsightsContent.tsx` | Odstranění border, handler pro save topics, transform relevance |

---

## Technické detaily

### Editace topics - flow
1. Kliknutí na Pencil icon vedle "Positive/Negative Topics:"
2. Zobrazí se Input s hodnotami oddělenými čárkou
3. Save uloží rozdělené hodnoty zpět jako pole
4. Volá se `onSaveTopics(handle, positiveTopics, negativeTopics)`

### Backward compatibility pro relevance
```typescript
// V AIInsightsContent.tsx transform
const getRelevanceAsNumber = (rel: string | number): number => {
  if (typeof rel === "number") return rel;
  switch (rel) {
    case "high": return 85;
    case "medium": return 55;
    case "low": return 25;
    default: return 50;
  }
};
```
