

# AI Insights on Brand/Space Level

## Overview
Replace the current placeholder "Insights" tab with a fully functional "AI Insights" section that provides a high-level overview of the most important findings across all reports within the brand (space). The section consists of up to 9 modular tiles, each containing a metric, chart, content preview, or text insight.

## Data Model

New table: `space_ai_insights`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| space_id | uuid (FK -> spaces) | Brand this belongs to |
| tiles | jsonb | Array of up to 9 tile objects |
| generated_at | timestamptz | When the insights were last generated |
| generated_by | text | Trigger source: "report_publish", "weekly_cron", "manual" |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Each tile in the `tiles` JSON array:

```text
{
  "type": "metric" | "chart" | "content_preview" | "text",
  "title": "Top performing creator",
  "value": "12.4%",           // for metric tiles
  "subtitle": "Engagement Rate",
  "accent_color": "green",
  "chart_data": [...],        // for chart tiles
  "chart_type": "bar" | "line" | "pie",
  "content": { ... },         // for content_preview tiles
  "text": "...",              // for text tiles
  "source_report_id": "uuid", // optional link to source report
  "priority": 1               // ordering (1-9)
}
```

## Generation Triggers

1. **Report publication**: When a report status changes to "active", an Edge Function is triggered to regenerate the space's AI Insights.
2. **Weekly cron**: A scheduled job runs once a week to refresh insights for all active spaces.
3. **Manual**: Admin/analyst can click "Regenerate" button in the UI.

## Architecture

```text
Trigger (report publish / cron / manual)
  |
  v
Edge Function: generate-space-ai-insights
  |
  +-- Fetch all reports for the space
  +-- Aggregate key metrics across reports
  +-- Fetch top content, creators, ads data
  +-- Call Lovable AI (gemini-3-flash-preview) with aggregated data
  +-- AI returns structured tile definitions (via tool calling)
  +-- Upsert into space_ai_insights table
```

## UI Design

The tab is renamed from "Insights" to "AI Insights". Content is a responsive grid of tiles (3 columns on desktop, 2 on tablet, 1 on mobile).

Tile types:
- **Metric**: Large number with title, optional subtitle/comparison (reuses MetricTile-style design)
- **Chart**: Small recharts visualization (bar, line, or pie)
- **Content Preview**: Thumbnail + metrics for a standout piece of content
- **Text**: AI-generated insight paragraph or recommendation

When no insights exist yet, a placeholder with a "Generate AI Insights" button is shown (for admin/analyst).

## Technical Details

### Database migration
- Create `space_ai_insights` table with RLS policies (SELECT for space members, ALL for admins)

### New Edge Function: `generate-space-ai-insights`
- Accepts `{ space_id, trigger: "manual" | "report_publish" | "weekly_cron" }`
- Aggregates data from: `reports`, `content`, `creators`, `brand_campaigns`, `brand_ads`, `tiktok_campaigns`, `tiktok_ads`, `promo_codes`
- Uses Lovable AI with tool calling to get structured tile output
- Upserts result into `space_ai_insights`

### Database trigger for auto-generation
- A trigger on `reports` table fires when `status` changes to `'active'`
- Uses `pg_net` to call the edge function asynchronously (follows existing pattern from `trigger_instagram_analysis`)

### Weekly cron
- `pg_cron` job calling the edge function for all spaces that have at least one active report

### New UI components

**File: `src/components/brands/BrandAIInsights.tsx`**
- Main component for the AI Insights tab
- Fetches data from `space_ai_insights`
- Renders tile grid
- Shows "Regenerate" button for admin/analyst
- Shows loading/empty states

**File: `src/components/brands/InsightTile.tsx`**
- Renders a single tile based on its type
- Metric tile: large value + title + accent color
- Chart tile: small recharts chart
- Content preview tile: thumbnail + key metrics
- Text tile: markdown-rendered text block

### Modified files

**`src/pages/BrandDetail.tsx`**
- Rename tab from "Insights" to "AI Insights"
- Replace placeholder Card with `<BrandAIInsights spaceId={brandId} />`

### RLS Policies
- `space_ai_insights`: SELECT for space members (via `space_users` join), ALL for admins

