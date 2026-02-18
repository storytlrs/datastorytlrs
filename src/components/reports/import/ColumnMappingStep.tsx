import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ColumnMappingRow } from "./ColumnMappingRow";
import { validateMappings, type TargetTable } from "./mappingConfig";
import type { ParsedFile } from "./fileParser";

interface ColumnMappingStepProps {
  parsedFile: ParsedFile;
  mappings: Record<string, string | null>;
  onMappingChange: (column: string, value: string | null) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  filterTable?: TargetTable;
}

export const ColumnMappingStep = ({
  parsedFile,
  mappings,
  onMappingChange,
  onNext,
  onBack,
  onCancel,
  filterTable,
}: ColumnMappingStepProps) => {
  // Validate current mappings
  const validation = useMemo(() => validateMappings(mappings), [mappings]);

  // Count mapped columns
  const mappedCount = useMemo(
    () => Object.values(mappings).filter((m) => m !== null).length,
    [mappings]
  );

  return (
    <div className="space-y-4">
      {/* File Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>📄 {parsedFile.fileName}</span>
        <span>|</span>
        <span>{parsedFile.columns.length} columns</span>
        <span>|</span>
        <span>{parsedFile.totalRows} rows</span>
        <span>|</span>
        <span className="text-primary font-medium">{mappedCount} mapped</span>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Map each column to the corresponding field. You can import Creators, Content, and Promo Codes data at once.
          Fields marked with <span className="text-destructive font-bold">*</span> are required for that data type.
        </AlertDescription>
      </Alert>

      {/* Mapping Table */}
      <ScrollArea className="h-[400px] border rounded-[20px]">
        <table className="w-full">
          <thead className="bg-muted sticky top-0">
            <tr className="border-b border-border">
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Source Column
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Sample Data
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold w-64">
                Map to
              </th>
            </tr>
          </thead>
          <tbody>
            {parsedFile.columns.map((column) => (
              <ColumnMappingRow
                key={column.name}
                column={column}
                mapping={mappings[column.name] ?? null}
                onChange={(value) => onMappingChange(column.name, value)}
                filterTable={filterTable}
              />
            ))}
          </tbody>
        </table>
      </ScrollArea>

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-[35px]"
        >
          ← Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="rounded-[35px]"
          >
            Cancel
          </Button>
          <Button
            onClick={onNext}
            disabled={mappedCount === 0}
            className="rounded-[35px]"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
};
