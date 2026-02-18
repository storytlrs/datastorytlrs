import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { ColumnDef } from "./EditableDataTable";

interface ColumnSelectorProps {
  allColumns: ColumnDef[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const ColumnSelector = ({ allColumns, visibleColumns, onColumnToggle, onReorder }: ColumnSelectorProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (!onReorder) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!onReorder || draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!onReorder || draggedIndex === null || draggedIndex === index) return;
    onReorder(draggedIndex, index);
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (!onReorder || index === 0) return;
    onReorder(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (!onReorder || index === allColumns.length - 1) return;
    onReorder(index, index + 1);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-foreground">
          <Settings2 className="w-4 h-4 mr-2" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-1">
          <p className="text-sm font-medium mb-3">Toggle & reorder columns</p>
          {allColumns.map((column, index) => (
            <div
              key={column.key}
              draggable={!!onReorder}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center gap-2 py-1 px-1 rounded transition-colors ${
                draggedIndex === index ? "opacity-50 bg-muted" : "hover:bg-muted/50"
              } ${onReorder ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              {onReorder && (
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <Checkbox
                id={column.key}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={() => onColumnToggle(column.key)}
              />
              <label
                htmlFor={column.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {column.label}
              </label>
              {onReorder && (
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    disabled={index === allColumns.length - 1}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
