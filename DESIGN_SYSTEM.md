# Story TLRS Design System

Kompletní dokumentace vizuálního systému pro snadné replikování v dalších projektech.

---

## 1. Přehled

| Vlastnost | Hodnota |
|-----------|---------|
| Primární font | Red Hat Display |
| Sekundární font | Young Serif |
| Pozadí | #E9E9E9 (light) / #1A1A1A (dark) |
| Text | #000000 (light) / #E9E9E9 (dark) |
| Border radius | 35px (standardní) / 12px (dropdowny) |
| Hover chování | Inverze barev |

---

## 2. Fonty

### Google Fonts Import

Přidej do `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700;800;900&family=Young+Serif&display=swap" rel="stylesheet" />
```

### Použití v CSS

```css
body {
  font-family: 'Red Hat Display', sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Red Hat Display', sans-serif;
  font-weight: 700;
}

.font-serif {
  font-family: 'Young Serif', serif;
}
```

---

## 3. Barevná paleta (CSS proměnné)

### Light Mode

```css
:root {
  /* Základní barvy */
  --background: 0 0% 91.4%;        /* #E9E9E9 */
  --foreground: 0 0% 0%;           /* #000000 */

  /* Karty a popovery */
  --card: 0 0% 91.4%;
  --card-foreground: 0 0% 0%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 0%;

  /* Primary - černá */
  --primary: 0 0% 0%;
  --primary-foreground: 0 0% 91.4%;

  /* Secondary */
  --secondary: 0 0% 91.4%;
  --secondary-foreground: 0 0% 0%;

  /* Muted */
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 40%;

  /* Accent - základní (fialová) */
  --accent: 241 94% 78%;           /* #9795F9 */
  --accent-foreground: 0 0% 0%;

  /* Accent barvy pro status systém */
  --accent-orange: 30 100% 50%;    /* #FF8000 */
  --accent-orange-foreground: 0 0% 0%;
  --accent-green: 138 69% 59%;     /* #57DC64 */
  --accent-green-foreground: 0 0% 0%;
  --accent-blue: 200 100% 60%;     /* #33B6FF */
  --accent-purple: 241 94% 78%;    /* #9795F9 */
  --accent-purple-foreground: 0 0% 100%;

  /* Destructive */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 100%;

  /* Utility */
  --border: 0 0% 0%;                /* Černé bordery */
  --input: 0 0% 91.4%;
  --ring: 0 0% 0%;
  --radius: 35px;                   /* Specifický radius */

  /* Sidebar */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}
```

### Dark Mode

```css
.dark {
  --background: 0 0% 10%;
  --foreground: 0 0% 91.4%;

  --card: 0 0% 15%;
  --card-foreground: 0 0% 91.4%;

  --popover: 0 0% 15%;
  --popover-foreground: 0 0% 91.4%;

  --primary: 0 0% 91.4%;
  --primary-foreground: 0 0% 0%;

  --secondary: 0 0% 20%;
  --secondary-foreground: 0 0% 91.4%;

  --muted: 0 0% 20%;
  --muted-foreground: 0 0% 60%;

  --accent: 241 94% 79%;
  --accent-foreground: 0 0% 0%;

  --accent-orange: 30 100% 50%;
  --accent-orange-foreground: 0 0% 0%;
  --accent-green: 138 69% 59%;
  --accent-green-foreground: 0 0% 0%;
  --accent-blue: 200 100% 60%;
  --accent-purple: 241 94% 78%;
  --accent-purple-foreground: 0 0% 100%;

  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 91.4%;

  --border: 0 0% 91.4%;
  --input: 0 0% 20%;
  --ring: 0 0% 91.4%;

  --sidebar-background: 240 5.9% 10%;
  --sidebar-foreground: 240 4.8% 95.9%;
  --sidebar-primary: 224.3 76.3% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-accent-foreground: 240 4.8% 95.9%;
  --sidebar-border: 240 3.7% 15.9%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}
```

