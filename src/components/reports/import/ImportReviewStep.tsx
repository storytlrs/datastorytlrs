import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileSpreadsheet, Users, Image, Tag } from "lucide-react";
import { getMappingLabel, parseMappingTarget, validateMappings, type TargetTable } from "./mappingConfig";
import type { ParsedFile } from "./fileParser";

interface ImportReviewStepProps {
  parsedFile: ParsedFile;
  mappings: Record<string, string | null>;
  onImport: () => void;
  onBack: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ImportReviewStep = ({
  parsedFile,
  mappings,
  onImport,
  onBack,
  onCancel,
  isLoading,
}: ImportReviewStepProps) => {
  // Group mappings by table
  const groupedMappings = useMemo(() => {
    const groups: Record<TargetTable, Array<{ source: string; target: string }>> = {
      creators: [],
      content: [],
      promo_codes: [],
    };

    Object.entries(mappings).forEach(([source, target]) => {
      if (target) {
        const parsed = parseMappingTarget(target);
        if (parsed) {
          groups[parsed.table].push({
            source,
            target: getMappingLabel(target),
          });
        }
      }
    });

    return groups;
  }, [mappings]);

  // Validation
  const validation = useMemo(() => validateMappings(mappings), [mappings]);

  // Count data to be imported
  const importSummary = useMemo(() => {
    return {
      creators: groupedMappings.creators.length > 0,
      content: groupedMappings.content.length > 0,
      promo_codes: groupedMappings.promo_codes.length > 0,
      totalFields: Object.values(mappings).filter(Boolean).length,
    };
  }, [groupedMappings, mappings]);

  const tableIcons: Record<TargetTable, React.ReactNode> = {
    creators: <Users className="w-5 h-5" />,
    content: <Image className="w-5 h-5" />,
    promo_codes: <Tag className="w-5 h-5" />,
  };

  const tableLabels: Record<TargetTable, string> = {
    creators: "Creators",
    content: "Content",
    promo_codes: "Promo Codes",
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="p-6 bg-muted rounded-[35px] space-y-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <p className="font-bold text-lg">{parsedFile.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {parsedFile.totalRows} rows • {importSummary.totalFields} fields mapped
            </p>
          </div>
        </div>

        {/* Data types being imported */}
        <div className="flex gap-3 flex-wrap">
          {Object.entries(tableLabels).map(([table, label]) => {
            const isActive = groupedMappings[table as TargetTable].length > 0;
            return (
              <div
                key={table}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {tableIcons[table as TargetTable]}
                {label}
                {isActive && (
                  <span className="font-bold">
                    ({groupedMappings[table as TargetTable].length})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mapping Details */}
      {(Object.keys(groupedMappings) as TargetTable[]).map((table) => {
        const tableMappings = groupedMappings[table];
        if (tableMappings.length === 0) return null;

        return (
          <div key={table} className="space-y-2">
            <h4 className="font-bold flex items-center gap-2">
              {tableIcons[table]}
              {tableLabels[table]}
            </h4>
            <div className="space-y-1 pl-7">
              {tableMappings.map(({ source, target }) => (
                <div
                  key={`${source}-${target}`}
                  className="text-sm flex items-center gap-2"
                >
                  <span className="text-muted-foreground">{source}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{target}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Validation */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-bold mb-1">Cannot proceed with import:</p>
            <ul className="list-disc list-inside text-sm">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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

      {validation.valid && (
        <Alert className="border-primary bg-primary/10">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Ready to import! Click the button below to start the import process.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="rounded-[35px]"
        >
          ← Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-[35px]"
          >
            Cancel
          </Button>
          <Button
            onClick={onImport}
            disabled={!validation.valid || isLoading}
            className="rounded-[35px]"
          >
            {isLoading ? "Importing..." : "Import Data"}
          </Button>
        </div>
      </div>
    </div>
  );
};
