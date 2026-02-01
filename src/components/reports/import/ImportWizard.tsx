import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadStep } from "./FileUploadStep";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { ImportReviewStep } from "./ImportReviewStep";
import { parseFile, type ParsedFile } from "./fileParser";
import { parseMappingTarget, MAPPING_FIELDS } from "./mappingConfig";

interface ImportWizardProps {
  reportId: string;
  onComplete: (result: ImportResult) => void;
  onCancel: () => void;
}

export interface ImportResult {
  success: boolean;
  rowsImported: number;
  rowsFailed: number;
  errors: string[];
  warnings: string[];
}

type WizardStep = "upload" | "mapping" | "review";

export const ImportWizard = ({ reportId, onComplete, onCancel }: ImportWizardProps) => {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Handle file selection and parse
  const handleFileSelect = useCallback(async (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) {
      setParsedFile(null);
      setMappings({});
    }
  }, []);

  // Parse file and move to mapping step
  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);

      // Initialize mappings with suggestions
      const initialMappings: Record<string, string | null> = {};
      parsed.columns.forEach((column) => {
        initialMappings[column.name] = column.suggestedMapping;
      });
      setMappings(initialMappings);

      setStep("mapping");
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  // Handle mapping change
  const handleMappingChange = useCallback((column: string, value: string | null) => {
    setMappings((prev) => ({
      ...prev,
      [column]: value,
    }));
  }, []);

  // Perform the import
  const handleImport = useCallback(async () => {
    if (!parsedFile) return;

    setIsLoading(true);
    try {
      // Build the import request
      const mappingsList = Object.entries(mappings)
        .filter(([_, target]) => target !== null)
        .map(([sourceColumn, target]) => {
          const parsed = parseMappingTarget(target!);
          return {
            sourceColumn,
            targetTable: parsed!.table,
            targetField: parsed!.field,
          };
        });

      // Get field types for proper value extraction
      const fieldTypes: Record<string, string> = {};
      MAPPING_FIELDS.forEach((field) => {
        fieldTypes[`${field.table}.${field.key}`] = field.type;
      });

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-mapped-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportId,
            fileName: parsedFile.fileName,
            mappings: mappingsList,
            rows: parsedFile.rows,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      const importResult: ImportResult = {
        success: result.success,
        rowsImported: result.rowsImported || 0,
        rowsFailed: result.rowsFailed || 0,
        errors: result.errors || [],
        warnings: result.warnings || [],
      };

      if (importResult.success) {
        toast.success(`Successfully imported ${importResult.rowsImported} rows`);
        if (importResult.warnings.length > 0) {
          toast.warning(`Import completed with ${importResult.warnings.length} warnings`);
        }
      } else {
        toast.error("Import failed");
      }

      onComplete(importResult);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import data");
    } finally {
      setIsLoading(false);
    }
  }, [parsedFile, mappings, reportId, onComplete]);

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: "upload", label: "Upload" },
      { key: "mapping", label: "Map Columns" },
      { key: "review", label: "Review" },
    ];

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : steps.findIndex((st) => st.key === step) > index
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  steps.findIndex((st) => st.key === step) > index
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderStepIndicator()}

      {step === "upload" && (
        <FileUploadStep
          file={file}
          onFileSelect={handleFileSelect}
          onNext={handleAnalyze}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )}

      {step === "mapping" && parsedFile && (
        <ColumnMappingStep
          parsedFile={parsedFile}
          mappings={mappings}
          onMappingChange={handleMappingChange}
          onNext={() => setStep("review")}
          onBack={() => setStep("upload")}
          onCancel={onCancel}
        />
      )}

      {step === "review" && parsedFile && (
        <ImportReviewStep
          parsedFile={parsedFile}
          mappings={mappings}
          onImport={handleImport}
          onBack={() => setStep("mapping")}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
