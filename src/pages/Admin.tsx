import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { BrandsTab } from "@/components/admin/BrandsTab";

/**
 * Admin Panel - Access controlled by ProtectedRoute wrapper in App.tsx
 * Backend RLS policies enforce all data operations server-side.
 */
const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
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
