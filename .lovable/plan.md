
# Plán: Přidání vyhledávání do Project dropdownů

## Přehled

Přidáme možnost vyhledávání do dvou míst:
1. **CreateReportDialog** - dropdown pro výběr projektu v Step 1
2. **BrandDetail** - filtr projektů v Reports tabu

Použijeme kombinaci Popover + Command komponent z cmdk knihovny, kterou projekt již využívá.

---

## Technické řešení

Nahradíme standardní `Select` komponentu za `Popover` + `Command` kombinaci, která umožní:
- Textové vyhledávání v seznamu projektů
- Filtrování projektů v reálném čase
- Zachování stejného vizuálního stylu (rounded-[35px], orange accent když aktivní)

---

## Změny

### 1. CreateReportDialog.tsx - Project dropdown s vyhledáváním

**Nový import:**
```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
```

**Nový state:**
```typescript
const [projectOpen, setProjectOpen] = useState(false);
```

**Nahrazení Select komponenty v renderStep1 (řádky 317-339):**

```tsx
{isAdmin && (
  <div className="space-y-2">
    <Label htmlFor="project">Project</Label>
    <Popover open={projectOpen} onOpenChange={setProjectOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={projectOpen}
          className="w-full justify-between rounded-[35px] border-foreground"
        >
          {projectId
            ? projects.find((p) => p.id === projectId)?.name
            : "Select a project (optional)"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    setProjectId(project.id === projectId ? "" : project.id);
                    setProjectOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      projectId === project.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
)}
```

### 2. BrandDetail.tsx - Project filter s vyhledáváním

**Nový import:**
```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
```

**Nový state:**
```typescript
const [projectFilterOpen, setProjectFilterOpen] = useState(false);
```

**Nahrazení Select komponenty pro Project filter (řádky 425-443):**

```tsx
{showProjectFilter && (
  <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={projectFilterOpen}
        className={cn(
          "w-[200px] justify-between rounded-[35px] hover:border-foreground hover:bg-foreground hover:text-background",
          projectFilter !== "all"
            ? "border-accent-orange bg-accent-orange text-foreground"
            : "border-foreground bg-card text-foreground"
        )}
      >
        {projectFilter === "all"
          ? "All projects"
          : projects.find((p) => p.id === projectFilter)?.name || "Project"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[200px] p-0" align="start">
      <Command>
        <CommandInput placeholder="Search projects..." />
        <CommandList>
          <CommandEmpty>No projects found.</CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="all"
              onSelect={() => {
                setProjectFilter("all");
                setProjectFilterOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  projectFilter === "all" ? "opacity-100" : "opacity-0"
                )}
              />
              All projects
            </CommandItem>
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={project.name}
                onSelect={() => {
                  setProjectFilter(project.id);
                  setProjectFilterOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    projectFilter === project.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
)}
```

---

## Dotčené soubory

| Soubor | Akce |
|--------|------|
| `src/components/reports/CreateReportDialog.tsx` | Nahradit Select za Popover+Command s vyhledáváním |
| `src/pages/BrandDetail.tsx` | Nahradit Select za Popover+Command s vyhledáváním |

---

## Výsledek

- Oba Project dropdowny budou mít vyhledávací pole
- Vyhledávání funguje v reálném čase (fuzzy matching z cmdk knihovny)
- Zachován konzistentní vizuální styl (zaoblení, orange accent)
- Zlepšená UX pro uživatele s mnoha projekty
