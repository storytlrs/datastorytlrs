import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface CreatePlanningItemDialogProps {
  reportId: string;
  spaceId?: string;
  onSuccess: () => void;
}

// Hardcoded for now - specific adset and ad IDs
const ADSET_ID = "120240321291840120";
const AD_ID = "120240321291850120";

export const CreatePlanningItemDialog = ({ reportId, spaceId, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImportFromMeta = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-meta-adset", {
        body: {
          reportId,
          adsetId: ADSET_ID,
          adId: AD_ID,
          platform: "facebook",
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const imported = data?.imported;
      toast.success(
        `Successfully imported: ${imported?.campaignMeta || 0} campaign meta, ${imported?.adSets || 0} ad sets`
      );
      
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import Meta data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Campaign Meta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Campaign Meta from Meta API</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            This will import campaign metadata and ad set data from Meta API for:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Ad Set ID:</span>
              <span className="text-sm font-mono">{ADSET_ID}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Ad ID:</span>
              <span className="text-sm font-mono">{AD_ID}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Data will be fetched with date_preset=maximum and all metrics will be calculated automatically.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
            Cancel
          </Button>
          <Button onClick={handleImportFromMeta} disabled={loading} className="rounded-[35px]">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import from Meta"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
