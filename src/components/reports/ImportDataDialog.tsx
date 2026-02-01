import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportWizard, type ImportResult } from "./import/ImportWizard";

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  onSuccess: () => void;
}

export const ImportDataDialog = ({ open, onOpenChange, reportId, onSuccess }: ImportDataDialogProps) => {
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
          <DialogTitle className="text-2xl font-bold">Import Data</DialogTitle>
          <DialogDescription>
            Upload an XLSX, XLS, or CSV file and map columns to import Creators, Content, and Promo Codes
          </DialogDescription>
        </DialogHeader>

        <ImportWizard
          reportId={reportId}
          onComplete={handleComplete}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
};
