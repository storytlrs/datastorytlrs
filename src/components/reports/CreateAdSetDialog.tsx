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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface CreateAdSetDialogProps {
  spaceId: string;
  campaignId: string;
  onSuccess: () => void;
}

export const CreateAdSetDialog = ({ spaceId, campaignId, onSuccess }: CreateAdSetDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    adset_id: "",
    adset_name: "",
    status: "ACTIVE",
    amount_spent: "",
    impressions: "",
    reach: "",
    clicks: "",
    ctr: "",
    cpm: "",
    cpc: "",
    frequency: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adset_id) {
      toast.error("Ad Set ID is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("brand_ad_sets").insert({
        space_id: spaceId,
        brand_campaign_id: campaignId,
        adset_id: formData.adset_id,
        adset_name: formData.adset_name || null,
        status: formData.status || null,
        amount_spent: formData.amount_spent ? parseFloat(formData.amount_spent) : 0,
        impressions: formData.impressions ? parseInt(formData.impressions) : 0,
        reach: formData.reach ? parseInt(formData.reach) : 0,
        clicks: formData.clicks ? parseInt(formData.clicks) : 0,
        ctr: formData.ctr ? parseFloat(formData.ctr) : 0,
        cpm: formData.cpm ? parseFloat(formData.cpm) : 0,
        cpc: formData.cpc ? parseFloat(formData.cpc) : 0,
        frequency: formData.frequency ? parseFloat(formData.frequency) : 0,
      });

      if (error) throw error;

      toast.success("Ad set created successfully");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create ad set");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      adset_id: "",
      adset_name: "",
      status: "ACTIVE",
      amount_spent: "",
      impressions: "",
      reach: "",
      clicks: "",
      ctr: "",
      cpm: "",
      cpc: "",
      frequency: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Ad Set
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ad Set</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adset_id">Ad Set ID *</Label>
                <Input
                  id="adset_id"
                  value={formData.adset_id}
                  onChange={(e) => setFormData({ ...formData, adset_id: e.target.value })}
                  placeholder="e.g., 120239465204160120"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adset_name">Ad Set Name</Label>
                <Input
                  id="adset_name"
                  value={formData.adset_name}
                  onChange={(e) => setFormData({ ...formData, adset_name: e.target.value })}
                  placeholder="Ad set name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="DELETED">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount_spent">Spend</Label>
                <Input
                  id="amount_spent"
                  type="number"
                  step="0.01"
                  value={formData.amount_spent}
                  onChange={(e) => setFormData({ ...formData, amount_spent: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  value={formData.impressions}
                  onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reach">Reach</Label>
                <Input
                  id="reach"
                  type="number"
                  value={formData.reach}
                  onChange={(e) => setFormData({ ...formData, reach: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicks">Clicks</Label>
                <Input
                  id="clicks"
                  type="number"
                  value={formData.clicks}
                  onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctr">CTR %</Label>
                <Input
                  id="ctr"
                  type="number"
                  step="0.01"
                  value={formData.ctr}
                  onChange={(e) => setFormData({ ...formData, ctr: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Input
                  id="frequency"
                  type="number"
                  step="0.01"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-[35px]">
              {loading ? "Creating..." : "Create Ad Set"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
