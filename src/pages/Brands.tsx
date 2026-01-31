import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { BrandCard } from "@/components/brands/BrandCard";
import { CreateBrandDialog } from "@/components/brands/CreateBrandDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
}

const Brands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { isAdmin } = useUserRole();

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

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Brands</h1>
          <p className="text-muted-foreground">Your client brands</p>
        </div>

        {/* Search and Create */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-[35px] border-foreground h-12"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="rounded-[35px] h-12 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Brand
            </Button>
          )}
        </div>

        {/* Brands Grid */}
        {loading ? (
          <div className="text-center py-12">Loading brands...</div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No brands found" : "No brands yet"}
            </p>
            {!searchQuery && isAdmin && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="rounded-[35px]"
              >
                Create your first brand
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} onUpdate={fetchBrands} />
            ))}
          </div>
        )}
      </div>

      <CreateBrandDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchBrands}
      />
    </div>
  );
};

export default Brands;
