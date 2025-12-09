import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export type ColumnType = "text" | "number" | "select" | "date";

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  editable?: boolean;
  calculated?: boolean;
  options?: { value: string; label: string }[];
  width?: string;
  maxWidth?: string;
  wrap?: boolean;
  truncate?: boolean;
  truncateLines?: number;
  format?: (value: any, row?: any) => string;
}

interface EditableDataTableProps {
  columns: ColumnDef[];
  data: any[];
  canEdit: boolean;
  onUpdate: (id: string, field: string, value: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onEdit?: (row: any) => void;
  loading?: boolean;
}

export const EditableDataTable = ({
  columns,
  data,
  canEdit,
  onUpdate,
  onDelete,
  onEdit,
  loading = false,
}: EditableDataTableProps) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  const toggleExpanded = (cellId: string) => {
    setExpandedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  const startEdit = (id: string, field: string, currentValue: any) => {
    if (!canEdit) return;
    setEditingCell({ id, field });
    setEditValue(currentValue ?? "");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { id, field } = editingCell;
    setSavingCell(`${id}-${field}`);

    try {
      await onUpdate(id, field, editValue);
      toast.success("Saved");
      setEditingCell(null);
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSavingCell(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete || !canEdit) return;
    
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Deleted");
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const renderCell = (row: any, column: ColumnDef) => {
    const isEditing = editingCell?.id === row.id && editingCell?.field === column.key;
    const isSaving = savingCell === `${row.id}-${column.key}`;
    const value = row[column.key];
    const displayValue = column.format ? column.format(value, row) : value;

    // Calculated columns are never editable
    if (column.calculated) {
      return <span className="text-muted-foreground">{displayValue ?? "-"}</span>;
    }

    if (isEditing) {
      if (column.type === "select" && column.options) {
        return (
          <Select
            value={editValue}
            onValueChange={(val) => {
              setEditValue(val);
            }}
            onOpenChange={(open) => {
              if (!open) saveEdit();
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {column.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          type={column.type === "number" ? "number" : "text"}
          value={editValue}
          onChange={(e) => setEditValue(column.type === "number" ? Number(e.target.value) : e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          className="h-8"
          autoFocus
        />
      );
    }

    // Handle truncated text with expand/collapse
    if (column.truncate && displayValue && typeof displayValue === 'string' && displayValue.length > 100) {
      const cellId = `${row.id}-${column.key}`;
      const isExpanded = expandedCells.has(cellId);
      const lines = column.truncateLines || 3;
      
      return (
        <div style={{ maxWidth: column.maxWidth || '300px' }}>
          <div 
            className={`whitespace-normal break-words text-sm ${!isExpanded ? 'line-clamp-' + lines : ''}`}
            style={!isExpanded ? { 
              display: '-webkit-box',
              WebkitLineClamp: lines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            } : {}}
          >
            {displayValue}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 mt-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(cellId);
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Skrýt
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Zobrazit více
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 ${canEdit && column.editable !== false ? "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded" : ""}`}
        onClick={() => column.editable !== false && startEdit(row.id, column.key, value)}
        style={{ maxWidth: column.maxWidth }}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className={column.wrap ? "whitespace-normal break-words" : ""}>{displayValue ?? "-"}</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-[35px] border border-foreground overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} style={{ width: col.width }}>
                {col.label}
              </TableHead>
            ))}
            {canEdit && (onDelete || onEdit) && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (canEdit && (onDelete || onEdit) ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
              data.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col) => (
                  <TableCell key={col.key} style={{ maxWidth: col.maxWidth }}>{renderCell(row, col)}</TableCell>
                ))}
                {canEdit && (onDelete || onEdit) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
