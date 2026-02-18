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
import { ImportMediaPlanDialog } from "./ImportMediaPlanDialog";
import { ColumnSelector } from "./ColumnSelector";
import { formatWatchTimeDisplay } from "@/lib/watchTimeUtils";
import { formatCurrencySimple } from "@/lib/currencyUtils";
import { Upload, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportToExcel";

interface AlwaysOnDataTabProps {
  reportId: string;
  spaceId: string;
  onImportSuccess?: () => void;
}

export const AlwaysOnDataTab = ({ reportId, spaceId, onImportSuccess }: AlwaysOnDataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("planning");
  const [planning, setPlanning] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [importMediaPlanOpen, setImportMediaPlanOpen] = useState(false);
  const [mediaPlanItems, setMediaPlanItems] = useState<any[]>([]);
  const [mediaPlanVisibleColumns, setMediaPlanVisibleColumns] = useState<string[]>([
    "type", "platform", "target_group", "placements", "media_buying_type", "creatives",
    "impressions", "reach", "frequency", "cpm", "budget",
  ]);
  const [mediaPlanColumnOrder, setMediaPlanColumnOrder] = useState<string[]>([
    "type", "platform", "target_group", "placements", "media_buying_type", "creatives",
    "impressions", "reach", "frequency", "cpm", "budget",
  ]);

  useEffect(() => {
    fetchData();
    fetchMediaPlan();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlanning(), fetchContent()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaPlan = async () => {
    const { data, error } = await supabase
      .from("media_plan_items" as any)
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    if (!error && data) setMediaPlanItems(data as any[]);
  };

  const fetchPlanning = async () => {
    const { data, error } = await supabase
      .from("kpi_targets")
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

  const handleUpdate = async (table: string, id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table as any)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    if (table === "kpi_targets") await fetchPlanning();
    if (table === "content") await fetchContent();
    if (table === "media_plan_items") await fetchMediaPlan();
  };

  const handleDelete = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);

    if (error) throw error;

    if (table === "kpi_targets") await fetchPlanning();
    if (table === "content") await fetchContent();
    if (table === "media_plan_items") await fetchMediaPlan();
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

  const mediaPlanColumnsMap: Record<string, ColumnDef> = {
    type: { key: "type", label: "Type", type: "text", width: "150px", editable: false },
    platform: { key: "platform", label: "Platform", type: "text", width: "150px", editable: false },
    target_group: { key: "target_group", label: "Target Group", type: "text", width: "180px", editable: false },
    placements: { key: "placements", label: "Placements", type: "text", width: "180px", editable: false },
    media_buying_type: { key: "media_buying_type", label: "Media Buying / Optimization", type: "text", width: "220px", editable: false },
    creatives: { key: "creatives", label: "Creatives", type: "text", width: "180px", editable: false },
    impressions: { key: "impressions", label: "Impressions", type: "number", editable: false, format: formatNumber },
    reach: { key: "reach", label: "Reach", type: "number", editable: false, format: formatNumber },
    frequency: { key: "frequency", label: "Frequency", type: "number", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
    cpm: { key: "cpm", label: "CPM", type: "number", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    budget: { key: "budget", label: "Budget", type: "number", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
  };

  const orderedMediaPlanColumns = mediaPlanColumnOrder.map(key => mediaPlanColumnsMap[key]).filter(Boolean);
  const filteredMediaPlanColumns = orderedMediaPlanColumns.filter(col => mediaPlanVisibleColumns.includes(col.key));

  const handleMediaPlanColumnToggle = (columnKey: string) => {
    setMediaPlanVisibleColumns(prev =>
      prev.includes(columnKey) ? prev.filter(k => k !== columnKey) : [...prev, columnKey]
    );
  };

  const handleMediaPlanColumnReorder = (fromIndex: number, toIndex: number) => {
    setMediaPlanColumnOrder(prev => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return newOrder;
    });
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Always-on Content Data</h2>
          <p className="text-muted-foreground">
            Manage content planning and performance data {canEdit ? "(Click rows to edit)" : "(Read-only)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setImportMediaPlanOpen(true)}
              className="rounded-[35px]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Media Plan
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const sheets = [
                { name: "Planning", columns: planningColumns, data: planning },
                { name: "Content", columns: contentColumns, data: content },
                { name: "Media Plan", columns: orderedMediaPlanColumns, data: mediaPlanItems },
              ];
              exportToExcel(sheets, "always-on-data");
              toast.success("Data exported to Excel");
            }}
            className="rounded-[35px]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="content">Content Details</TabsTrigger>
          <TabsTrigger value="media_plan">Media Plan</TabsTrigger>
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
              <CreatePlanningItemDialog reportId={reportId} onSuccess={fetchPlanning} />
            </div>
          )}
          <EditableDataTable
            columns={planningColumns}
            data={planning}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("kpi_targets", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("kpi_targets", id) : undefined}
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

        <TabsContent value="media_plan" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Media Plan</h3>
              <p className="text-sm text-muted-foreground">
                Imported media plan data with placements, budgets, and forecasted metrics
              </p>
            </div>
            <ColumnSelector
              allColumns={orderedMediaPlanColumns}
              visibleColumns={mediaPlanVisibleColumns}
              onColumnToggle={handleMediaPlanColumnToggle}
              onReorder={handleMediaPlanColumnReorder}
            />
          </div>
          <EditableDataTable
            columns={filteredMediaPlanColumns}
            data={mediaPlanItems}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("media_plan_items", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("media_plan_items", id) : undefined}
            loading={loading}
          />
          {mediaPlanItems.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No media plan data. Use "Import Media Plan" to upload.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ImportMediaPlanDialog
        open={importMediaPlanOpen}
        onOpenChange={setImportMediaPlanOpen}
        reportId={reportId}
        spaceId={spaceId}
        onSuccess={() => { fetchMediaPlan(); onImportSuccess?.(); }}
      />
    </Card>
  );
};
