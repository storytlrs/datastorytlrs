

# Delete Report Feature

## Overview
Add a delete button to the Edit Report Settings dialog with a confirmation step. Deletion behavior differs by report type.

## Deletion Rules

### All report types (ads, always_on, influencer)
Only the report's own metadata and links are removed:
- `report_campaigns` (Meta campaign links)
- `report_tiktok_campaigns` (TikTok campaign links)
- `kpi_targets` (KPI goals)
- `audit_log` (activity history)
- `data_imports` (import records)
- `media_plan_items` (media plan)
- `reports` (the report row itself)

The underlying Meta/TikTok ad data (`brand_campaigns`, `brand_ad_sets`, `brand_ads`, `tiktok_campaigns`, etc.) is **never** deleted -- those are shared brand-level data.

### Additionally for Influencer reports only
Because influencer data is created through the report, it is also deleted:
- `content_tags` (tags on content)
- `content` (posts/stories)
- `creators` (influencer profiles)
- `promo_codes` (promo code tracking)

## User Flow
1. Admin opens report settings (gear icon)
2. At the bottom of the dialog, a red "Delete Report" button is visible (separated by a divider)
3. Clicking it shows a confirmation warning with "Confirm Delete" button
4. On confirmation: data is deleted, modal closes, user is redirected to brand detail page

## Warning Messages
- **Influencer report**: "This will permanently delete the report and all its data (creators, content, promo codes). This action cannot be undone."
- **Ads / Always-on report**: "This will permanently delete the report. Imported ad data will not be affected. This action cannot be undone."

## Technical Details

### Files to modify

**1. `src/components/reports/EditReportDialog.tsx`**
- Add `onDelete` callback prop
- Add `showDeleteConfirm` boolean state
- Add a `Separator` and red "Delete Report" button at the bottom of the form
- On click, toggle confirmation UI with warning text and "Confirm Delete" button
- On confirm, execute sequential deletes respecting foreign key order:
  1. For influencer: `content_tags` -> `content` -> `creators` -> `promo_codes`
  2. For all: `report_campaigns` -> `report_tiktok_campaigns` -> `kpi_targets` -> `audit_log` -> `data_imports` -> `media_plan_items` -> `reports`
- Call `onDelete()` on success
- Only visible when `isAdmin` is true

**2. `src/pages/ReportDetail.tsx`**
- Pass `onDelete` prop to `EditReportDialog`
- The callback navigates to `navigate(/brands/${report.space_id}?tab=reports)` and shows a success toast

### Database changes
- Add a DELETE RLS policy on `data_imports` for admins (currently missing -- admins can't delete from this table)
- Add a DELETE RLS policy on `audit_log` for admins (currently missing)

### Access control
- Only admins can see and use the delete button (consistent with existing "Admins can delete reports" RLS policy)

