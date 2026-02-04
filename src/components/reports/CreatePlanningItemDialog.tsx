import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface CreatePlanningItemDialogProps {
  reportId: string;
  spaceId?: string;
  onSuccess: () => void;
}

export const CreatePlanningItemDialog = ({ reportId, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState("");

  const handleImport = async () => {
    if (!campaignId.trim()) {
      toast.error("Please enter a Campaign ID");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-meta-campaign-full", {
        body: {
          reportId,
          campaignId,
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
      const errorCount = data?.errors?.length || 0;
      
      toast.success(
        `Imported ${imported?.adSets || 0} ad sets and ${imported?.ads || 0} ads${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
      );
      
      if (data?.errors?.length > 0) {
        console.warn("Import errors:", data.errors);
      }
      
      setOpen(false);
      setCampaignId("");
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import campaign data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Campaign from Meta</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Automatically import all ad sets and ads from a Meta campaign:
          </p>
          <div className="space-y-2">
            <Label htmlFor="campaignId">Campaign ID</Label>
            <Input
              id="campaignId"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="e.g., 120239465204160120"
              className="font-mono text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This will fetch all ad sets from the campaign, then all ads from each ad set, and import their metrics automatically.
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || !campaignId.trim()} className="rounded-[35px]">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Campaign"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
