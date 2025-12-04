import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateContentDialog } from "./CreateContentDialog";
import { EditContentDialog } from "./EditContentDialog";
import { CreatePlanningItemDialog } from "./CreatePlanningItemDialog";
import { EditPlanningItemDialog } from "./EditPlanningItemDialog";
import { formatWatchTimeDisplay } from "@/lib/watchTimeUtils";
import { Upload } from "lucide-react";

interface AlwaysOnDataTabProps {
  reportId: string;
  onImportSuccess?: () => void;
}

export const AlwaysOnDataTab = ({ reportId, onImportSuccess }: AlwaysOnDataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("planning");
  const [planning, setPlanning] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlanning(), fetchContent()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanning = async () => {
    const { data, error } = await supabase
      .from("campaign_planning")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load planning data");
      return;
    }
    setPlanning(data || []);
  };

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from("content")
      .select("*, creators(handle)")
      .eq("report_id", reportId)
      .order("published_date", { ascending: false });

    if (error) {
      toast.error("Failed to load content");
      return;
    }
    setContent(data || []);
  };

  const handleUpdate = async (table: "campaign_planning" | "content", id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    if (table === "campaign_planning") await fetchPlanning();
    if (table === "content") await fetchContent();
  };

  const handleDelete = async (table: "campaign_planning" | "content", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    if (table === "campaign_planning") await fetchPlanning();
    if (table === "content") await fetchContent();
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const planningColumns: ColumnDef[] = [
    { key: "item_name", label: "Item", type: "text", width: "200px", editable: false },
    { 
      key: "item_type", 
      label: "Type", 
      type: "select", 
      width: "120px",
      editable: false,
      options: [
        { value: "content", label: "Content" },
        { value: "budget", label: "Budget" },
        { value: "objective", label: "Objective" },
      ]
    },
    { key: "planned_value", label: "Planned", type: "number", width: "120px", editable: false },
    { key: "actual_value", label: "Actual", type: "number", width: "120px", editable: false },
    { key: "unit", label: "Unit", type: "text", width: "100px", editable: false },
    { 
      key: "currency", 
      label: "Currency", 
      type: "select", 
      width: "100px",
      editable: false,
      options: [
        { value: "CZK", label: "Kč CZK" },
        { value: "EUR", label: "€ EUR" },
        { value: "USD", label: "$ USD" },
      ]
    },
    { key: "notes", label: "Notes", type: "text", width: "200px", editable: false },
  ];

  const contentColumns: ColumnDef[] = [
    { key: "thumbnail_url", label: "Preview", type: "text", width: "80px", editable: false, format: (val: string | null) => val ? "✓" : "-" },
    { key: "creators", label: "Creator", type: "text", editable: false, format: (val: any) => val?.handle || "-" },
    { key: "platform", label: "Platform", type: "text", editable: false },
    { key: "content_type", label: "Type", type: "text", editable: false },
    { key: "url", label: "URL", type: "text", editable: false },
    { key: "published_date", label: "Published", type: "date", editable: false },
    { key: "reach", label: "Reach", type: "number", editable: false, format: formatNumber },
    { key: "impressions", label: "Impressions", type: "number", editable: false, format: formatNumber },
    { key: "views", label: "Views", type: "number", editable: false, format: formatNumber },
    { key: "likes", label: "Likes", type: "number", editable: false, format: formatNumber },
    { key: "comments", label: "Comments", type: "number", editable: false, format: formatNumber },
    { key: "saves", label: "Saves", type: "number", editable: false, format: formatNumber },
    { key: "shares", label: "Shares", type: "number", editable: false, format: formatNumber },
    { key: "watch_time", label: "Watch Time", type: "text", editable: false, format: formatWatchTimeDisplay },
  ];

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Always-on Content Data</h2>
          <p className="text-muted-foreground">
            Manage content planning and performance data {canEdit ? "(Click rows to edit)" : "(Read-only)"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-[35px] border border-foreground mb-6">
          <TabsTrigger value="planning" className="rounded-[35px]">
            Planning
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-[35px]">
            Content Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Content Planning</h3>
            <p className="text-sm text-muted-foreground">
              Content calendar, frequency targets, and planned vs actual output
            </p>
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <CreatePlanningItemDialog reportId={reportId} itemType="content" onSuccess={fetchPlanning} />
            </div>
          )}
          <EditableDataTable
            columns={planningColumns}
            data={planning}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("campaign_planning", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("campaign_planning", id) : undefined}
            onEdit={canEdit ? (item) => setEditingPlanning(item) : undefined}
            loading={loading}
          />
          {editingPlanning && (
            <EditPlanningItemDialog
              item={editingPlanning}
              open={!!editingPlanning}
              onOpenChange={(open) => !open && setEditingPlanning(null)}
              onSuccess={fetchPlanning}
            />
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Content Performance Details</h3>
            <p className="text-sm text-muted-foreground">
              Detailed metrics for each piece of content
            </p>
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <CreateContentDialog reportId={reportId} onSuccess={fetchContent} />
            </div>
          )}
          <EditableDataTable
            columns={contentColumns}
            data={content}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("content", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("content", id) : undefined}
            onEdit={canEdit ? (item) => setEditingContent(item) : undefined}
            loading={loading}
          />
          {editingContent && (
            <EditContentDialog
              content={editingContent}
              open={!!editingContent}
              onOpenChange={(open) => !open && setEditingContent(null)}
              onSuccess={fetchContent}
            />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
