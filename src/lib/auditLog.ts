import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const logReportAction = async (
  reportId: string,
  actionType: "create" | "update" | "publish" | "unpublish",
  details?: Record<string, Json>
) => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user?.id) return;

    await supabase.from("audit_log").insert([{
      report_id: reportId,
      user_id: session.session.user.id,
      action_type: actionType,
      details: details || null,
    }]);
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};
