import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
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
    if (!loading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/spaces");
    }
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
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and permissions</p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-[35px] gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>

        <UserList key={refreshTrigger} />
      </div>

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleUserCreated}
      />
    </div>
  );
};

export default Admin;
