import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const creatorSchema = z.object({
  handle: z.string().min(1, "Handle is required"),
  platform: z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter"]),
  profile_url: z.string().url().optional().or(z.literal("")),
  currency: z.enum(["USD", "EUR", "GBP", "CZK", "PLN"]).default("CZK"),
  posts_count: z.number().min(0).default(0),
  posts_cost: z.number().min(0).default(0),
  reels_count: z.number().min(0).default(0),
  reels_cost: z.number().min(0).default(0),
  stories_count: z.number().min(0).default(0),
  stories_cost: z.number().min(0).default(0),
  avg_reach: z.number().min(0).default(0),
  avg_views: z.number().min(0).default(0),
  avg_engagement_rate: z.number().min(0).default(0),
});

type CreatorFormData = z.infer<typeof creatorSchema>;

interface EditCreatorDialogProps {
  creator: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditCreatorDialog = ({ creator, open, onOpenChange, onSuccess }: EditCreatorDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
  });

  useEffect(() => {
    if (creator && open) {
      reset({
        handle: creator.handle || "",
        platform: creator.platform || "instagram",
        profile_url: creator.profile_url || "",
        currency: creator.currency || "CZK",
        posts_count: creator.posts_count || 0,
        posts_cost: creator.posts_cost || 0,
        reels_count: creator.reels_count || 0,
        reels_cost: creator.reels_cost || 0,
        stories_count: creator.stories_count || 0,
        stories_cost: creator.stories_cost || 0,
        avg_reach: creator.avg_reach || 0,
        avg_views: creator.avg_views || 0,
        avg_engagement_rate: creator.avg_engagement_rate || 0,
      });
    }
  }, [creator, open, reset]);

  const platform = watch("platform");
  const currency = watch("currency");
  const postsCount = watch("posts_count");
  const postsCost = watch("posts_cost");
  const reelsCount = watch("reels_count");
  const reelsCost = watch("reels_cost");
  const storiesCount = watch("stories_count");
  const storiesCost = watch("stories_cost");

  const totalPieces = postsCount + reelsCount + storiesCount;
  const totalCost = (postsCount * postsCost) + (reelsCount * reelsCost) + (storiesCount * storiesCost);

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CZK: "Kč",
      PLN: "zł"
    };
    return symbols[curr] || "$";
  };

  const onSubmit = async (data: CreatorFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("creators")
        .update({
          handle: data.handle,
          platform: data.platform,
          profile_url: data.profile_url || null,
          currency: data.currency,
          posts_count: data.posts_count,
          posts_cost: data.posts_cost,
          reels_count: data.reels_count,
          reels_cost: data.reels_cost,
          stories_count: data.stories_count,
          stories_cost: data.stories_cost,
          avg_reach: data.avg_reach,
          avg_views: data.avg_views,
          avg_engagement_rate: data.avg_engagement_rate,
        })
        .eq("id", creator.id);

      if (error) throw error;

      toast.success("Creator updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to update creator");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Edit Creator</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Creator Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">CREATOR INFO</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="handle">Handle *</Label>
                <Input
                  id="handle"
                  placeholder="@username"
                  {...register("handle")}
                  className="rounded-[35px]"
                />
                {errors.handle && <p className="text-sm text-destructive mt-1">{errors.handle.message}</p>}
              </div>
              <div>
                <Label htmlFor="platform">Platform *</Label>
                <Select value={platform} onValueChange={(value) => setValue("platform", value as any)}>
                  <SelectTrigger className="rounded-[35px]">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
                {errors.platform && <p className="text-sm text-destructive mt-1">{errors.platform.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="profile_url">Profile URL</Label>
              <Input
                id="profile_url"
                type="url"
                placeholder="https://..."
                {...register("profile_url")}
                className="rounded-[35px]"
              />
              {errors.profile_url && <p className="text-sm text-destructive mt-1">{errors.profile_url.message}</p>}
            </div>
          </div>

          {/* Section 2: Content Deliverables */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">CONTENT DELIVERABLES</h3>
              <div className="w-32">
                <Label htmlFor="currency" className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={(value) => setValue("currency", value as any)}>
                  <SelectTrigger className="rounded-[35px] h-8 text-xs">
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
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
                <div></div>
                <div className="text-center">Count</div>
                <div className="text-center">Cost per piece</div>
              </div>

              {/* Posts */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label className="text-sm">Posts</Label>
                <Input
                  type="number"
                  {...register("posts_count", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                />
                <Input
                  type="number"
                  {...register("posts_cost", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Reels/Videos */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label className="text-sm">Reels/Videos</Label>
                <Input
                  type="number"
                  {...register("reels_count", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                />
                <Input
                  type="number"
                  {...register("reels_cost", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Stories */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <Label className="text-sm">Stories</Label>
                <Input
                  type="number"
                  {...register("stories_count", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                />
                <Input
                  type="number"
                  {...register("stories_cost", { valueAsNumber: true })}
                  className="rounded-[35px] h-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Expected Performance */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">EXPECTED PERFORMANCE</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="avg_reach">Avg Reach</Label>
                <Input
                  id="avg_reach"
                  type="number"
                  {...register("avg_reach", { valueAsNumber: true })}
                  className="rounded-[35px]"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="avg_views">Avg Views</Label>
                <Input
                  id="avg_views"
                  type="number"
                  {...register("avg_views", { valueAsNumber: true })}
                  className="rounded-[35px]"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="avg_engagement_rate">Avg ER %</Label>
                <Input
                  id="avg_engagement_rate"
                  type="number"
                  {...register("avg_engagement_rate", { valueAsNumber: true })}
                  className="rounded-[35px]"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Summary */}
          <div className="bg-muted p-4 rounded-[35px] border border-border">
            <h3 className="font-semibold text-sm mb-2">SUMMARY</h3>
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Total Pieces: </span>
                <span className="font-medium">{totalPieces}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Cost: </span>
                <span className="font-medium">{getCurrencySymbol(currency)}{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[35px]">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};