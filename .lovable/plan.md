
# Fix: AI Chat Not Detecting Current Space

## Root Cause
`AIChatProvider` is rendered **outside** any `<Route>` component (it wraps `<Routes>`), so `useParams()` always returns an empty object. This means `params.brandId` and `params.reportId` are always `undefined`, causing `page_type` to always be `"unknown"`.

## Solution
Update `src/components/chat/usePageContext.ts` to parse the brand ID and report ID directly from `location.pathname` using regex, instead of relying on `useParams()`.

## Technical Details

### File: `src/components/chat/usePageContext.ts`

- Remove the `useParams` import and call
- Parse IDs from pathname using regex patterns:
  - `/brands/([uuid])` to extract `brandId`
  - `/reports/([uuid])` to extract `reportId`
- Keep the same `PageContext` interface and return structure

```typescript
import { useLocation } from "react-router-dom";
import { useMemo } from "react";

// UUID regex pattern
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const usePageContext = (): PageContext => {
  const location = useLocation();

  return useMemo(() => {
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const active_tab = searchParams.get("tab") || undefined;

    const brandMatch = pathname.match(new RegExp(`^/brands/(${UUID})`));
    const reportMatch = pathname.match(new RegExp(`^/reports/(${UUID})`));

    if (pathname === "/dashboard") {
      return { page_type: "dashboard", pathname, active_tab };
    }

    if (brandMatch) {
      return {
        page_type: "brand_detail",
        brand_id: brandMatch[1],
        space_id: brandMatch[1],
        pathname,
        active_tab,
      };
    }

    if (reportMatch) {
      return {
        page_type: "report_detail",
        report_id: reportMatch[1],
        pathname,
        active_tab,
      };
    }

    if (pathname === "/admin") return { page_type: "admin", pathname };
    if (pathname === "/auth") return { page_type: "auth", pathname };
    return { page_type: "unknown", pathname };
  }, [location.pathname, location.search]);
};
```

No backend changes needed -- the edge function already handles `brand_detail` and `report_detail` page types correctly.