---

## 4. Tailwind konfigurace

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          orange: 'hsl(var(--accent-orange))',
          'orange-foreground': 'hsl(var(--accent-orange-foreground))',
          green: 'hsl(var(--accent-green))',
          'green-foreground': 'hsl(var(--accent-green-foreground))',
          blue: 'hsl(var(--accent-blue))',
          purple: 'hsl(var(--accent-purple))',
          'purple-foreground': 'hsl(var(--accent-purple-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'monospace']
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 5. Pravidla designu

### Border Radius

| Prvek | Hodnota | Tailwind třída |
|-------|---------|----------------|
| Tlačítka, karty, inputy | 35px | `rounded-lg` nebo `rounded-[35px]` |
| Dropdowny, popovers | 12px | `rounded-xl` |
| Tagy, badges | plné zaoblení | `rounded-full` |

### Hover chování

**Pravidlo inverze**: Při hoveru se barvy invertují.

```
Černé pozadí + bílý text  →  Bílé pozadí + černý text + černý border
Černý outline + černý text  →  Černé pozadí + bílý text
```

### Aktivní stavy

| Prvek | Aktivní barva | Tailwind třídy |
|-------|---------------|----------------|
| Tabs | Zelená | `bg-accent-green text-accent-green-foreground` |
| Filtry, Date pickery | Oranžová | `bg-accent-orange text-accent-orange-foreground border-accent-orange` |

---

## 6. Komponenty

### Button

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-background hover:text-foreground hover:border-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-primary bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground",
        secondary: "border-primary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border-transparent hover:bg-primary hover:text-primary-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        active: "border-accent-green bg-accent-green text-accent-green-foreground hover:bg-accent-green/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### Select

```typescript
// SelectTrigger - s hover inverzí
const SelectTrigger = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "group flex h-10 w-full items-center justify-between rounded-md border border-foreground bg-card text-foreground px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 hover:border-foreground hover:bg-foreground hover:text-background",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-foreground group-hover:text-background" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

// SelectContent - rounded-xl pro dropdown
const SelectContent = React.forwardRef<...>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-md ...",
        className,
      )}
      position={position}
      {...props}
    >
      {/* ... */}
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

// SelectItem - s hover inverzí
const SelectItem = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-foreground focus:text-background data-[state=checked]:bg-foreground data-[state=checked]:text-background",
      className,
    )}
    {...props}
  >
    {/* ... */}
  </SelectPrimitive.Item>
));
```

### Tabs

```typescript
// TabsList - černé pozadí, zaoblené
const TabsList = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-full bg-primary p-1.5 text-primary-foreground",
      className,
    )}
    {...props}
  />
));

// TabsTrigger - aktivní = zelená
const TabsTrigger = React.forwardRef<...>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium ring-offset-background transition-all text-primary-foreground/80 hover:text-primary-foreground data-[state=active]:bg-accent-green data-[state=active]:text-accent-green-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
```

### Filter Buttons (aktivní = oranžová)

```typescript
// Použití v komponentách
<Button
  variant={isActive ? "default" : "outline"}
  className={cn(
    "rounded-[35px]",
    isActive
      ? "border-accent-orange bg-accent-orange text-foreground hover:bg-accent-orange/90"
      : "border-foreground bg-card text-foreground hover:bg-foreground hover:text-background"
  )}
>
  Filter
</Button>

// Nebo jako Select s aktivním stavem
<SelectTrigger className={cn(
  "w-[200px] rounded-[35px]",
  selectedValue !== "all"
    ? "border-accent-orange bg-accent-orange text-foreground"
    : ""
)}>
  <SelectValue placeholder="Vybrat..." />
</SelectTrigger>
```

### Dropdown Menu

```typescript
const DropdownMenuContent = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-md ...",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));

const DropdownMenuItem = React.forwardRef<...>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-foreground focus:text-background data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
```

### Popover

