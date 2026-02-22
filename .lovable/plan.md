

# Header: Black Background + Logo

## Changes

### 1. Copy logo to project
Copy `user-uploads://StoryTLRS-white-01_1.png` to `src/assets/logo-white.png`.

### 2. Update `src/components/MainNavigation.tsx`
- Add black background to the `<nav>` element: `bg-foreground` (which is black in the design system)
- Replace the `<div className="text-xl font-bold">Story TLRS</div>` text with an `<img>` tag importing the logo from `src/assets/logo-white.png`
- Update border color to match (e.g., `border-foreground` stays or becomes subtle)
- Buttons for brand selector, profile, and logout remain unchanged (they already have `border-foreground` outline styling which will look fine on black background since foreground = black in light mode)

**Button color adjustment**: Since the nav background is now black, the outline buttons (white/transparent bg with black border) need to invert for contrast. Update their classes to use white borders and white icon colors on the dark nav: `border-white text-white hover:bg-white hover:text-black`.

### Technical detail

```tsx
import logoWhite from "@/assets/logo-white.png";

// nav element
<nav className="w-full py-4 bg-foreground">

// Logo
<img src={logoWhite} alt="Story TLRS" className="h-8" />

// Buttons: add explicit white border/text overrides
className="rounded-[35px] border-white text-white hover:bg-white hover:text-foreground"
```

### Files to modify
1. `src/components/MainNavigation.tsx` -- black bg, logo image, button color overrides

