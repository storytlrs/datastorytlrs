

## Plan: Password Reset on Login + Admin Password Management

### 1. Login screen -- "Forgot password?" link

Add a "Forgot password?" button/link below the password field on `src/pages/Auth.tsx`. When clicked, show an inline state (or toggle) where the user enters their email and calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`. Show a toast confirming the email was sent.

### 2. New `/reset-password` page

Create `src/pages/ResetPassword.tsx`:
- Detects `type=recovery` in URL hash (Supabase redirect)
- Shows a form with new password + confirm password
- Calls `supabase.auth.updateUser({ password })` to set the new password
- Redirects to `/dashboard` on success
- Must be a public route (not behind ProtectedRoute)

Add the route in `src/App.tsx`: `<Route path="/reset-password" element={<ResetPassword />} />`

### 3. Admin panel -- per-user password actions

Create `src/components/admin/ResetPasswordDialog.tsx` with two tabs/options:
- **Set password manually**: Admin enters a new password, calls the `admin-reset-password` edge function which uses `supabaseAdmin.auth.admin.updateUser(userId, { password })`
- **Send reset email**: Admin clicks a button, calls the same edge function which uses `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })` or `resetPasswordForEmail` via service role

### 4. New edge function `admin-reset-password`

Create `supabase/functions/admin-reset-password/index.ts`:
- Validates the caller is an admin (same pattern as `create-user`)
- Accepts `{ userId, action: 'set_password' | 'send_reset', password? }`
- For `set_password`: calls `supabaseAdmin.auth.admin.updateUser(userId, { password })`
- For `send_reset`: fetches the user's email from profiles, then calls `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })`
- Returns success/error

### 5. Wire into UserList

Add a "Reset Password" button (Key icon) to each user row in `src/components/admin/UserList.tsx`, which opens the `ResetPasswordDialog` with the selected user's ID and email.

### Files to create
- `src/pages/ResetPassword.tsx`
- `src/components/admin/ResetPasswordDialog.tsx`
- `supabase/functions/admin-reset-password/index.ts`

### Files to modify
- `src/pages/Auth.tsx` -- add forgot password flow
- `src/App.tsx` -- add `/reset-password` route
- `src/components/admin/UserList.tsx` -- add reset password button per user

No database migrations needed. No new secrets required.

