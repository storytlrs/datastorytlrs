import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2 } from "lucide-react";
import { ColumnDef } from "./EditableDataTable";

interface ColumnSelectorProps {
  allColumns: ColumnDef[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
}

export const ColumnSelector = ({ allColumns, visibleColumns, onColumnToggle }: ColumnSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-foreground">
          <Settings2 className="w-4 h-4 mr-2" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium mb-3">Toggle columns</p>
          {allColumns.map((column) => (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={() => onColumnToggle(column.key)}
              />
              <label
                htmlFor={column.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
