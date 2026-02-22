
# Fix Header Navigation (Sticky on Scroll)

## Change

Add `sticky top-0 z-50` classes to the `<nav>` element in `MainNavigation.tsx` so it stays visible when scrolling.

## File: `src/components/reports/MainNavigation.tsx` (line 95)

**Current:**
```tsx
<nav className="w-full py-4 bg-foreground">
```

**Updated:**
```tsx
<nav className="w-full py-4 bg-foreground sticky top-0 z-50">
```

This is a single-line change. The `sticky top-0` keeps the nav pinned to the top on scroll, and `z-50` ensures it stays above other content.
