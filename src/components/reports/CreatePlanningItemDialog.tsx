import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface CreatePlanningItemDialogProps {
  reportId: string;
  spaceId?: string;
  onSuccess: () => void;
}

// Hardcoded IDs
const CAMPAIGN_ID = "120239465204160120";
const ADSET_ID = "120240321291840120";
const AD_ID = "120240321291850120";

export const CreatePlanningItemDialog = ({ reportId, spaceId, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"campaign" | "adset">("campaign");

  const handleImportCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-meta-campaign", {
        body: {
          reportId,
          campaignId: CAMPAIGN_ID,
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
        `Successfully imported campaign: ${imported?.campaignName || CAMPAIGN_ID} (${imported?.impressions || 0} impressions)`
      );
      
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import campaign data");
    } finally {
      setLoading(false);
    }
  };

  const handleImportAdSet = async () => {
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

  const handleImport = () => {
    if (activeTab === "campaign") {
      handleImportCampaign();
    } else {
      handleImportAdSet();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Import from Meta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data from Meta API</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "campaign" | "adset")}>
          <TabsList className="w-full">
            <TabsTrigger value="campaign" className="flex-1">Campaign</TabsTrigger>
            <TabsTrigger value="adset" className="flex-1">Ad Set & Ad</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaign" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Import campaign-level data into Campaign Meta table:
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Campaign ID:</span>
                <span className="text-sm font-mono">{CAMPAIGN_ID}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This will import aggregated metrics for the entire campaign including reach, impressions, spend, and engagement data.
            </p>
          </TabsContent>
          
          <TabsContent value="adset" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Import ad set and ad level data:
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
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading} className="rounded-[35px]">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${activeTab === "campaign" ? "Campaign" : "Ad Set"}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
