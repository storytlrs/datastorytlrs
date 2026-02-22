

# Editable Content Summary + Height Limit

## Changes

### 1. Editable Content Summary (`CreatorPerformanceCard.tsx`)
Add edit functionality for the content summary in the middle column, following the same pattern as Key Insight editing (pencil icon, textarea, save/cancel buttons).

- New prop: `onSaveContentSummary?: (handle: string, summary: string) => void`
- New state: `isEditingContentSummary`, `editedContentSummary`
- Display text limited in height via `max-h` + `overflow-y-auto` to match the content preview card height

### 2. Height Limit for Content Summary Display
The middle column (content summary + sentiment) will have a `max-h` matching the content preview card height, with `overflow-y-auto` for scrolling if the text is too long.

### 3. Wire Up Save in Parent (`AIInsightsContent.tsx`)
Pass `onSaveContentSummary` prop that updates `creator.top_content.content_summary` in the insights data, same pattern as `onSaveKeyInsight` and `onSaveTopics`.

## Files to Modify

### `src/components/reports/CreatorPerformanceCard.tsx`
- Add `onSaveContentSummary` prop to interface
- Add editing state for content summary (`isEditingContentSummary`, `editedContentSummary`)
- Add save/cancel handlers for content summary
- Replace static `<p>` with editable section (pencil button, textarea, save/cancel)
- Add `max-h` class to the middle column's display text, matching approximately the height of the content preview card (roughly `max-h-[400px]` with `overflow-y-auto`)

### `src/components/reports/AIInsightsContent.tsx`
- Pass `onSaveContentSummary` callback to `CreatorPerformanceCard` that updates `creator.top_content.content_summary` in the insights JSON

### `src/components/reports/AIInsightsContentPDF.tsx`
- If the PDF version also renders the content summary, apply the same height limit for consistency

## Technical Details

Content Summary editing pattern (same as Key Insight):
```tsx
// State
const [isEditingContentSummary, setIsEditingContentSummary] = useState(false);
const [editedContentSummary, setEditedContentSummary] = useState(
  creator.top_content?.content_summary || ''
);

// In the middle column, replace static text with:
{isEditingContentSummary ? (
  <Textarea ... />  // with Save/Cancel buttons
) : (
  <p className="text-sm leading-relaxed max-h-[300px] overflow-y-auto">
    {creator.top_content.content_summary}
  </p>
)}
```

Save callback in parent:
```tsx
onSaveContentSummary={(handle, summary) => {
  const updatedPerformance = (insights.creator_performance || []).map((c) =>
    c.handle === handle
      ? { ...c, top_content: { ...c.top_content, content_summary: summary } }
      : c
  );
  onSaveInsights({ creator_performance: updatedPerformance });
}}
```

