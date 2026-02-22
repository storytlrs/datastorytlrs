

# Fix Chart Rendering and Grid Layout in AI Insights

## Problems

1. **Charts are empty**: `ResponsiveContainer` with `height="100%"` requires a parent with a computed pixel height. The current `flex-1` parent has no explicit height, so Recharts renders at 0px.

2. **Uneven grid gaps**: The fixed `grid-cols-3` layout with `col-span-2` for large tiles creates orphan cells and visual gaps between rows of mixed-size tiles.

## Solution

### 1. Fix chart rendering (`InsightTile.tsx`)

Replace the `flex-1` chart wrapper with an explicit height container. Use a fixed height (e.g., `h-[180px]`) for the chart area instead of relying on flex growth. This guarantees `ResponsiveContainer` gets a measurable parent.

### 2. Switch to masonry-style auto-flow layout (`BrandAIInsights.tsx`)

Replace the rigid 3-column grid with `grid-auto-rows` approach:
- Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `auto-rows-auto` (default)
- Remove the wrapper `<div>` around each tile so grid item sizing works directly
- Each tile card will size itself based on content (no fixed row heights forcing gaps)

### 3. Tile size adjustments (`InsightTile.tsx`)

Update `getTileSizeClass` to return proper classes:
- `small`: default (1 col)
- `medium`: default (1 col)  
- `large`: `md:col-span-2` (spans 2 cols on medium+)

Remove `min-h` from metric and content_preview cards so they fit their content naturally without forcing uniform row heights.

## Files to modify

1. **`src/components/brands/InsightTile.tsx`**
   - Chart container: replace `flex-1` with `h-[180px]` explicit height
   - Remove `min-h-[200px]` from chart card (content height is now explicit)
   - Remove `min-h-[120px]` from metric and content_preview cards
   - Adjust `getTileSizeClass`: large = `md:col-span-2`

2. **`src/components/brands/BrandAIInsights.tsx`**
   - Move `getTileSizeClass` className directly onto the wrapper div
   - Add `items-start` to the grid to prevent stretch alignment (tiles only take the height they need)

