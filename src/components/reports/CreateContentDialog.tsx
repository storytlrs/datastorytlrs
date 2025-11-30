import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const contentSchema = z.object({
  creator_id: z.string().min(1, "Creator is required"),
  platform: z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter"]),
  content_type: z.enum(["story", "reel", "post", "video", "short"]),
  url: z.string().url().optional().or(z.literal("")),
  views: z.number().min(0).optional(),
  likes: z.number().min(0).optional(),
  comments: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
  engagement_rate: z.number().min(0).max(100).optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface CreateContentDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const CreateContentDialog = ({ reportId, onSuccess }: CreateContentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
  });

  const creator_id = watch("creator_id");
  const platform = watch("platform");
  const content_type = watch("content_type");

  useEffect(() => {
    fetchCreators();
  }, [reportId]);

  const fetchCreators = async () => {
    const { data } = await supabase
      .from("creators")
      .select("id, handle, platform")
      .eq("report_id", reportId)
      .order("handle");
    
    setCreators(data || []);
  };

  const onSubmit = async (data: ContentFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("content").insert({
        report_id: reportId,
        creator_id: data.creator_id,
        platform: data.platform,
        content_type: data.content_type,
        url: data.url || null,
        views: data.views || null,
        likes: data.likes || null,
        comments: data.comments || null,
        shares: data.shares || null,
        engagement_rate: data.engagement_rate || null,
      });

      if (error) throw error;

      toast.success("Content added successfully");
      setOpen(false);
      reset();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create content");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[35px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Content</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="engagement_rate">Engagement Rate (%)</Label>
              <Input
                id="engagement_rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("engagement_rate", { valueAsNumber: true })}
                className="rounded-[35px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[35px]">
              {isSubmitting ? "Creating..." : "Create Content"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