```typescript
const PopoverContent = React.forwardRef<...>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-xl border bg-popover p-4 text-popover-foreground shadow-md outline-none ...",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
```

### Dialog

```typescript
const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-xl sm:rounded-xl",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
```

---

## 7. Status Badge systém

### Typy a barvy

| Status | Pozadí | Text | Význam |
|--------|--------|------|--------|
| WOW! | `bg-accent-green` | `text-accent-green-foreground` | ≥150% benchmarku |
| VIRAL | `bg-accent-blue` | `text-white` | ≥120% benchmarku |
| OK | `bg-accent-purple` | `text-accent-purple-foreground` | ≥80% benchmarku |
| FAIL | `bg-accent-orange` | `text-accent-orange-foreground` | <80% benchmarku |

### Komponenta

```typescript
import { cn } from "@/lib/utils";

export type StatusType = "WOW!" | "VIRAL" | "OK" | "FAIL";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string }> = {
  "WOW!": { bg: "bg-accent-green", text: "text-accent-green-foreground" },
  "VIRAL": { bg: "bg-accent-blue", text: "text-white" },
  "OK": { bg: "bg-accent-purple", text: "text-accent-purple-foreground" },
  "FAIL": { bg: "bg-accent-orange", text: "text-accent-orange-foreground" },
};

export const getStatusFromPerformance = (
  value: number,
  benchmark: number
): StatusType => {
  if (benchmark === 0) return "OK";
  const ratio = value / benchmark;
  if (ratio >= 1.5) return "WOW!";
  if (ratio >= 1.2) return "VIRAL";
  if (ratio >= 0.8) return "OK";
  return "FAIL";
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
        config.bg,
        config.text,
        className
      )}
    >
      {status}
    </span>
  );
};
```

---

## 8. Quick Start checklist

### Nový projekt - krok za krokem

1. **Přidej fonty do `index.html`**
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@500;600;700;800;900&family=Young+Serif&display=swap" rel="stylesheet" />
   ```

2. **Zkopíruj CSS proměnné do `src/index.css`** (sekce 3)

3. **Nastav `tailwind.config.ts`** (sekce 4)

4. **Přidej base styly do `src/index.css`**
   ```css
   @layer base {
     * {
       @apply border-border;
     }
     body {
       @apply bg-background text-foreground;
       font-family: 'Red Hat Display', sans-serif;
     }
     h1, h2, h3, h4, h5, h6 {
       font-family: 'Red Hat Display', sans-serif;
       font-weight: 700;
     }
   }
   ```

5. **Nainstaluj závislosti**
   ```bash
   npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
   ```

6. **Zkopíruj komponenty** (Button, Select, Tabs, atd.)

7. **Přidej utility funkci `cn`**
   ```typescript
   // src/lib/utils.ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```

---

## 9. Důležitá pravidla (shrnutí)

| Pravidlo | Popis |
|----------|-------|
| ❌ Nikdy nepoužívej přímé barvy | Vždy používej `text-foreground`, `bg-primary` atd. |
| ✅ Všechny barvy jako HSL | CSS proměnné definuj vždy v HSL formátu |
| ✅ Hover = inverze | Černá ↔ bílá při hoveru |
| ✅ Tabs aktivní = zelená | `bg-accent-green` |
| ✅ Filtry aktivní = oranžová | `bg-accent-orange` |
| ✅ Dropdowny = 12px radius | Použij `rounded-xl` |
| ✅ Ostatní = 35px radius | Použij `rounded-lg` nebo `rounded-[35px]` |
| ✅ Sémantické tokeny | Vždy preferuj `text-muted-foreground` před `text-gray-500` |

---

## Závěr

Tento designový systém zajišťuje konzistentní vzhled napříč celou aplikací. Při vytváření nových komponent vždy:

1. Používej existující barevné tokeny
2. Dodržuj pravidla hover inverze
3. Respektuj border-radius konvence
4. Testuj v light i dark režimu
