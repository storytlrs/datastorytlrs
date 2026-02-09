import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditPlanningItemDialogProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditPlanningItemDialog = ({ item, open, onOpenChange, onSuccess }: EditPlanningItemDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: "",
    campaign_id: "",
    objective: "",
    status: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        campaign_name: item.campaign_name || "",
        campaign_id: item.campaign_id || "",
        objective: item.objective || "",
        status: item.status || "",
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { error } = await supabase.from("brand_campaigns").update({
        campaign_name: formData.campaign_name || null,
        campaign_id: formData.campaign_id,
        objective: formData.objective || null,
        status: formData.status || null,
      }).eq("id", item.id);

      if (error) throw error;

      toast.success("Campaign meta updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to update campaign meta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Campaign Meta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign_name">Campaign Name</Label>
              <Input
                id="campaign_name"
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                placeholder="e.g., Brand Awareness Q1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign_id">Campaign ID</Label>
              <Input
                id="campaign_id"
                value={formData.campaign_id}
                onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                placeholder="e.g., 120239465204160120"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Input
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="e.g., OUTCOME_AWARENESS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                placeholder="e.g., ACTIVE"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-[35px]">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
