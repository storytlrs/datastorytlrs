import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Building2, ChevronDown, Check, ArrowLeft } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";

interface Brand {
  id: string;
  name: string;
}

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { brandId } = useParams();
  const { isAdmin } = useUserRole();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (brandId && brands.length > 0) {
      const brand = brands.find((b) => b.id === brandId);
      setCurrentBrand(brand || null);
    }
  }, [brandId, brands]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("spaces")
      .select("id, name")
      .order("name");
    setBrands(data || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBrandChange = (brand: Brand) => {
    navigate(`/brands/${brand.id}`);
  };

  const handleSettingsClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      setIsProfileDialogOpen(true);
    }
  };

  // Check if we're on a brand-related page
  const isOnBrandPage = location.pathname.startsWith("/brands/");
  const isOnAdminPage = location.pathname === "/admin";

  return (
    <nav className="w-full py-4 border-b border-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Logo/Brand */}
        <div className="text-xl font-bold">Story TLRS</div>

        {/* Brand Switcher Dropdown */}
        {isOnBrandPage && brands.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-[35px] gap-2 border-foreground px-6"
              >
                <Building2 className="h-4 w-4" />
                {currentBrand?.name || "Select brand"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              {brands.map((brand) => (
                <DropdownMenuItem
                  key={brand.id}
                  onClick={() => handleBrandChange(brand)}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{brand.name}</span>
                  {brand.id === currentBrand?.id && (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer for non-brand pages */}
        {!isOnBrandPage && <div />}

        {/* Right side: Back + Settings + Logout */}
        <div className="flex items-center gap-2">
          {isOnAdminPage && (
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              size="icon"
              className="rounded-[35px] border-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSettingsClick}
            variant="outline"
            size="icon"
            className="rounded-[35px] border-foreground hover:bg-accent-orange hover:border-accent-orange hover:text-accent-orange-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="icon"
            className="rounded-[35px] border-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </nav>
  );
};

export default MainNavigation;
