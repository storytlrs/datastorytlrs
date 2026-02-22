
# Update AI Chat Button Style

## What changes
The floating chat button will be restyled to match the reference image:
- **Black circular background** instead of green
- **Orange robot icon** (`#FF8000` / accent-orange) instead of black
- Larger size (~64px) for prominence
- Shadow for depth
- On hover: slight scale-up effect

## Technical details

### File: `src/components/chat/AIChatButton.tsx`
Update the Button className:
- Background: `bg-black` (black circle)
- Icon color: `text-accent-orange` (orange, #FF8000)
- Size: `h-16 w-16` (64px)
- Border: `border-none`
- Hover: `hover:scale-105`
- Keep `rounded-full`, `shadow-lg`, `fixed bottom-6 right-6 z-50`

Update Bot icon size to `h-8 w-8` for better proportion in the larger button.

When open (X icon): same black bg with orange X icon for consistency.

No other files need changes.
