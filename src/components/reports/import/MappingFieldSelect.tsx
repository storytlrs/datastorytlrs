import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFieldsByTable, getTableLabel, type TargetTable, type MappingField } from "./mappingConfig";

const TABLE_COLORS: Record<TargetTable, string> = {
  creators: "bg-orange-500",
  content: "bg-blue-500",
  promo_codes: "bg-green-500",
  media_plan_items: "bg-purple-500",
};

interface MappingFieldSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  filterTable?: TargetTable;
}

export const MappingFieldSelect = ({ value, onChange, disabled, filterTable }: MappingFieldSelectProps) => {
  let fieldsByTable = getFieldsByTable();
  
  if (filterTable) {
    const filtered: Partial<Record<TargetTable, MappingField[]>> = {};
    filtered[filterTable] = fieldsByTable[filterTable];
    fieldsByTable = filtered as Record<TargetTable, MappingField[]>;
  }
  
  const handleChange = (newValue: string) => {
    onChange(newValue === "skip" ? null : newValue);
  };

  return (
    <Select value={value || "skip"} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full rounded-[35px] text-sm">
        <SelectValue placeholder="Select field..." />
      </SelectTrigger>
      <SelectContent className="bg-background border-foreground max-h-80">
        <SelectItem value="skip" className="text-muted-foreground">
          — Skip this column —
        </SelectItem>
        
        {(Object.keys(fieldsByTable) as TargetTable[]).map((table) => (
          <SelectGroup key={table}>
            <SelectLabel className="font-bold text-foreground">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${TABLE_COLORS[table]}`} />
                {getTableLabel(table)}
              </span>
            </SelectLabel>
            {fieldsByTable[table].map((field: MappingField) => (
              <SelectItem
                key={`${table}.${field.key}`}
                value={`${table}.${field.key}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TABLE_COLORS[table]}`} />
                  {field.label}
                  {field.required && (
                    <span className="text-xs text-destructive">*</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
