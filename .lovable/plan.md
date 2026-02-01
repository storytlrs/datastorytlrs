
# Plán: Editovatelné Top Topics v sekci Sentiment kampaně

## Přehled

Přidáme možnost editovat "Top Topics" v sekci Sentiment kampaně. Použijeme stejný pattern jako u editace topics v Content Performance kartách.

---

## Změny

**Soubor:** `src/components/reports/AIInsightsContent.tsx`

### 1. Přidání editačního stavu pro sentiment topics

```typescript
// Přidat do komponenty
const [isEditingSentimentTopics, setIsEditingSentimentTopics] = useState(false);
const [editedSentimentTopics, setEditedSentimentTopics] = useState(
  insights.top_sentiment_topics?.join(', ') || ''
);
```

### 2. Handler pro uložení topics

```typescript
const handleSaveSentimentTopics = async () => {
  const topics = editedSentimentTopics
    .split(',')
    .map(t => t.trim())
    .filter(t => t);
  
  // Uložení do ai_insights_structured
  const updatedInsights = {
    ...insights,
    top_sentiment_topics: topics,
  };
  
  try {
    await supabase
      .from("reports")
      .update({ ai_insights_structured: updatedInsights })
      .eq("id", reportId);
    
    onUpdate?.(updatedInsights);
    setIsEditingSentimentTopics(false);
    toast.success("Topics updated successfully");
  } catch (error) {
    toast.error("Failed to update topics");
  }
};
```

### 3. Úprava UI pro Top Topics sekci

```tsx
{/* Před - pouze zobrazení */}
<div>
  <span className="text-sm font-medium text-muted-foreground block mb-2">
    Top Topics:
  </span>
  <div className="flex flex-wrap gap-2">
    {insights.top_sentiment_topics.map((topic, i) => (
      <TopicBadge key={i} topic={topic} variant="default" />
    ))}
  </div>
</div>

{/* Po - editovatelné */}
<div>
  <div className="flex items-center gap-2 mb-2">
    <span className="text-sm font-medium text-muted-foreground">
      Top Topics:
    </span>
    {canEdit && !isEditingSentimentTopics && (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsEditingSentimentTopics(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    )}
  </div>
  
  {isEditingSentimentTopics ? (
    <div className="space-y-2">
      <Input
        value={editedSentimentTopics}
        onChange={(e) => setEditedSentimentTopics(e.target.value)}
        placeholder="Enter topics separated by commas..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSaveSentimentTopics}>
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditedSentimentTopics(insights.top_sentiment_topics?.join(', ') || '');
            setIsEditingSentimentTopics(false);
          }}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      {insights.top_sentiment_topics?.map((topic, i) => (
        <TopicBadge key={i} topic={topic} variant="default" />
      ))}
    </div>
  )}
</div>
```

---

## Souhrn

| Soubor | Změny |
|--------|-------|
| `src/components/reports/AIInsightsContent.tsx` | Přidání stavu, handleru a UI pro editaci sentiment topics |

---

## Technické detaily

### Flow editace
1. Uživatel klikne na ikonu tužky vedle "Top Topics:"
2. Zobrazí se Input s hodnotami oddělenými čárkou
3. Po kliknutí na Save se topics rozdělí a uloží jako pole do `ai_insights_structured.top_sentiment_topics`
4. Cancel vrátí původní hodnoty

### Konzistence s existujícím kódem
- Použití stejných komponent (Input, Button, Pencil/Save/X ikony)
- Stejný pattern pro save (update do Supabase + refresh přes onUpdate)
- Stejné UX jako u topics v CreatorPerformanceCard
