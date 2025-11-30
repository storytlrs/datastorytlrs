import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const creatorSchema = z.object({
  handle: z.string().min(1, "Handle is required"),
  platform: z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter"]),
  followers: z.number().min(0).optional(),
  profile_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CreatorFormData = z.infer<typeof creatorSchema>;

interface CreateCreatorDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const CreateCreatorDialog = ({ reportId, onSuccess }: CreateCreatorDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<CreatorFormData>({
    resolver: zodResolver(creatorSchema),
  });

  const platform = watch("platform");

  const onSubmit = async (data: CreatorFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("creators").insert({
        report_id: reportId,
        handle: data.handle,
        platform: data.platform,
        followers: data.followers || null,
        profile_url: data.profile_url || null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast.success("Creator added successfully");
      setOpen(false);
      reset();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create creator");
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
          Add Creator
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Add New Creator</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div>
            <Label htmlFor="followers">Followers</Label>
            <Input
              id="followers"
              type="number"
              placeholder="0"
              {...register("followers", { valueAsNumber: true })}
              className="rounded-[35px]"
            />
            {errors.followers && <p className="text-sm text-destructive mt-1">{errors.followers.message}</p>}
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

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register("notes")}
              className="rounded-[35px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[35px]">
              {isSubmitting ? "Creating..." : "Create Creator"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
