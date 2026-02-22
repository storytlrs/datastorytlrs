

# Color-coded Mapping Dropdown and Field Cleanup (Updated)

## Overview
Color-code the mapping dropdown by table group and remove only 3 Content-level fields. Creator fields remain unchanged.

## Changes

### 1. Remove Content fields from `mappingConfig.ts`

Remove only these 3 fields from `MAPPING_FIELDS`:
- `engagement_rate` (content) -- calculated metric
- `sentiment` (content) -- auto-generated
- `sentiment_summary` (content) -- auto-generated

All Creator fields stay, including `avg_reach`, `avg_views`, `avg_engagement_rate`.
Content fields `watch_time` and `avg_watch_time` also stay.

Remove related `AUTO_SUGGESTIONS` entries:
- `"er"`, `"engagement"`, `"engagement rate"`, `"míra zapojení"` (content.engagement_rate)
- `"sentiment"` (content.sentiment)
- `"sentiment summary"` (content.sentiment_summary)

### 2. Color-code table groups in `MappingFieldSelect.tsx`

Add a colored dot (w-2 h-2 rounded-full) before each group label and each field item:
- **Creators** -- orange (`bg-orange-500`)
- **Content** -- blue (`bg-blue-500`)
- **Promo Codes** -- green (`bg-green-500`)
- **Media Plan** -- purple (`bg-purple-500`)

Add a `TABLE_COLORS` map and render the dot in both `SelectLabel` and `SelectItem`.

### Files to modify
- `src/components/reports/import/mappingConfig.ts` -- remove 3 content fields + related auto-suggestions
- `src/components/reports/import/MappingFieldSelect.tsx` -- add color dots

