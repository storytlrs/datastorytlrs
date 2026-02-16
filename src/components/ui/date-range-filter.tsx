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
    { label: "Tento měsíc", getRange: () => ({ start: startOfMonth(now), end: endOfMonth(now) }) },
    { label: "Tento kvartál", getRange: () => ({ start: startOfQuarter(now), end: endOfQuarter(now) }) },
    { label: "Tento rok", getRange: () => ({ start: startOfYear(now), end: endOfYear(now) }) },
    { label: "Minulý měsíc", getRange: () => { const p = subMonths(now, 1); return { start: startOfMonth(p), end: endOfMonth(p) }; } },
    { label: "Minulý kvartál", getRange: () => { const p = subQuarters(now, 1); return { start: startOfQuarter(p), end: endOfQuarter(p) }; } },
    { label: "Minulý rok", getRange: () => { const p = subYears(now, 1); return { start: startOfYear(p), end: endOfYear(p) }; } },
    { label: "Příští měsíc", getRange: () => { const n = addMonths(now, 1); return { start: startOfMonth(n), end: endOfMonth(n) }; } },
    { label: "Příští kvartál", getRange: () => { const n = addQuarters(now, 1); return { start: startOfQuarter(n), end: endOfQuarter(n) }; } },
    { label: "Příští rok", getRange: () => { const n = addYears(now, 1); return { start: startOfYear(n), end: endOfYear(n) }; } },
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
  const [startMonth, setStartMonth] = React.useState<Date>(dateRange.start || new Date());
  const [endMonth, setEndMonth] = React.useState<Date>(dateRange.end || addMonths(new Date(), 1));
  const presets = React.useMemo(() => getPresets(), []);
  const activePreset = findActivePreset(dateRange, presets);
  const hasValue = dateRange.start || dateRange.end;

  // Sync displayed months when dateRange changes from presets
  React.useEffect(() => {
    if (dateRange.start) setStartMonth(dateRange.start);
    if (dateRange.end) setEndMonth(dateRange.end);
  }, [dateRange.start, dateRange.end]);

  const getLabel = () => {
    if (activePreset) return activePreset;
    if (dateRange.start && dateRange.end) {
      return `${format(dateRange.start, "d. M. yyyy")} – ${format(dateRange.end, "d. M. yyyy")}`;
    }
    if (dateRange.start) return `Od ${format(dateRange.start, "d. M. yyyy")}`;
    if (dateRange.end) return `Do ${format(dateRange.end, "d. M. yyyy")}`;
    return "Vybrat datum";
  };

  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getRange();
    onDateRangeChange(range);
    setOpen(false);
  };

  const handleStartSelect = (date: Date | undefined) => {
    if (!date) return;
    const newStart = date;
    // If start > end, swap
    if (dateRange.end && date > dateRange.end) {
      onDateRangeChange({ start: dateRange.end, end: date });
    } else {
      onDateRangeChange({ ...dateRange, start: newStart });
    }
  };

  const handleEndSelect = (date: Date | undefined) => {
    if (!date) return;
    // If end < start, swap
    if (dateRange.start && date < dateRange.start) {
      onDateRangeChange({ start: date, end: dateRange.start });
    } else {
      onDateRangeChange({ ...dateRange, end: date });
    }
  };

  const handleClear = () => {
    onDateRangeChange({ start: null, end: null });
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
        <div className="flex flex-col">
          {/* Two calendars side by side */}
          <div className="flex">
            {/* Start calendar */}
            <div className="p-3 border-r border-border">
              <p className="text-center text-sm font-medium text-muted-foreground mb-2">Od</p>
              <Calendar
                mode="single"
                selected={dateRange.start || undefined}
                onSelect={handleStartSelect}
                month={startMonth}
                onMonthChange={setStartMonth}
                initialFocus
                className="pointer-events-auto"
              />
            </div>
            {/* End calendar */}
            <div className="p-3">
              <p className="text-center text-sm font-medium text-muted-foreground mb-2">Do</p>
              <Calendar
                mode="single"
                selected={dateRange.end || undefined}
                onSelect={handleEndSelect}
                month={endMonth}
                onMonthChange={setEndMonth}
                className="pointer-events-auto"
              />
            </div>
          </div>
          {/* Presets grid 3x3 below */}
          <div className="border-t border-border p-3">
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-sm h-9 rounded-full",
                    activePreset === preset.label && "bg-accent-purple text-accent-purple-foreground"
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {hasValue && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm h-8 rounded-full text-muted-foreground"
                  onClick={handleClear}
                >
                  Vymazat
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
