import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const MainNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isBrandsActive = location.pathname.startsWith("/brands");
  const isReportsActive = location.pathname.startsWith("/reports");

  return (
    <nav className="w-full py-4 border-b border-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
        {/* Logo/Brand */}
        <div className="text-xl font-bold">Story TLRS</div>

        {/* Centered Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-[35px] border border-foreground p-1">
          <NavLink
            to="/brands"
            className={cn(
              "px-6 py-2 rounded-[35px] text-sm font-medium transition-colors",
              isBrandsActive
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            )}
          >
            Brands
          </NavLink>
          <NavLink
            to="/reports"
            className={cn(
              "px-6 py-2 rounded-[35px] text-sm font-medium transition-colors",
              isReportsActive
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            )}
          >
            Reports
          </NavLink>
        </div>

        {/* Right side: Admin + Logout */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              size="icon"
              className="rounded-[35px] border-foreground hover:bg-accent-orange hover:border-accent-orange hover:text-accent-orange-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
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
    </nav>
  );
};

export default MainNavigation;
