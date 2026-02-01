import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CreateBrandDialog } from "@/components/brands/CreateBrandDialog";
import { format } from "date-fns";
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

interface Brand {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
}

export const BrandsTab = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteBrandDialog, setDeleteBrandDialog] = useState<Brand | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteBrandDialog) return;

    try {
      const { error } = await supabase
        .from("spaces")
        .delete()
        .eq("id", deleteBrandDialog.id);

      if (error) throw error;

      toast.success(`Brand "${deleteBrandDialog.name}" deleted`);
      setDeleteBrandDialog(null);
      fetchBrands();
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      toast.error("Failed to delete brand");
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading brands...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and Create */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-[35px] border-foreground h-12"
            />
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-[35px] h-12 px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Brand
          </Button>
        </div>

        {/* Table */}
        {filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No brands found" : "No brands yet"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="rounded-[35px]"
              >
                Create your first brand
              </Button>
            )}
          </div>
        ) : (
          <div className="border border-foreground rounded-[20px] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-foreground">
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id} className="border-foreground">
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {brand.description || "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(brand.created_at), "d.M.yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-[35px] gap-2"
                          onClick={() => navigate(`/brands/${brand.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteBrandDialog(brand)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreateBrandDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchBrands}
      />

      <AlertDialog
        open={!!deleteBrandDialog}
        onOpenChange={(open) => !open && setDeleteBrandDialog(null)}
      >
        <AlertDialogContent className="rounded-[35px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteBrandDialog?.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[35px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[35px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteBrand}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
