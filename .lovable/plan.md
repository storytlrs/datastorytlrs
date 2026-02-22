

# Update Published Date for All Content in Proud_spotrebitelska soutez

## What will change
All 28 content records in the report "Proud_spotrebitelska soutez" will have their `published_date` updated to **2025-06-01**.

## How
Run the following SQL update via the database insert tool:

```sql
UPDATE content 
SET published_date = '2025-06-01T00:00:00+00' 
WHERE report_id = '1f771a45-d62c-459c-962f-681283dbc9d8';
```

## Details
- Report: Proud_spotrebitelska soutez
- Report ID: 1f771a45-d62c-459c-962f-681283dbc9d8
- Records affected: 28
- Current dates: mostly `1970-01-01` (invalid), a few already at `2025-06-01` or `2026-06-01`
- New date for all: `2025-06-01`

No code or schema changes needed -- this is a data-only update.

