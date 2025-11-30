import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, X } from "lucide-react";
import { AssignUserToSpace } from "./AssignUserToSpace";
import { toast } from "sonner";
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

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "analyst" | "client";
  spaces: { id: string; name: string }[];
}

export const UserList = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [removeSpaceDialog, setRemoveSpaceDialog] = useState<{
    userId: string;
    spaceId: string;
    spaceName: string;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

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

      const { data: spaceUsers, error: spaceUsersError } = await supabase
        .from("space_users")
        .select("user_id, space_id, spaces(id, name)");

      if (spaceUsersError) throw spaceUsersError;

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        const userSpaces = spaceUsers
          .filter((su) => su.user_id === profile.id && su.spaces)
          .map((su) => ({
            id: (su.spaces as any).id,
            name: (su.spaces as any).name,
          }));

        return {
          ...profile,
          role: userRole?.role || "client",
          spaces: userSpaces,
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

  const handleRoleChange = async (userId: string, newRole: "admin" | "analyst" | "client") => {
    if (userId === currentUser && newRole !== "admin") {
      toast.error("You cannot remove your own admin role");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleRemoveFromSpace = async () => {
    if (!removeSpaceDialog) return;

    try {
      const { error } = await supabase
        .from("space_users")
        .delete()
        .eq("user_id", removeSpaceDialog.userId)
        .eq("space_id", removeSpaceDialog.spaceId);

      if (error) throw error;

      toast.success(`User removed from ${removeSpaceDialog.spaceName}`);
      setRemoveSpaceDialog(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error removing user from space:", error);
      toast.error("Failed to remove user from space");
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
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-medium">{user.full_name}</h3>
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

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Select
                    value={user.role}
                    onValueChange={(value) => handleRoleChange(user.id, value as any)}
                  >
                    <SelectTrigger className="w-[140px] h-8 rounded-[35px] border-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Spaces:</span>
                  {user.spaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No spaces assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {user.spaces.map((space) => (
                        <Badge
                          key={space.id}
                          variant="outline"
                          className="gap-1 pr-1 rounded-[35px]"
                        >
                          {space.name}
                          <button
                            onClick={() =>
                              setRemoveSpaceDialog({
                                userId: user.id,
                                spaceId: space.id,
                                spaceName: space.name,
                              })
                            }
                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AssignUserToSpace
        userId={selectedUserId}
        existingSpaceIds={
          selectedUserId
            ? users.find((u) => u.id === selectedUserId)?.spaces.map((s) => s.id) || []
            : []
        }
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={!!removeSpaceDialog}
        onOpenChange={(open) => !open && setRemoveSpaceDialog(null)}
      >
        <AlertDialogContent className="rounded-[35px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from space?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user's access to "{removeSpaceDialog?.spaceName}". They will no
              longer be able to view reports in this space.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[35px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[35px]"
              onClick={handleRemoveFromSpace}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
