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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface CreatePlanningItemDialogProps {
  reportId: string;
  spaceId?: string;
  onSuccess: () => void;
}

// Default IDs
const DEFAULT_CAMPAIGN_ID = "120239465204160120";
const DEFAULT_ADSET_ID = "120239465204180120";
const DEFAULT_AD_ID = "120239465204170120";

export const CreatePlanningItemDialog = ({ reportId, spaceId, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"full" | "campaign" | "adset">("full");
  const [campaignId, setCampaignId] = useState(DEFAULT_CAMPAIGN_ID);
  const [adsetId, setAdsetId] = useState(DEFAULT_ADSET_ID);
  const [adId, setAdId] = useState(DEFAULT_AD_ID);

  const handleImportFullCampaign = async () => {
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
        `Imported ${imported?.adSets || 0} ad sets and ${imported?.ads || 0} ads from campaign${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
      );
      
      if (data?.errors?.length > 0) {
        console.warn("Import errors:", data.errors);
      }
      
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import campaign data");
    } finally {
      setLoading(false);
    }
  };

  const handleImportCampaign = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-meta-campaign", {
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
      toast.success(
        `Successfully imported campaign: ${imported?.campaignName || campaignId} (${imported?.impressions || 0} impressions)`
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
          adsetId,
          adId,
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
        `Successfully imported: ${imported?.adSets || 0} ad sets, ${imported?.ads || 0} ads`
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
    if (activeTab === "full") {
      handleImportFullCampaign();
    } else if (activeTab === "campaign") {
      handleImportCampaign();
    } else {
      handleImportAdSet();
    }
  };

  const getImportButtonText = () => {
    if (loading) return "Importing...";
    switch (activeTab) {
      case "full": return "Import All";
      case "campaign": return "Import Campaign";
      case "adset": return "Import Ad Set";
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
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "full" | "campaign" | "adset")}>
          <TabsList className="w-full">
            <TabsTrigger value="full" className="flex-1">Full Campaign</TabsTrigger>
            <TabsTrigger value="campaign" className="flex-1">Campaign Meta</TabsTrigger>
            <TabsTrigger value="adset" className="flex-1">Single Ad Set</TabsTrigger>
          </TabsList>
          
          <TabsContent value="full" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Automatically import all ad sets and ads from a campaign:
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fullCampaignId">Campaign ID</Label>
                <Input
                  id="fullCampaignId"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  placeholder="e.g., 120239465204160120"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This will fetch all ad sets from the campaign, then all ads from each ad set, and import their metrics automatically.
            </p>
          </TabsContent>
          
          <TabsContent value="campaign" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Import campaign-level data into Campaign Meta table:
            </p>
            <div className="space-y-3">
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
            </div>
            <p className="text-xs text-muted-foreground">
              This will import aggregated metrics for the entire campaign including reach, impressions, spend, and engagement data.
            </p>
          </TabsContent>
          
          <TabsContent value="adset" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Import ad set and ad level data:
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="adsetId">Ad Set ID</Label>
                <Input
                  id="adsetId"
                  value={adsetId}
                  onChange={(e) => setAdsetId(e.target.value)}
                  placeholder="e.g., 120239465204180120"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adId">Ad ID</Label>
                <Input
                  id="adId"
                  value={adId}
                  onChange={(e) => setAdId(e.target.value)}
                  placeholder="e.g., 120239465204170120"
                  className="font-mono text-sm"
                />
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
              getImportButtonText()
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
