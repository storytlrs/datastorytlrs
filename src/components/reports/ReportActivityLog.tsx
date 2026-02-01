import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  action_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface ReportActivityLogProps {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportActivityLog = ({
  reportId,
  open,
  onOpenChange,
}: ReportActivityLogProps) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEntries();
    }
  }, [open, reportId]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      // First fetch audit log entries
      const { data: auditData, error: auditError } = await supabase
        .from("audit_log")
        .select("id, action_type, details, created_at, user_id")
        .eq("report_id", reportId)
        .order("created_at", { ascending: false });

      if (auditError) throw auditError;

      if (!auditData || auditData.length === 0) {
        setEntries([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(auditData.map((e) => e.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      const formattedEntries: AuditLogEntry[] = auditData.map((entry) => {
        const profile = profilesMap.get(entry.user_id);
        return {
          id: entry.id,
          action_type: entry.action_type,
          details: entry.details as Record<string, unknown> | null,
          created_at: entry.created_at,
          user: {
            full_name: profile?.full_name || null,
            email: profile?.email || "Unknown",
            avatar_url: profile?.avatar_url || null,
          },
        };
      });

      setEntries(formattedEntries);
    } catch (error) {
      console.error("Failed to fetch audit log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "import":
        return "Import";
      case "create":
        return "Created";
      case "update":
        return "Updated";
      case "publish":
        return "Published";
      case "unpublish":
        return "Unpublished";
      default:
        return actionType.charAt(0).toUpperCase() + actionType.slice(1);
    }
  };

  const getActionDescription = (
    actionType: string,
    details: Record<string, unknown> | null
  ) => {
    if (!details) return null;

    switch (actionType) {
      case "import":
        const rowsImported = details.rows_imported as number | undefined;
        const fileName = details.file_name as string | undefined;
        if (rowsImported && fileName) {
          return `Imported ${rowsImported} rows from ${fileName}`;
        }
        if (rowsImported) {
          return `Imported ${rowsImported} rows`;
        }
        return null;
      case "create":
        return "Created report";
      case "update":
        return "Updated report settings";
      case "publish":
        return "Published report";
      case "unpublish":
        return "Unpublished report";
      default:
        return null;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Activity Log</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-foreground mt-2" />
                    <div className="w-px flex-1 bg-border mt-2" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {getActionLabel(entry.action_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={entry.user.avatar_url || undefined}
                          alt={entry.user.full_name || entry.user.email}
                        />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(entry.user.full_name, entry.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{entry.user.full_name || entry.user.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {getActionDescription(entry.action_type, entry.details) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {getActionDescription(entry.action_type, entry.details)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
