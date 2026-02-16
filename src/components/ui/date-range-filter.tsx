import * as React from "react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addMonths, addQuarters, addYears, subMonths, subQuarters, subYears } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

interface PresetOption {
  label: string;
  getRange: () => DateRange;
}

const getPresets = (): PresetOption[] => {
  const now = new Date();
  return [
    {
      label: "Tento měsíc",
      getRange: () => ({ start: startOfMonth(now), end: endOfMonth(now) }),
    },
    {
      label: "Tento kvartál",
      getRange: () => ({ start: startOfQuarter(now), end: endOfQuarter(now) }),
    },
    {
      label: "Tento rok",
      getRange: () => ({ start: startOfYear(now), end: endOfYear(now) }),
    },
    {
      label: "Minulý měsíc",
      getRange: () => {
        const prev = subMonths(now, 1);
        return { start: startOfMonth(prev), end: endOfMonth(prev) };
      },
    },
    {
      label: "Minulý kvartál",
      getRange: () => {
        const prev = subQuarters(now, 1);
        return { start: startOfQuarter(prev), end: endOfQuarter(prev) };
      },
    },
    {
      label: "Minulý rok",
      getRange: () => {
        const prev = subYears(now, 1);
        return { start: startOfYear(prev), end: endOfYear(prev) };
      },
    },
    {
      label: "Příští měsíc",
      getRange: () => {
        const next = addMonths(now, 1);
        return { start: startOfMonth(next), end: endOfMonth(next) };
      },
    },
    {
      label: "Příští kvartál",
      getRange: () => {
        const next = addQuarters(now, 1);
        return { start: startOfQuarter(next), end: endOfQuarter(next) };
      },
    },
    {
      label: "Příští rok",
      getRange: () => {
        const next = addYears(now, 1);
        return { start: startOfYear(next), end: endOfYear(next) };
      },
    },
  ];
};

const findActivePreset = (dateRange: DateRange, presets: PresetOption[]): string | null => {
  if (!dateRange.start || !dateRange.end) return null;
  for (const preset of presets) {
    const range = preset.getRange();
    if (
      range.start && range.end &&
      dateRange.start.getTime() === range.start.getTime() &&
      dateRange.end.getTime() === range.end.getTime()
    ) {
      return preset.label;
    }
  }
  return null;
};

export function DateRangeFilter({ dateRange, onDateRangeChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [selectingStart, setSelectingStart] = React.useState(true);
  const presets = React.useMemo(() => getPresets(), []);
  const activePreset = findActivePreset(dateRange, presets);
  const hasValue = dateRange.start || dateRange.end;

  const getLabel = () => {
    if (activePreset) return activePreset;
    if (dateRange.start && dateRange.end) {
      return `${format(dateRange.start, "d MMM yyyy")} – ${format(dateRange.end, "d MMM yyyy")}`;
    }
    if (dateRange.start) return `Od ${format(dateRange.start, "d MMM yyyy")}`;
    if (dateRange.end) return `Do ${format(dateRange.end, "d MMM yyyy")}`;
    return "Vybrat datum";
  };

  const handlePresetClick = (preset: PresetOption) => {
    onDateRangeChange(preset.getRange());
    setOpen(false);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    if (selectingStart) {
      onDateRangeChange({ start: date, end: dateRange.end });
      setSelectingStart(false);
    } else {
      // If end < start, swap
      if (dateRange.start && date < dateRange.start) {
        onDateRangeChange({ start: date, end: dateRange.start });
      } else {
        onDateRangeChange({ ...dateRange, end: date });
      }
      setSelectingStart(true);
    }
  };

  const handleClear = () => {
    onDateRangeChange({ start: null, end: null });
    setSelectingStart(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
            hasValue
              ? "border-accent-orange bg-accent-orange text-foreground"
              : "border-foreground bg-card text-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-[20px]" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="border-r border-border p-3 flex flex-col gap-1 min-w-[160px]">
            <p className="text-xs font-medium text-muted-foreground mb-1 px-2">Rychlé volby</p>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start text-sm h-8 rounded-lg",
                  activePreset === preset.label && "bg-accent-orange text-foreground"
                )}
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
            {hasValue && (
              <>
                <div className="border-t border-border my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-sm h-8 rounded-lg text-muted-foreground"
                  onClick={handleClear}
                >
                  Vymazat
                </Button>
              </>
            )}
          </div>
          {/* Calendar */}
          <div className="p-3">
            <div className="flex gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-lg text-xs h-7 flex-1",
                  selectingStart && "bg-accent-orange text-foreground"
                )}
                onClick={() => setSelectingStart(true)}
              >
                {dateRange.start ? format(dateRange.start, "d MMM yyyy") : "Od"}
              </Button>
              <span className="text-muted-foreground self-center">–</span>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-lg text-xs h-7 flex-1",
                  !selectingStart && "bg-accent-orange text-foreground"
                )}
                onClick={() => setSelectingStart(false)}
              >
                {dateRange.end ? format(dateRange.end, "d MMM yyyy") : "Do"}
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={(selectingStart ? dateRange.start : dateRange.end) || undefined}
              onSelect={handleCalendarSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
