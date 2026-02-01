import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, X, Search } from "lucide-react";
import { AssignUserToBrand } from "./AssignUserToBrand";
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
  brands: { id: string; name: string }[];
}

export const UserList = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [removeBrandDialog, setRemoveBrandDialog] = useState<{
    userId: string;
    brandId: string;
    brandName: string;
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

      const { data: brandUsers, error: brandUsersError } = await supabase
        .from("space_users")
        .select("user_id, space_id, spaces(id, name)");

      if (brandUsersError) throw brandUsersError;

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        const userBrands = brandUsers
          .filter((su) => su.user_id === profile.id && su.spaces)
          .map((su) => ({
            id: (su.spaces as any).id,
            name: (su.spaces as any).name,
          }));

        return {
          ...profile,
          role: userRole?.role || "client",
          brands: userBrands,
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

  const handleRemoveFromBrand = async () => {
    if (!removeBrandDialog) return;

    try {
      const { error } = await supabase
        .from("space_users")
        .delete()
        .eq("user_id", removeBrandDialog.userId)
        .eq("space_id", removeBrandDialog.brandId);

      if (error) throw error;

      toast.success(`User removed from ${removeBrandDialog.brandName}`);
      setRemoveBrandDialog(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error removing user from brand:", error);
      toast.error("Failed to remove user from brand");
    }
  };

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 rounded-[35px] border-foreground h-12"
          />
        </div>

        {/* Table */}
        <div className="border border-foreground rounded-[20px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Brands</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-foreground">
                  <TableCell className="font-medium">{user.full_name || "-"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value as any)}
                    >
                      <SelectTrigger className="w-[120px] h-8 rounded-[35px] border-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.brands.length === 0 ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.brands.map((brand) => (
                          <Badge
                            key={brand.id}
                            variant="outline"
                            className="gap-1 pr-1 rounded-[35px] text-xs"
                          >
                            {brand.name}
                            <button
                              onClick={() =>
                                setRemoveBrandDialog({
                                  userId: user.id,
                                  brandId: brand.id,
                                  brandName: brand.name,
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
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[35px] gap-2"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AssignUserToBrand
        userId={selectedUserId}
        existingBrandIds={
          selectedUserId
            ? users.find((u) => u.id === selectedUserId)?.brands.map((s) => s.id) || []
            : []
        }
        open={!!selectedUserId}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
        onSuccess={fetchUsers}
      />

      <AlertDialog
        open={!!removeBrandDialog}
        onOpenChange={(open) => !open && setRemoveBrandDialog(null)}
      >
        <AlertDialogContent className="rounded-[35px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from brand?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user's access to "{removeBrandDialog?.brandName}". They will no
              longer be able to view reports in this brand.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[35px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[35px]"
              onClick={handleRemoveFromBrand}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
