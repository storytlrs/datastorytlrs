import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FileUploadStepProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onNext: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  sheetNames?: string[];
  selectedSheet?: string | null;
  onSheetChange?: (sheet: string) => void;
  skipFirstRow?: boolean;
  onSkipFirstRowChange?: (val: boolean) => void;
  skipLastRow?: boolean;
  onSkipLastRowChange?: (val: boolean) => void;
}

export const FileUploadStep = ({
  file,
  onFileSelect,
  onNext,
  onCancel,
  isLoading,
  sheetNames,
  selectedSheet,
  onSheetChange,
  skipFirstRow,
  onSkipFirstRowChange,
  skipLastRow,
  onSkipLastRowChange,
}: FileUploadStepProps) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        const extension = droppedFile.name.split(".").pop()?.toLowerCase();
        
        if (extension === "xlsx" || extension === "xls" || extension === "csv") {
          onFileSelect(droppedFile);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-[35px] p-12 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground",
          file && "border-primary bg-primary/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4">
          {file ? (
            <>
              <FileSpreadsheet className="w-12 h-12 text-primary" />
              <div>
                <p className="font-medium text-lg">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemoveFile();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-lg">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports XLSX, XLS, and CSV files
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sheet Selector */}
      {sheetNames && sheetNames.length > 1 && file && (
        <div className="space-y-2">
          <Label>Select Sheet</Label>
          <Select value={selectedSheet || undefined} onValueChange={(val) => onSheetChange?.(val)}>
            <SelectTrigger className="rounded-[35px]">
              <SelectValue placeholder="Select a sheet..." />
            </SelectTrigger>
            <SelectContent>
              {sheetNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Skip rows options */}
      {file && onSkipFirstRowChange && onSkipLastRowChange && (
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="skip-first"
              checked={skipFirstRow}
              onCheckedChange={(checked) => onSkipFirstRowChange(!!checked)}
            />
            <Label htmlFor="skip-first" className="text-sm cursor-pointer">
              Skip first row (report name / header)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="skip-last"
              checked={skipLastRow}
              onCheckedChange={(checked) => onSkipLastRowChange(!!checked)}
            />
            <Label htmlFor="skip-last" className="text-sm cursor-pointer">
              Skip last row (totals / result)
            </Label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-[35px]"
        >
          Cancel
        </Button>
        <Button
          onClick={onNext}
          disabled={!file || isLoading}
          className="rounded-[35px]"
        >
          {isLoading ? "Analyzing..." : "Next"}
        </Button>
      </div>
    </div>
  );
};
