import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
}

interface BrandCardProps {
  brand: Brand;
  onUpdate: () => void;
}

export const BrandCard = ({ brand, onUpdate }: BrandCardProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("spaces").delete().eq("id", brand.id);
      if (error) throw error;
      toast.success("Brand deleted successfully");
      onUpdate();
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error("Failed to delete brand");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card
        className="p-6 cursor-pointer transition-all hover:shadow-lg border-foreground rounded-[35px] relative group"
        onClick={() => navigate(`/brands/${brand.id}`)}
      >
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[35px] bg-accent flex items-center justify-center flex-shrink-0">
            {brand.profile_image_url ? (
              <img
                src={brand.profile_image_url}
                alt={brand.name}
                className="w-full h-full object-cover rounded-[35px]"
              />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl mb-2 truncate">{brand.name}</h3>
            {brand.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {brand.description}
              </p>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand "{brand.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will delete the brand including all projects and reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
