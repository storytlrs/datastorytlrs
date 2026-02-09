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

interface EditAdDialogProps {
  ad: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditAdDialog = ({ ad, open, onOpenChange, onSuccess }: EditAdDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ad_name: "",
    platform: "instagram" as const,
    amount_spent: "",
    reach: "",
    impressions: "",
    thruplays: "",
    video_3s_plays: "",
    ctr: "",
    cpm: "",
    cpc: "",
    frequency: "",
    link_clicks: "",
    post_reactions: "",
    post_comments: "",
    post_shares: "",
  });

  useEffect(() => {
    if (ad) {
      setFormData({
        ad_name: ad.ad_name || "",
        platform: ad.platform || "instagram",
        amount_spent: ad.amount_spent?.toString() || "",
        reach: ad.reach?.toString() || "",
        impressions: ad.impressions?.toString() || "",
        thruplays: ad.thruplays?.toString() || "",
        video_3s_plays: ad.video_3s_plays?.toString() || "",
        ctr: ad.ctr?.toString() || "",
        cpm: ad.cpm?.toString() || "",
        cpc: ad.cpc?.toString() || "",
        frequency: ad.frequency?.toString() || "",
        link_clicks: ad.link_clicks?.toString() || "",
        post_reactions: ad.post_reactions?.toString() || "",
        post_comments: ad.post_comments?.toString() || "",
        post_shares: ad.post_shares?.toString() || "",
      });
    }
  }, [ad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ad_name) {
      toast.error("Ad name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("brand_ads").update({
        ad_name: formData.ad_name,
        platform: formData.platform,
        amount_spent: formData.amount_spent ? parseFloat(formData.amount_spent) : 0,
        reach: formData.reach ? parseInt(formData.reach) : 0,
        impressions: formData.impressions ? parseInt(formData.impressions) : 0,
        thruplays: formData.thruplays ? parseInt(formData.thruplays) : 0,
        video_3s_plays: formData.video_3s_plays ? parseInt(formData.video_3s_plays) : 0,
        ctr: formData.ctr ? parseFloat(formData.ctr) : 0,
        cpm: formData.cpm ? parseFloat(formData.cpm) : 0,
        cpc: formData.cpc ? parseFloat(formData.cpc) : 0,
        frequency: formData.frequency ? parseFloat(formData.frequency) : 0,
        link_clicks: formData.link_clicks ? parseInt(formData.link_clicks) : 0,
        post_reactions: formData.post_reactions ? parseInt(formData.post_reactions) : 0,
        post_comments: formData.post_comments ? parseInt(formData.post_comments) : 0,
        post_shares: formData.post_shares ? parseInt(formData.post_shares) : 0,
      }).eq("id", ad.id);

      if (error) throw error;

      toast.success("Ad updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to update ad");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ad</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad_name">Ad Name *</Label>
                <Input
                  id="ad_name"
                  value={formData.ad_name}
                  onChange={(e) => setFormData({ ...formData, ad_name: e.target.value })}
                  placeholder="Ad name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
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
            </div>
          </div>

          {/* Metrics */}
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
                <Label htmlFor="thruplays">ThruPlays</Label>
                <Input
                  id="thruplays"
                  type="number"
                  value={formData.thruplays}
                  onChange={(e) => setFormData({ ...formData, thruplays: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_3s_plays">3s Views</Label>
                <Input
                  id="video_3s_plays"
                  type="number"
                  value={formData.video_3s_plays}
                  onChange={(e) => setFormData({ ...formData, video_3s_plays: e.target.value })}
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
                <Label htmlFor="cpm">CPM</Label>
                <Input
                  id="cpm"
                  type="number"
                  step="0.01"
                  value={formData.cpm}
                  onChange={(e) => setFormData({ ...formData, cpm: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpc">CPC</Label>
                <Input
                  id="cpc"
                  type="number"
                  step="0.01"
                  value={formData.cpc}
                  onChange={(e) => setFormData({ ...formData, cpc: e.target.value })}
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

          {/* Engagement */}
          <div className="space-y-4">
            <h3 className="font-semibold">Engagement</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="link_clicks">Link Clicks</Label>
                <Input
                  id="link_clicks"
                  type="number"
                  value={formData.link_clicks}
                  onChange={(e) => setFormData({ ...formData, link_clicks: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_reactions">Reactions</Label>
                <Input
                  id="post_reactions"
                  type="number"
                  value={formData.post_reactions}
                  onChange={(e) => setFormData({ ...formData, post_reactions: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_comments">Comments</Label>
                <Input
                  id="post_comments"
                  type="number"
                  value={formData.post_comments}
                  onChange={(e) => setFormData({ ...formData, post_comments: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post_shares">Shares</Label>
                <Input
                  id="post_shares"
                  type="number"
                  value={formData.post_shares}
                  onChange={(e) => setFormData({ ...formData, post_shares: e.target.value })}
                  placeholder="0"
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
