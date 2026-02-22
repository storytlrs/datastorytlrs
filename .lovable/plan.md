

# Update AI Assistant Button Styling

## Changes

**File: `src/components/chat/AIChatButton.tsx`** -- Update the Button element (lines 12-18):

- **Size**: `h-14 w-14` (56x56px)
- **Background**: `bg-primary` (black #000000)
- **Border**: `border border-primary` (white border in default state)
- **Icon color**: `text-[#FF8000]` (orange)
- **Icon size**: `!h-10 !w-10` (40x40px, with `!` to override SVG defaults)
- **Shadow**: `shadow-lg`
- **Hover**: `hover:bg-[#FF8000] hover:text-black hover:border-[#FF8000]` -- orange background, black icon

### Updated className
```tsx
className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-[#FF8000] shadow-lg border border-primary hover:bg-[#FF8000] hover:text-black hover:border-[#FF8000] transition-all duration-200"
```

### Updated icons
```tsx
{isOpen ? <X className="!h-10 !w-10" /> : <Bot className="!h-10 !w-10" />}
```

No other files need changes.

