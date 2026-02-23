
# Add Change Password to Admin Panel

## Overview
Add a "Change Password" button to the Admin Panel header that opens a dialog where the admin can change their own password using the built-in authentication API.

## Changes

### 1. New file: `src/components/admin/ChangePasswordDialog.tsx`
A dialog component with:
- Current password field (not strictly required by the API, but good UX practice)
- New password field
- Confirm new password field
- Client-side validation (min 6 chars, passwords match)
- Calls `supabase.auth.updateUser({ password: newPassword })` on submit
- Success/error toast notifications
- Follows existing design patterns (rounded-[35px] buttons, border-foreground inputs)

### 2. Update: `src/pages/Admin.tsx`
- Import `ChangePasswordDialog` and add a state toggle
- Add a "Change Password" button (with Lock icon) in the header next to the "Admin Panel" title
- Wire the button to open the dialog

## Technical Notes
- `supabase.auth.updateUser()` updates the currently authenticated user's password -- no need for a separate edge function
- No database migrations needed
- No new secrets required
