import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { secondsToWatchTime, watchTimeToSeconds } from "@/lib/watchTimeUtils";

const contentSchema = z.object({
  creator_id: z.string().min(1, "Creator is required"),
  platform: z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter"]),
  content_type: z.enum(["story", "reel", "post", "video", "short"]),
  url: z.string().url().optional().or(z.literal("")),
  published_date: z.string().optional().or(z.literal("")),
  reach: z.number().min(0).optional(),
  impressions: z.number().min(0).optional(),
  views: z.number().min(0).optional(),
  likes: z.number().min(0).optional(),
  comments: z.number().min(0).optional(),
  saves: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
  sticker_clicks: z.number().min(0).optional(),
  link_clicks: z.number().min(0).optional(),
  watch_time: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  sentiment_summary: z.string().optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface EditContentDialogProps {
  content: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditContentDialog = ({ content, open, onOpenChange, onSuccess }: EditContentDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      creator_id: content.creator_id || "",
      platform: content.platform || "instagram",
      content_type: content.content_type || "post",
      url: content.url || "",
      published_date: content.published_date ? new Date(content.published_date).toISOString().split('T')[0] : "",
      reach: content.reach || 0,
      impressions: content.impressions || 0,
      views: content.views || 0,
      likes: content.likes || 0,
      comments: content.comments || 0,
      saves: content.saves || 0,
      shares: content.shares || 0,
      sticker_clicks: content.sticker_clicks || 0,
      link_clicks: content.link_clicks || 0,
      watch_time: content.watch_time ? secondsToWatchTime(content.watch_time) : "",
      sentiment: content.sentiment || undefined,
      sentiment_summary: content.sentiment_summary || "",
    },
  });

  const creator_id = watch("creator_id");
  const platform = watch("platform");
  const content_type = watch("content_type");
  const sentiment = watch("sentiment");

  useEffect(() => {
    fetchCreators();
  }, [content.report_id]);

  useEffect(() => {
    if (content && open) {
      reset({
        creator_id: content.creator_id || "",
        platform: content.platform || "instagram",
        content_type: content.content_type || "post",
        url: content.url || "",
        published_date: content.published_date ? new Date(content.published_date).toISOString().split('T')[0] : "",
        reach: content.reach || 0,
        impressions: content.impressions || 0,
        views: content.views || 0,
        likes: content.likes || 0,
        comments: content.comments || 0,
        saves: content.saves || 0,
        shares: content.shares || 0,
        sticker_clicks: content.sticker_clicks || 0,
        link_clicks: content.link_clicks || 0,
        watch_time: content.watch_time ? secondsToWatchTime(content.watch_time) : "",
        sentiment: content.sentiment || undefined,
        sentiment_summary: content.sentiment_summary || "",
      });
    }
  }, [content, open, reset]);

  const fetchCreators = async () => {
    const { data } = await supabase
      .from("creators")
      .select("id, handle, platform")
      .eq("report_id", content.report_id)
      .order("handle");
    
    setCreators(data || []);
  };

  const onSubmit = async (data: ContentFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("content")
        .update({
          creator_id: data.creator_id,
          platform: data.platform,
          content_type: data.content_type,
          url: data.url || null,
          published_date: data.published_date || null,
          reach: data.reach || null,
          impressions: data.impressions || null,
          views: data.views || null,
          likes: data.likes || null,
          comments: data.comments || null,
          saves: data.saves || null,
          shares: data.shares || null,
          sticker_clicks: data.sticker_clicks || null,
          link_clicks: data.link_clicks || null,
          watch_time: data.watch_time ? watchTimeToSeconds(data.watch_time) : null,
          sentiment: data.sentiment || null,
          sentiment_summary: data.sentiment_summary || null,
        })
        .eq("id", content.id);

      if (error) throw error;

      toast.success("Content updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to update content");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px] max-h-[90vh] overflow-y-auto max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Content Info Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Content Info</h3>
            
            <div>
              <Label htmlFor="creator_id">Creator *</Label>
              <Select value={creator_id} onValueChange={(value) => setValue("creator_id", value)}>
                <SelectTrigger className="rounded-[35px]">
                  <SelectValue placeholder="Select creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.handle} ({creator.platform})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.creator_id && <p className="text-sm text-destructive mt-1">{errors.creator_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="content_type">Content Type *</Label>
                <Select value={content_type} onValueChange={(value) => setValue("content_type", value as any)}>
                  <SelectTrigger className="rounded-[35px]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
                {errors.content_type && <p className="text-sm text-destructive mt-1">{errors.content_type.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                {...register("url")}
                className="rounded-[35px]"
              />
              {errors.url && <p className="text-sm text-destructive mt-1">{errors.url.message}</p>}
            </div>

            <div>
              <Label htmlFor="published_date">Publication Date</Label>
              <Input
                id="published_date"
                type="date"
                {...register("published_date")}
                className="rounded-[35px]"
              />
            </div>
          </div>

          {/* Engagement Metrics Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Engagement Metrics</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="reach">Reach</Label>
                <Input
                  id="reach"
                  type="number"
                  placeholder="0"
                  {...register("reach", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  placeholder="0"
                  {...register("impressions", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="views">Views</Label>
                <Input
                  id="views"
                  type="number"
                  placeholder="0"
                  {...register("views", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="likes">Likes</Label>
                <Input
                  id="likes"
                  type="number"
                  placeholder="0"
                  {...register("likes", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="comments">Comments</Label>
                <Input
                  id="comments"
                  type="number"
                  placeholder="0"
                  {...register("comments", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="saves">Saves</Label>
                <Input
                  id="saves"
                  type="number"
                  placeholder="0"
                  {...register("saves", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  placeholder="0"
                  {...register("shares", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="sticker_clicks">Sticker Clicks</Label>
                <Input
                  id="sticker_clicks"
                  type="number"
                  placeholder="0"
                  {...register("sticker_clicks", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
              <div>
                <Label htmlFor="link_clicks">Link Clicks</Label>
                <Input
                  id="link_clicks"
                  type="number"
                  placeholder="0"
                  {...register("link_clicks", { valueAsNumber: true })}
                  className="rounded-[35px]"
                />
              </div>
            </div>
          </div>

          {/* Performance Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Performance</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="watch_time">Watch Time</Label>
                <Input
                  id="watch_time"
                  type="text"
                  placeholder="DD:HH:MM:SS"
                  {...register("watch_time")}
                  className="rounded-[35px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: days:hours:minutes:seconds (e.g., 00:01:30:00)
                </p>
              </div>

              <div>
                <Label htmlFor="sentiment">Sentiment</Label>
                <Select value={sentiment} onValueChange={(value) => setValue("sentiment", value as any)}>
                  <SelectTrigger className="rounded-[35px]">
                    <SelectValue placeholder="Select sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="sentiment_summary">Sentiment Summary</Label>
              <Textarea
                id="sentiment_summary"
                placeholder="Brief summary of sentiment analysis..."
                {...register("sentiment_summary")}
                className="rounded-[35px] min-h-[100px]"
              />
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
