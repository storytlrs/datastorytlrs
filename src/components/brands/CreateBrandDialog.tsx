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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = brandSchema.safeParse({ name, description });

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
      setName("");
      setDescription("");
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
