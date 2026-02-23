import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserList } from "@/components/admin/UserList";
import { BrandsTab } from "@/components/admin/BrandsTab";
import { PromptsTab } from "@/components/admin/PromptsTab";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <Button variant="outline" className="rounded-[35px]" onClick={() => setPasswordDialogOpen(true)}>
            <Lock className="h-4 w-4 mr-2" /> Change Password
          </Button>
        </div>
        <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="prompts">Prompty</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserList />
          </TabsContent>

          <TabsContent value="brands">
            <BrandsTab />
          </TabsContent>

          <TabsContent value="prompts">
            <PromptsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
