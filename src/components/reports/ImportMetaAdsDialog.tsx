import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

interface ImportMetaAdsDialogProps {
  reportId: string;
  onSuccess?: () => void;
}

export const ImportMetaAdsDialog = ({ reportId, onSuccess }: ImportMetaAdsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adAccountId, setAdAccountId] = useState("");
  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");
  const [datePreset, setDatePreset] = useState("last_30d");

  const handleImport = async () => {
    if (!adAccountId.trim()) {
      toast.error("Please enter Ad Account ID");
      return;
    }

    // Ensure ad account ID is in correct format
    const formattedAccountId = adAccountId.startsWith("act_") 
      ? adAccountId 
      : `act_${adAccountId}`;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-meta-ads", {
        body: {
          reportId,
          adAccountId: formattedAccountId,
          platform,
          datePreset,
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
        `Successfully imported ${imported?.adSets || 0} ad sets and ${imported?.ads || 0} ads`
      );
      
      setOpen(false);
      setAdAccountId("");
      onSuccess?.();
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import Meta ads data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-[35px] border-foreground">
          <Download className="w-4 h-4 mr-2" />
          Import from Meta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import from Meta Ads API</DialogTitle>
          <DialogDescription>
            Import ad sets and ads data directly from your Meta (Facebook/Instagram) ad account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="adAccountId">Ad Account ID</Label>
            <Input
              id="adAccountId"
              placeholder="act_123456789 or 123456789"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="rounded-[35px]"
            />
            <p className="text-xs text-muted-foreground">
              Find this in Meta Business Suite under Ad Accounts
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as "facebook" | "instagram")}>
              <SelectTrigger className="rounded-[35px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="datePreset">Date Range</Label>
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="rounded-[35px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7d">Last 7 days</SelectItem>
                <SelectItem value="last_14d">Last 14 days</SelectItem>
                <SelectItem value="last_30d">Last 30 days</SelectItem>
                <SelectItem value="last_90d">Last 90 days</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="this_year">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={loading || !adAccountId.trim()}
            className="rounded-[35px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
