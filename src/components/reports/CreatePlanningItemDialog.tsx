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
import { Textarea } from "@/components/ui/textarea";
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

interface CreatePlanningItemDialogProps {
  reportId: string;
  itemType: "ad" | "content";
  onSuccess: () => void;
}

export const CreatePlanningItemDialog = ({ reportId, itemType, onSuccess }: CreatePlanningItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    item_type: itemType === "ad" ? "budget" : "content",
    planned_value: "",
    actual_value: "",
    unit: "",
    currency: "CZK",
    notes: "",
  });

  const itemTypeOptions = itemType === "ad" 
    ? [
        { value: "budget", label: "Budget" },
        { value: "ad", label: "Ad" },
        { value: "objective", label: "Objective" },
      ]
    : [
        { value: "content", label: "Content" },
        { value: "budget", label: "Budget" },
        { value: "objective", label: "Objective" },
      ];

  const unitOptions = [
    { value: "pieces", label: "Pieces" },
    { value: "spend", label: "Spend" },
    { value: "reach", label: "Reach" },
    { value: "impressions", label: "Impressions" },
    { value: "clicks", label: "Clicks" },
    { value: "conversions", label: "Conversions" },
    { value: "engagement", label: "Engagement" },
    { value: "views", label: "Views" },
    { value: "frequency", label: "Frequency" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name || !formData.item_type) {
      toast.error("Item name and type are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("campaign_meta").insert({
        report_id: reportId,
        item_name: formData.item_name,
        item_type: formData.item_type,
        planned_value: formData.planned_value ? parseFloat(formData.planned_value) : null,
        actual_value: formData.actual_value ? parseFloat(formData.actual_value) : null,
        unit: formData.unit || null,
        currency: formData.currency,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Planning item created successfully");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create planning item");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      item_type: itemType === "ad" ? "budget" : "content",
      planned_value: "",
      actual_value: "",
      unit: "",
      currency: "CZK",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Planning Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Planning Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item_name">Item Name *</Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="e.g., Total Budget, Video Ads, Reach Target"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_type">Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value) => setFormData({ ...formData, item_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned_value">Planned Value</Label>
              <Input
                id="planned_value"
                type="number"
                step="0.01"
                value={formData.planned_value}
                onChange={(e) => setFormData({ ...formData, planned_value: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual_value">Actual Value</Label>
              <Input
                id="actual_value"
                type="number"
                step="0.01"
                value={formData.actual_value}
                onChange={(e) => setFormData({ ...formData, actual_value: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CZK">Kč CZK</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="GBP">£ GBP</SelectItem>
                <SelectItem value="PLN">zł PLN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-[35px]">
              {loading ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
