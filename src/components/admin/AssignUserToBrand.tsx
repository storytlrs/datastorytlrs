import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
}

interface AssignUserToBrandProps {
  userId: string | null;
  existingBrandIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AssignUserToBrand = ({ 
  userId, 
  existingBrandIds, 
  open, 
  onOpenChange,
  onSuccess 
}: AssignUserToBrandProps) => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBrands();
    }
  }, [open]);

  useEffect(() => {
    const filtered = brands.filter((brand) => !existingBrandIds.includes(brand.id));
    setAvailableBrands(filtered);
    setSelectedBrandId("");
  }, [brands, existingBrandIds]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
    }
  };

  const handleAssign = async () => {
    if (!userId || !selectedBrandId) {
      toast.error("Please select a brand");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("space_users")
        .insert({ user_id: userId, space_id: selectedBrandId });

      if (error) {
        if (error.code === "23505") {
          toast.error("User is already assigned to this brand");
        } else {
          throw error;
        }
        return;
      }

      toast.success("User assigned to brand successfully");
      setSelectedBrandId("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error assigning user to brand:", error);
      toast.error(error?.message || "Failed to assign user to brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Assign User to Brand</DialogTitle>
          <DialogDescription>
            Select a brand to grant this user access to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {availableBrands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This user already has access to all brands.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="rounded-[35px] border-foreground">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              disabled={loading || !selectedBrandId || availableBrands.length === 0}
            >
              {loading ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
