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
    internal_id: "",
    account_name: "",
    account_id: "",
    adset_id: "",
    adset_name: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        internal_id: item.internal_id || "",
        account_name: item.account_name || "",
        account_id: item.account_id || "",
        adset_id: item.adset_id || "",
        adset_name: item.adset_name || "",
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { error } = await supabase.from("campaign_meta").update({
        internal_id: formData.internal_id || null,
        account_name: formData.account_name || null,
        account_id: formData.account_id || null,
        adset_id: formData.adset_id || null,
        adset_name: formData.adset_name || null,
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
          <div className="space-y-2">
            <Label htmlFor="internal_id">Internal ID</Label>
            <Input
              id="internal_id"
              value={formData.internal_id}
              onChange={(e) => setFormData({ ...formData, internal_id: e.target.value })}
              placeholder="e.g., CAMP-001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., Brand CZ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_id">Account ID</Label>
              <Input
                id="account_id"
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                placeholder="e.g., 123456789"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adset_id">Ad Set ID</Label>
              <Input
                id="adset_id"
                value={formData.adset_id}
                onChange={(e) => setFormData({ ...formData, adset_id: e.target.value })}
                placeholder="e.g., 987654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adset_name">Ad Set Name</Label>
              <Input
                id="adset_name"
                value={formData.adset_name}
                onChange={(e) => setFormData({ ...formData, adset_name: e.target.value })}
                placeholder="e.g., Awareness Campaign"
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
