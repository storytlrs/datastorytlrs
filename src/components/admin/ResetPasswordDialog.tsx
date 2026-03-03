import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { KeyRound, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
}

export const ResetPasswordDialog = ({ open, onOpenChange, userId, userEmail }: ResetPasswordDialogProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId, action: "set_password", password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { userId, action: "send_reset" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Reset email sent to ${userEmail}`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[35px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Manage password for {userEmail}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1 gap-2">
              <KeyRound className="h-4 w-4" />
              Set Manually
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSetPassword} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="rounded-[35px] border-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="rounded-[35px] border-foreground"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-[35px]"
                disabled={loading}
              >
                {loading ? "Updating..." : "Set Password"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="email">
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Send a password reset link to <strong>{userEmail}</strong>. The user will receive an email with a link to set a new password.
              </p>
              <Button
                className="w-full rounded-[35px]"
                disabled={loading}
                onClick={handleSendReset}
              >
                {loading ? "Sending..." : "Send Reset Email"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
