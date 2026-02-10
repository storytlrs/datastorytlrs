import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  meta_id: z.string().trim().max(100).optional(),
  tiktok_id: z.string().trim().max(100).optional(),
});

interface CreateBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateBrandDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateBrandDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metaId, setMetaId] = useState("");
  const [tiktokId, setTiktokId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = brandSchema.safeParse({ name, description, meta_id: metaId || undefined, tiktok_id: tiktokId || undefined });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: brand, error: brandError } = await supabase
        .from("spaces")
        .insert({
          name: validation.data.name,
          description: validation.data.description || null,
          meta_id: validation.data.meta_id || null,
          tiktok_id: validation.data.tiktok_id || null,
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Add current user to the brand
      const { error: userError } = await supabase
        .from("space_users")
        .insert({
          space_id: brand.id,
          user_id: user.id,
        });

      if (userError) throw userError;

      toast.success("Brand created successfully");

      // Trigger Meta import if meta_id is set
      if (brand.meta_id) {
        toast.info("Importing data from Meta Ads...");
        supabase.functions
          .invoke("import-brand-meta-data", {
            body: { spaceId: brand.id },
          })
          .then(({ data, error }) => {
            if (error) {
              toast.error("Meta import failed: " + error.message);
            } else if (data?.success) {
              toast.success(
                `Meta import complete: ${data.imported.campaigns} campaigns, ${data.imported.adSets} ad sets, ${data.imported.ads} ads`
              );
            }
          });
      }

      // Trigger TikTok import if tiktok_id is set
      if (brand.tiktok_id) {
        toast.info("Importing data from TikTok Ads...");
        supabase.functions
          .invoke("import-tiktok-ads", {
            body: { spaceId: brand.id },
          })
          .then(({ data, error }) => {
            if (error) {
              toast.error("TikTok import failed: " + error.message);
            } else if (data?.success) {
              toast.success(
                `TikTok import complete: ${data.imported.campaigns} campaigns, ${data.imported.adGroups} ad groups, ${data.imported.ads} ads`
              );
            }
          });
      }

      setName("");
      setDescription("");
      setMetaId("");
      setTiktokId("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Create New Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brand or client name"
              required
              className="rounded-[35px] border-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this brand"
              className="rounded-[35px] border-foreground min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_id">Meta Ad Account ID (Optional)</Label>
            <Input
              id="meta_id"
              value={metaId}
              onChange={(e) => setMetaId(e.target.value)}
              placeholder="e.g. act_123456789"
              className="rounded-[35px] border-foreground"
            />
            <p className="text-xs text-muted-foreground">
              If provided, campaign data will be automatically imported from Meta Ads.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok_id">TikTok Advertiser ID (Optional)</Label>
            <Input
              id="tiktok_id"
              value={tiktokId}
              onChange={(e) => setTiktokId(e.target.value)}
              placeholder="e.g. 7123456789012345678"
              className="rounded-[35px] border-foreground"
            />
            <p className="text-xs text-muted-foreground">
              If provided, campaign data will be automatically imported from TikTok Ads.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full rounded-[35px]"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Brand"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
