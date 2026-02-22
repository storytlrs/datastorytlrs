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
import { LogOut, User, Building2, ChevronDown, Check, ArrowLeft } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import logoWhite from "@/assets/logo-white.png";

interface Brand {
  id: string;
  name: string;
}

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { brandId, reportId } = useParams();
  const { isAdmin } = useUserRole();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [reportBrandId, setReportBrandId] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  // Fetch brand from report when on report page
  useEffect(() => {
    const fetchReportBrand = async () => {
      if (reportId) {
        const { data } = await supabase
          .from("reports")
          .select("space_id")
          .eq("id", reportId)
          .single();
        setReportBrandId(data?.space_id || null);
      } else {
        setReportBrandId(null);
      }
    };
    fetchReportBrand();
  }, [reportId]);

  // Use brandId from URL or from report
  const activeBrandId = brandId || reportBrandId;

  useEffect(() => {
    if (activeBrandId && brands.length > 0) {
      const brand = brands.find((b) => b.id === activeBrandId);
      setCurrentBrand(brand || null);
    } else {
      setCurrentBrand(null);
    }
  }, [activeBrandId, brands]);

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

  // Show brand picker on all pages except admin
  const isOnAdminPage = location.pathname === "/admin";

  return (
    <nav className="w-full py-4 bg-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Logo/Brand */}
        <img src={logoWhite} alt="Story TLRS" className="h-8" />

        {/* Brand Switcher Dropdown */}
        {!isOnAdminPage && brands.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-[35px] gap-2 border-white text-white hover:bg-white hover:text-foreground px-6"
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

        {/* Spacer when no brand picker */}
        {isOnAdminPage && <div />}

        {/* Right side: Back + Settings + Logout */}
        <div className="flex items-center gap-2">
          {isOnAdminPage && (
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              size="icon"
              className="rounded-[35px] border-white text-white hover:bg-white hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSettingsClick}
            variant="outline"
            size="icon"
            className="rounded-[35px] border-white text-white hover:bg-white hover:text-foreground"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="icon"
            className="rounded-[35px] border-white text-white hover:bg-white hover:text-foreground"
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
