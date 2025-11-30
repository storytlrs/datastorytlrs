import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus } from "lucide-react";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserList } from "@/components/admin/UserList";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const Admin = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      if (!loading && !isAdmin) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/spaces");
      }
    };

    checkAuth();
  }, [navigate, isAdmin, loading]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const handleUserCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/spaces")}
              variant="outline"
              size="icon"
              className="rounded-[35px]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-[35px] gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <UserList key={refreshTrigger} />
      </main>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleUserCreated}
      />
    </div>
  );
};

export default Admin;
