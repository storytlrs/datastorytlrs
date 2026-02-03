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
import { Plus } from "lucide-react";

interface CreatePlanningItemDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const CreatePlanningItemDialog = ({ reportId, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    internal_id: "",
    account_name: "",
    account_id: "",
    adset_id: "",
    adset_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const { error } = await supabase.from("campaign_meta").insert({
        report_id: reportId,
        internal_id: formData.internal_id || null,
        account_name: formData.account_name || null,
        account_id: formData.account_id || null,
        adset_id: formData.adset_id || null,
        adset_name: formData.adset_name || null,
      });

      if (error) throw error;

      toast.success("Campaign meta created successfully");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create campaign meta");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      internal_id: "",
      account_name: "",
      account_id: "",
      adset_id: "",
      adset_name: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Campaign Meta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Campaign Meta</DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-[35px]">
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
