

# Fix Vertical Gaps in AI Insights Tile Grid

## Problem
CSS Grid aligns items in rows, so when tiles have different heights, the row height matches the tallest tile, leaving vertical gaps below shorter tiles. `items-start` prevents stretching but the empty space remains in the row.

## Solution
Replace CSS Grid with CSS `columns` layout for a true masonry effect. This flows items top-to-bottom, left-to-right, eliminating vertical gaps entirely.

## Changes

### `src/components/brands/BrandAIInsights.tsx`
- Replace the `grid` container with a `columns-1 md:columns-2 lg:columns-3 gap-4` container
- Each tile wrapper gets `break-inside-avoid mb-4` instead of grid column span classes

### `src/components/brands/InsightTile.tsx`
- Update `getTileSizeClass`: for "large" tiles, return `md:col-span-2` is no longer relevant in columns layout. Large tiles will simply span the full column width (they already do). Remove the helper or keep it as a no-op since columns layout doesn't support spanning multiple columns.

**Trade-off**: CSS columns layout doesn't support multi-column spanning (large tiles spanning 2 columns). Large tiles will render at single-column width but with more content. This is acceptable because it eliminates vertical gaps entirely and keeps the layout tight.

### Technical detail
```
// Before (grid with gaps)
<div className="grid grid-cols-3 gap-4 items-start">

// After (columns, no vertical gaps)
<div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
```

Each tile wrapper becomes just `<div className="break-inside-avoid">`.

## Files to modify
1. `src/components/brands/BrandAIInsights.tsx` -- switch to columns layout
2. `src/components/brands/InsightTile.tsx` -- simplify `getTileSizeClass`

