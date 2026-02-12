import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useState } from "react";

export interface FilterOption {
  id: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const MultiSelectFilter = ({
  label,
  options,
  selectedIds,
  onToggle,
  onRemove,
  onClear,
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
}: MultiSelectFilterProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "rounded-[35px] justify-between min-w-[200px] hover:border-foreground hover:bg-foreground hover:text-background",
                selectedIds.length > 0
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
              )}
            >
              {selectedIds.length > 0
                ? `${selectedIds.length} ${label.toLowerCase()}${selectedIds.length > 1 ? "s" : ""} selected`
                : `All ${label.toLowerCase()}s`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {[...options].sort((a, b) => {
                    const aSelected = selectedIds.includes(a.id) ? 0 : 1;
                    const bSelected = selectedIds.includes(b.id) ? 0 : 1;
                    return aSelected - bSelected;
                  }).map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.label}
                      onSelect={() => onToggle(option.id)}
                      className={cn(
                        selectedIds.includes(option.id) && "bg-foreground text-background"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIds.includes(option.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedIds.length > 0 && (
          <Button
            variant="ghost"
            onClick={onClear}
            className="rounded-[35px] text-sm"
          >
            Clear
          </Button>
        )}
      </div>

    </div>
  );
};

export default MultiSelectFilter;
