import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
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
  format?: (value: any, row?: any) => string;
}

interface EditableDataTableProps {
  columns: ColumnDef[];
  data: any[];
  canEdit: boolean;
  onUpdate: (id: string, field: string, value: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  loading?: boolean;
}

export const EditableDataTable = ({
  columns,
  data,
  canEdit,
  onUpdate,
  onDelete,
  loading = false,
}: EditableDataTableProps) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    return (
      <div
        className={`flex items-center gap-2 ${canEdit && column.editable !== false ? "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded" : ""}`}
        onClick={() => column.editable !== false && startEdit(row.id, column.key, value)}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span>{displayValue ?? "-"}</span>
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
            {canEdit && onDelete && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (canEdit && onDelete ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{renderCell(row, col)}</TableCell>
                ))}
                {canEdit && onDelete && (
                  <TableCell>
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
