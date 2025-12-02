import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Space {
  id: string;
  name: string;
  description: string | null;
}

interface EditSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: Space;
  onSuccess: () => void;
}

const EditSpaceDialog = ({ open, onOpenChange, space, onSuccess }: EditSpaceDialogProps) => {
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(space.name);
      setDescription(space.description || "");
    }
  }, [open, space]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Space name is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("spaces")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", space.id);

      if (error) throw error;

      toast.success("Space updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update space");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Edit Space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Space name"
              className="rounded-[35px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Space description (optional)"
              className="rounded-[20px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[35px]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-[35px]">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSpaceDialog;
