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

const spaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSpaceDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateSpaceDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = spaceSchema.safeParse({ name, description });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: space, error: spaceError } = await supabase
        .from("spaces")
        .insert({
          name: validation.data.name,
          description: validation.data.description || null,
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Add current user to the space
      const { error: userError } = await supabase
        .from("space_users")
        .insert({
          space_id: space.id,
          user_id: user.id,
        });

      if (userError) throw userError;

      toast.success("Space created successfully");
      setName("");
      setDescription("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error("Failed to create space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Create New Space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Space Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client or project name"
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
              placeholder="Brief description of this space"
              className="rounded-[35px] border-foreground min-h-[100px]"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-[35px]"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Space"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
