

# Restructure Creator Performance Cards in Influencer Report Insights

## What Changes

The content performance boxes in the AI Insights section of influencer reports will be reorganized from a 2-column layout to a 3-column layout.

## Current Layout
```text
+-----------------------------------------------------------+
| Content Performance: @handle                    [headline] |
+-----------------------------------------------------------+
| [avatar] @handle        [platform badges]      [header]   |
+-----------------------------------------------------------+
| Content Preview Card  |  Key Insight                      |
| (with summary inside) |  Positive Topics                  |
| Sentiment Breakdown   |  Negative Topics                  |
| Relevance             |                                   |
+-----------------------------------------------------------+
```

## New Layout
```text
+-----------------------------------------------------------+
| @handle              [platform badges]         [header]   |
+-----------------------------------------------------------+
| Content Preview  | Content Summary     | Key Insight      |
| (thumbnail only, | Sentiment Breakdown | Positive Topics  |
|  no summary)     |                     | Negative Topics  |
|                  |                     | Relevance        |
+-----------------------------------------------------------+
```

### Summary of changes:
1. **Remove** the "Content Performance: @handle" headline from the wrapper in `AIInsightsContent.tsx`
2. **Change grid** from 2 columns to 3 columns in `CreatorPerformanceCard.tsx`
3. **Left column**: Handle (with avatar) at top, content preview below (without the content summary text -- that moves to middle)
4. **Middle column**: Content summary text + Sentiment breakdown (moved from left column)
5. **Right column**: Key Insight + Topics + Relevance (stays as-is, with relevance moved here from left)

## Files to Modify

### 1. `src/components/reports/AIInsightsContent.tsx`
- Remove the `<h2>Content Performance: @{creator.handle}</h2>` headline (line 796-798)

### 2. `src/components/reports/AIInsightsContentPDF.tsx`
- Same headline removal for PDF export consistency

### 3. `src/components/reports/CreatorPerformanceCard.tsx`
Major layout restructure:
- Keep the header row (handle + platform badges) at the top
- Change `grid md:grid-cols-2` to `grid md:grid-cols-3`
- **Left column**: Content preview card only (pass `contentSummary={null}` or remove the summary from the preview -- summary moves to middle)
- **Middle column**: New section with content summary text + sentiment breakdown
- **Right column**: Key Insight, Positive Topics, Negative Topics, Relevance (relevance moves here from the old left column)

### 4. `src/components/reports/ContentPreviewCard.tsx`
- No structural changes needed -- the `contentSummary` prop simply won't be passed from `CreatorPerformanceCard`, so it won't render there

## Technical Details

The `CreatorPerformanceCard` content section changes from:

```tsx
// Before: 2-column grid
<div className="grid md:grid-cols-2 gap-6">
  {/* Left: Content Preview + Sentiment + Relevance */}
  {/* Right: Key Insight + Topics */}
</div>

// After: 3-column grid
<div className="grid md:grid-cols-3 gap-6">
  {/* Left: Content Preview only (no summary) */}
  {/* Middle: Content Summary + Sentiment Breakdown */}
  {/* Right: Key Insight + Topics + Relevance */}
</div>
```

The content summary that was previously rendered inside the `ContentPreviewCard` will be extracted and displayed as a standalone text block in the middle column. The `CreatorPerformanceCard` already has access to `creator.top_content.content_summary` so no data changes are needed.
