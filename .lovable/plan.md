

# AI Chat Assistant -- Floating Button + Chat Panel

## Overview

A floating chat button in the bottom-right corner that opens a chat panel. The assistant is context-aware (knows the current page, brand/report), respects user permissions (space_users RLS), and communicates in the user's language. Future ClickUp/Slack integration will be stubbed for now.

## Architecture

### Frontend Components

1. **`src/components/chat/AIChatButton.tsx`** -- Floating action button (accent-green, robot icon inspired by the reference image), toggles the chat panel open/closed.

2. **`src/components/chat/AIChatPanel.tsx`** -- Slide-up chat panel (fixed bottom-right, ~400px wide, ~500px tall) with:
   - Message list with markdown rendering (react-markdown already installed)
   - Input field + send button
   - Typing indicator while streaming
   - Close button in header

3. **`src/components/chat/AIChatProvider.tsx`** -- Context provider wrapping the app, managing:
   - Chat messages state
   - Current page context (route, brandId, reportId)
   - Open/close state

4. **`src/components/chat/usePageContext.ts`** -- Hook that extracts current page context from react-router (brandId, reportId, tab, page type) to send to the backend.

### Backend Edge Function

**`supabase/functions/ai-chat/index.ts`** -- Handles chat requests:
- Receives: messages array, page context (brandId, reportId, current tab/page)
- Authenticates user via JWT (auth header)
- Queries relevant data scoped to the user's accessible spaces (via space_users + user_roles)
- Builds a system prompt with:
  - Role: Professional, concise data analyst assistant
  - Context: Current page data (report metrics, brand info)
  - Language: Respond in the same language the user writes in
  - Scope: Only data from the current space, never mix spaces
  - Support mode: Can collect technical issue details (stubbed for future ClickUp/Slack)
- Calls Lovable AI Gateway (google/gemini-3-flash-preview) with streaming
- Returns SSE stream

### Data Access Strategy

The edge function uses the service role key but manually enforces access control:
1. Verify the authenticated user has access to the requested space via `space_users` table
2. Only fetch data from that specific space's reports, content, creators, ads tables
3. Build contextual summaries based on the current page:
   - Brand page: aggregate metrics across reports
   - Report page: detailed report data (KPIs, content stats, creator stats)
   - Specific tab: focused data for that section

### Security

- JWT authentication required
- Space access verified server-side before any data query
- No cross-space data leakage
- User role checked to determine depth of data shared

## Changes to Existing Files

- **`src/App.tsx`**: Wrap content with `AIChatProvider`, add `AIChatButton` component inside `BrowserRouter`
- **`src/components/MainLayout.tsx`**: No changes needed (chat is global via App.tsx)

## New Files

| File | Purpose |
|------|---------|
| `src/components/chat/AIChatButton.tsx` | Floating button component |
| `src/components/chat/AIChatPanel.tsx` | Chat panel with messages + input |
| `src/components/chat/AIChatProvider.tsx` | Context + state management |
| `src/components/chat/usePageContext.ts` | Route-based context extraction |
| `supabase/functions/ai-chat/index.ts` | Backend chat endpoint |

## Technical Details

### Floating Button Style
- Position: `fixed bottom-6 right-6 z-50`
- Size: 56px circle, `bg-accent-green` with black robot icon
- Hover: slight scale up
- When chat open: transforms to X icon

### Chat Panel Style
- Position: `fixed bottom-24 right-6 z-50`
- Size: `w-[400px] h-[500px]` (responsive: full-width on mobile)
- Rounded corners (`rounded-2xl`), shadow, dark header matching nav bar
- Messages: user right-aligned (accent-green bg), assistant left-aligned (white bg)
- Input: bottom bar with text input + send button

### System Prompt (Edge Function)
```
You are a professional data analyst assistant for Story TLRS, a marketing analytics platform.
- Be concise, clear, and professional
- Respond in the same language the user writes in
- Only reference data from the current brand/space: {spaceName}
- Never mix data between different brands/spaces
- You can summarize reports, compare metrics, explain trends
- For technical support requests, collect: issue description, steps to reproduce, expected behavior
- Current context: {pageContext}
```

### Page Context Payload
```json
{
  "page_type": "report_detail",
  "space_id": "uuid",
  "report_id": "uuid",
  "active_tab": "overview",
  "report_type": "influencer"
}
```

### Streaming Implementation
Uses the same SSE pattern as existing edge functions, with token-by-token rendering in the chat panel via `react-markdown`.

### Database Migration
A new `chat_messages` table is NOT needed initially -- conversations are ephemeral (in-memory only). If persistence is needed later, it can be added.

### Technical Support Stub
The assistant will collect issue details in a structured format. A placeholder function in the edge function will log the collected data. ClickUp/Slack integration hooks will be added later as specified.

