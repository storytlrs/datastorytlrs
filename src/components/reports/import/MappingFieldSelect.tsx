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

interface MappingFieldSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  filterTable?: TargetTable;
}

export const MappingFieldSelect = ({ value, onChange, disabled, filterTable }: MappingFieldSelectProps) => {
  let fieldsByTable = getFieldsByTable();
  
  // Filter to only show fields from a specific table
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
              {getTableLabel(table)}
            </SelectLabel>
            {fieldsByTable[table].map((field: MappingField) => (
              <SelectItem
                key={`${table}.${field.key}`}
                value={`${table}.${field.key}`}
              >
                <span className="flex items-center gap-2">
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
