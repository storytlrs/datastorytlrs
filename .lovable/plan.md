

# Fix AI Assistant Context: Current Date, Space Name, and Question Behavior

## Problems
1. The system prompt does not include the current date/time, so the assistant cannot reference "today" or time-relative information.
2. When on a brand page, the space name is fetched but might not be clearly communicated. On report pages, the space name is fetched via a second query but the assistant still sometimes lacks clarity about which space it's in.
3. No instruction telling the assistant to ask at most one concise clarifying question at a time.

## Changes

### File: `supabase/functions/ai-chat/index.ts`

**1. Add current date to system prompt (line ~211)**

Add `new Date().toISOString()` to provide the current date/time context.

**2. Update system prompt rules (lines 211-222)**

Add these rules:
- `- Current date and time: {ISO date}`
- `- If the user's request is unclear, ask at most ONE short clarifying question. Never ask multiple questions at once.`

Updated system prompt section:

```typescript
const now = new Date().toISOString();

const systemPrompt = `You are a professional data analyst assistant for Story TLRS, a marketing analytics platform.

Rules:
- Be concise, clear, and professional
- Respond in the SAME LANGUAGE the user writes in
- Only reference data from the current brand/space -- NEVER mix data between different brands/spaces
- You can summarize reports, compare metrics, explain trends, and provide actionable insights
- For technical support requests, collect: issue description, steps to reproduce, expected behavior, then format it clearly (this will later be sent to ClickUp/Slack)
- If you don't have enough context to answer, say so honestly
- If the user's request is unclear, ask at most ONE short clarifying question. Never ask multiple questions at once.
- Current date and time: ${now}
- User role: ${userRole}
- Current page: ${pc.page_type || "unknown"}
${contextData}`;
```

No other files need changes. The edge function will be redeployed automatically.
