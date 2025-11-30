import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { AssignUserToSpace } from "./AssignUserToSpace";
import { toast } from "sonner";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "analyst" | "client";
}

export const UserList = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "client",
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "analyst":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Users</h2>
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4 rounded-[35px] border-foreground">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{user.full_name}</h3>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[35px] gap-2"
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Assign to Space
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AssignUserToSpace
        userId={selectedUserId}
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
      />
    </>
  );
};
