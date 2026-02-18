import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportWizard, type ImportResult } from "./import/ImportWizard";

interface ImportMediaPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  spaceId: string;
  onSuccess: () => void;
}

export const ImportMediaPlanDialog = ({ open, onOpenChange, reportId, spaceId, onSuccess }: ImportMediaPlanDialogProps) => {
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleComplete = (importResult: ImportResult) => {
    setResult(importResult);
    if (importResult.success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[35px] border-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Import Media Plan</DialogTitle>
          <DialogDescription>
            Upload an XLSX file with your media plan. You can select a specific sheet and map columns to import.
          </DialogDescription>
        </DialogHeader>

        <ImportWizard
          reportId={reportId}
          spaceId={spaceId}
          onComplete={handleComplete}
          onCancel={handleClose}
          showSheetSelector
        />
      </DialogContent>
    </Dialog>
  );
};
