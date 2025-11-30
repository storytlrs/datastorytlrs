import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Space {
  id: string;
  name: string;
}

interface AssignUserToSpaceProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssignUserToSpace = ({ userId, open, onOpenChange }: AssignUserToSpaceProps) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSpaces();
    }
  }, [open]);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSpaces(data || []);
    } catch (error: any) {
      console.error("Error fetching spaces:", error);
      toast.error("Failed to load spaces");
    }
  };

  const handleAssign = async () => {
    if (!userId || !selectedSpaceId) {
      toast.error("Please select a space");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("space_users")
        .insert({ user_id: userId, space_id: selectedSpaceId });

      if (error) {
        if (error.code === "23505") {
          toast.error("User is already assigned to this space");
        } else {
          throw error;
        }
        return;
      }

      toast.success("User assigned to space successfully");
      setSelectedSpaceId("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error assigning user to space:", error);
      toast.error(error?.message || "Failed to assign user to space");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Assign User to Space</DialogTitle>
          <DialogDescription>
            Select a space to grant this user access to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space">Space</Label>
            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
              <SelectTrigger className="rounded-[35px] border-foreground">
                <SelectValue placeholder="Select a space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-[35px]"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              className="flex-1 rounded-[35px]"
              disabled={loading || !selectedSpaceId}
            >
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
