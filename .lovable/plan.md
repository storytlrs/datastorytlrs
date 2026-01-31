
# Plan: Rename "Spaces" to "Brands" Across the Platform

## Overview

This change renames all UI references from "Spaces" to "Brands" throughout the platform. The database table names (`spaces`, `space_users`) will remain unchanged to avoid migration complexity - only user-facing text and URLs will change.

## Scope of Changes

### 1. Route Changes (App.tsx)

Update URL paths from `/spaces` to `/brands`:
- `/spaces` → `/brands`
- `/spaces/:spaceId` → `/brands/:brandId`

### 2. Navigation (MainNavigation.tsx)

- Change nav link text from "Spaces" to "Brands"
- Update route path from `/spaces` to `/brands`
- Update `isSpacesActive` variable name to `isBrandsActive`

### 3. Main Listing Page (Spaces.tsx → Brands.tsx)

Rename file and update all text:
- Page title: "Spaces" → "Brands"
- Subtitle: "Your client spaces" → "Your client brands"
- Search placeholder: "Search spaces..." → "Search brands..."
- Button: "New Space" → "New Brand"
- Empty states: "No spaces found" → "No brands found"
- Loading text: "Loading spaces..." → "Loading brands..."
- Error messages: "Failed to load spaces" → "Failed to load brands"

### 4. Brand Detail Page (SpaceDetail.tsx → BrandDetail.tsx)

Rename file and update:
- Variable names for clarity (optional)
- AI Insights description text

### 5. Create Dialog (CreateSpaceDialog.tsx → CreateBrandDialog.tsx)

Rename file and update:
- Dialog title: "Create New Space" → "Create New Brand"
- Input label: "Space Name" → "Brand Name"
- Placeholder: "Client or project name" → "Brand or client name"
- Description label stays as is
- Success message: "Space created successfully" → "Brand created successfully"
- Error message: "Failed to create space" → "Failed to create brand"

### 6. Edit Dialog (EditSpaceDialog.tsx → EditBrandDialog.tsx)

Rename file and update:
- Dialog title: "Edit Space" → "Edit Brand"
- Success message: "Space updated successfully" → "Brand updated successfully"
- Error message: "Failed to update space" → "Failed to update brand"

### 7. Card Component (SpaceCard.tsx → BrandCard.tsx)

Rename file and update:
- Delete dialog title: "Smazat space..." → "Smazat brand..."
- Delete dialog description update
- Toast messages update

### 8. Overview Tab (SpaceOverviewTab.tsx → BrandOverviewTab.tsx)

Rename file (no text changes needed as it uses metrics terminology)

### 9. Admin Panel Components

**UserList.tsx:**
- Button label: "Assign to Space" → "Assign to Brand"
- Empty state: "No spaces assigned" → "No brands assigned"
- Remove dialog text updates

**AssignUserToSpace.tsx → AssignUserToBrand.tsx:**
- Dialog title: "Assign User to Space" → "Assign User to Brand"
- Description: "Select a space to grant..." → "Select a brand to grant..."
- Label: "Space" → "Brand"
- Placeholder: "Select a space" → "Select a brand"
- Empty state: "all spaces" → "all brands"
- Success/error messages

### 10. Reports Page (Reports.tsx)

- Subtitle: "All your reports across spaces" → "All your reports across brands"

### 11. Auth Page (Auth.tsx)

- Post-login redirect: `/spaces` → `/brands`

### 12. Admin Page (Admin.tsx)

- Access denied redirect: `/spaces` → `/brands`

### 13. Report Detail (ReportDetail.tsx)

- Error redirect: `/spaces` → `/brands`
- Breadcrumb navigation: `/spaces/${report.space_id}` → `/brands/${report.space_id}`

## Files to Rename

| Current Name | New Name |
|--------------|----------|
| `src/pages/Spaces.tsx` | `src/pages/Brands.tsx` |
| `src/pages/SpaceDetail.tsx` | `src/pages/BrandDetail.tsx` |
| `src/components/spaces/` | `src/components/brands/` |
| `CreateSpaceDialog.tsx` | `CreateBrandDialog.tsx` |
| `EditSpaceDialog.tsx` | `EditBrandDialog.tsx` |
| `SpaceCard.tsx` | `BrandCard.tsx` |
| `SpaceOverviewTab.tsx` | `BrandOverviewTab.tsx` |
| `src/components/admin/AssignUserToSpace.tsx` | `src/components/admin/AssignUserToBrand.tsx` |

## Files to Update (Content Only)

| File | Changes |
|------|---------|
| `src/App.tsx` | Routes and imports |
| `src/components/MainNavigation.tsx` | Nav link text and path |
| `src/pages/Auth.tsx` | Redirect path |
| `src/pages/Admin.tsx` | Redirect path |
| `src/pages/Reports.tsx` | Subtitle text |
| `src/pages/ReportDetail.tsx` | Redirect paths |
| `src/components/admin/UserList.tsx` | Button labels, text |
| `src/components/reports/CreateReportDialog.tsx` | Import path |

## Technical Details

### Database
- No database changes required
- Table `spaces` and `space_users` remain unchanged
- All queries continue to reference these tables

### Routes
```typescript
// Before
<Route path="/spaces" element={<MainLayout><Spaces /></MainLayout>} />
<Route path="/spaces/:spaceId" element={<MainLayout><SpaceDetail /></MainLayout>} />

// After
<Route path="/brands" element={<MainLayout><Brands /></MainLayout>} />
<Route path="/brands/:brandId" element={<MainLayout><BrandDetail /></MainLayout>} />
```

### Navigation
```typescript
// Before
<NavLink to="/spaces">Spaces</NavLink>

// After
<NavLink to="/brands">Brands</NavLink>
```

## Important Notes

1. **Variable names in code** can optionally be updated (e.g., `spaceId` → `brandId`) for consistency, but this is cosmetic
2. **Database table names** remain unchanged to avoid migration complexity
3. **All text is user-facing** - internal code comments and variable names can be updated for clarity but are not strictly required
4. **Czech text** in some components (SpaceCard delete dialog) will also be updated

## Verification

After implementation:
- Verify navigation works correctly
- Verify all redirects point to `/brands`
- Verify create/edit dialogs show "Brand" terminology
- Verify admin panel shows "Brand" terminology
- Verify all toast messages use "Brand"
