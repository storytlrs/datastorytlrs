import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const DashboardRedirect = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleLoading) return;

    const fetchFirstBrand = async () => {
      try {
        const { data: brands, error: brandsError } = await supabase
          .from("spaces")
          .select("id")
          .order("name")
          .limit(1);

        if (brandsError) throw brandsError;

        if (brands && brands.length > 0) {
          navigate(`/brands/${brands[0].id}`, { replace: true });
        } else {
          setError("no_brands");
        }
      } catch (err) {
        console.error("Error fetching brands:", err);
        setError("error");
      }
    };

    fetchFirstBrand();
  }, [navigate, roleLoading]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error === "no_brands") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Brands Assigned</h2>
          <p className="text-muted-foreground mb-4">
            {isAdmin
              ? "Create your first brand in the Admin panel."
              : "Contact your administrator to get access to a brand."}
          </p>
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="px-6 py-2 bg-foreground text-background rounded-[35px] font-medium"
            >
              Go to Admin Panel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
};

export default DashboardRedirect;
