import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { BrandsTab } from "@/components/admin/BrandsTab";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const navigate = useNavigate();
  const { isAdmin, loading } = useUserRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
  }, [navigate, isAdmin, loading]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 rounded-[35px] border border-foreground p-1 bg-transparent w-auto inline-flex">
            <TabsTrigger
              value="users"
              className="rounded-[35px] px-6 py-2 text-foreground data-[state=active]:bg-accent-orange data-[state=active]:text-accent-orange-foreground"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="brands"
              className="rounded-[35px] px-6 py-2 text-foreground data-[state=active]:bg-accent-orange data-[state=active]:text-accent-orange-foreground"
            >
              Brands
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserList />
          </TabsContent>

          <TabsContent value="brands">
            <BrandsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
