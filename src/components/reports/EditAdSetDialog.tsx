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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

interface EditAdSetDialogProps {
  adSet: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditAdSetDialog = ({ adSet, open, onOpenChange, onSuccess }: EditAdSetDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    platform: "instagram" as const,
    ad_type: "",
    url: "",
    thumbnail_url: "",
    campaign_name: "",
    adset_name: "",
    spend: "",
    impressions: "",
    clicks: "",
    conversions: "",
    ctr: "",
    roas: "",
    frequency: "",
  });

  useEffect(() => {
    if (adSet) {
      setFormData({
        name: adSet.name || "",
        platform: adSet.platform || "instagram",
        ad_type: adSet.ad_type || "",
        url: adSet.url || "",
        thumbnail_url: adSet.thumbnail_url || "",
        campaign_name: adSet.campaign_name || "",
        adset_name: adSet.adset_name || "",
        spend: adSet.spend?.toString() || "",
        impressions: adSet.impressions?.toString() || "",
        clicks: adSet.clicks?.toString() || "",
        conversions: adSet.conversions?.toString() || "",
        ctr: adSet.ctr?.toString() || "",
        roas: adSet.roas?.toString() || "",
        frequency: adSet.frequency?.toString() || "",
      });
    }
  }, [adSet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.platform) {
      toast.error("Name and platform are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("ad_sets").update({
        name: formData.name,
        platform: formData.platform,
        ad_type: formData.ad_type || null,
        url: formData.url || null,
        thumbnail_url: formData.thumbnail_url || null,
        campaign_name: formData.campaign_name || null,
        adset_name: formData.adset_name || null,
        spend: formData.spend ? parseFloat(formData.spend) : 0,
        impressions: formData.impressions ? parseInt(formData.impressions) : 0,
        clicks: formData.clicks ? parseInt(formData.clicks) : 0,
        conversions: formData.conversions ? parseInt(formData.conversions) : 0,
        ctr: formData.ctr ? parseFloat(formData.ctr) : 0,
        roas: formData.roas ? parseFloat(formData.roas) : 0,
        frequency: formData.frequency ? parseFloat(formData.frequency) : 0,
      }).eq("id", adSet.id);

      if (error) throw error;

      toast.success("Ad set updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to update ad set");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ad Set</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ad set name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value: any) => setFormData({ ...formData, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad_type">Ad Type</Label>
                <Select
                  value={formData.ad_type}
                  onValueChange={(value) => setFormData({ ...formData, ad_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="ugc">UGC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Campaign Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign_name">Campaign Name</Label>
                <Input
                  id="campaign_name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="Campaign name"
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
            </div>
          </div>

          {/* Thumbnail */}
          <div className="space-y-4">
            <h3 className="font-semibold">Thumbnail</h3>
            <ImageUpload
              value={formData.thumbnail_url}
              onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
              bucket="content-thumbnails"
              folder="ad-creatives"
            />
          </div>

          {/* Metrics */}
          <div className="space-y-4">
            <h3 className="font-semibold">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spend">Spend</Label>
                <Input
                  id="spend"
                  type="number"
                  step="0.01"
                  value={formData.spend}
                  onChange={(e) => setFormData({ ...formData, spend: e.target.value })}
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
                <Label htmlFor="conversions">Conversions</Label>
                <Input
                  id="conversions"
                  type="number"
                  value={formData.conversions}
                  onChange={(e) => setFormData({ ...formData, conversions: e.target.value })}
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
                <Label htmlFor="roas">ROAS</Label>
                <Input
                  id="roas"
                  type="number"
                  step="0.01"
                  value={formData.roas}
                  onChange={(e) => setFormData({ ...formData, roas: e.target.value })}
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
