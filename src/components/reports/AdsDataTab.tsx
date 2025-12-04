import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateAdCreativeDialog } from "./CreateAdCreativeDialog";
import { EditAdCreativeDialog } from "./EditAdCreativeDialog";
import { CreatePlanningItemDialog } from "./CreatePlanningItemDialog";
import { EditPlanningItemDialog } from "./EditPlanningItemDialog";
import { formatCurrencySimple } from "@/lib/currencyUtils";
import { Upload } from "lucide-react";

interface AdsDataTabProps {
  reportId: string;
  onImportSuccess?: () => void;
}

export const AdsDataTab = ({ reportId, onImportSuccess }: AdsDataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("planning");
  const [planning, setPlanning] = useState<any[]>([]);
  const [adCreatives, setAdCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [editingAdCreative, setEditingAdCreative] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPlanning(), fetchAdCreatives()]);
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

  const fetchAdCreatives = async () => {
    const { data, error } = await supabase
      .from("ad_creatives")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load ad creatives");
      return;
    }
    setAdCreatives(data || []);
  };

  const handleUpdate = async (table: "campaign_planning" | "ad_creatives", id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    if (table === "campaign_planning") await fetchPlanning();
    if (table === "ad_creatives") await fetchAdCreatives();
  };

  const handleDelete = async (table: "campaign_planning" | "ad_creatives", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    if (table === "campaign_planning") await fetchPlanning();
    if (table === "ad_creatives") await fetchAdCreatives();
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
        { value: "budget", label: "Budget" },
        { value: "ad", label: "Ad" },
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

  const adCreativesColumns: ColumnDef[] = [
    { key: "thumbnail_url", label: "Preview", type: "text", width: "80px", editable: false, format: (val: string | null) => val ? "✓" : "-" },
    { key: "name", label: "Name", type: "text", width: "150px", editable: false },
    { key: "platform", label: "Platform", type: "text", width: "100px", editable: false },
    { key: "ad_type", label: "Ad Type", type: "text", width: "100px", editable: false },
    { key: "campaign_name", label: "Campaign", type: "text", width: "150px", editable: false },
    { key: "adset_name", label: "Ad Set", type: "text", width: "150px", editable: false },
    { key: "spend", label: "Spend", type: "number", width: "100px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "impressions", label: "Impressions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "clicks", label: "Clicks", type: "number", width: "80px", editable: false, format: formatNumber },
    { key: "conversions", label: "Conversions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "ctr", label: "CTR %", type: "number", width: "80px", editable: false, format: (val: number) => val ? `${val.toFixed(2)}%` : "-" },
    { key: "roas", label: "ROAS", type: "number", width: "80px", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
    { key: "frequency", label: "Frequency", type: "number", width: "100px", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
  ];

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Ads Campaign Data</h2>
          <p className="text-muted-foreground">
            Manage planning and ad performance data {canEdit ? "(Click rows to edit)" : "(Read-only)"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-[35px] border border-foreground mb-6">
          <TabsTrigger value="planning" className="rounded-[35px]">
            Planning
          </TabsTrigger>
          <TabsTrigger value="ads" className="rounded-[35px]">
            Ads Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Campaign Planning</h3>
            <p className="text-sm text-muted-foreground">
              Budget allocation, objectives, and planned vs actual performance
            </p>
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <CreatePlanningItemDialog reportId={reportId} itemType="ad" onSuccess={fetchPlanning} />
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

        <TabsContent value="ads" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Ads Performance Details</h3>
            <p className="text-sm text-muted-foreground">
              Detailed metrics for each ad creative
            </p>
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <CreateAdCreativeDialog reportId={reportId} onSuccess={fetchAdCreatives} />
            </div>
          )}
          <EditableDataTable
            columns={adCreativesColumns}
            data={adCreatives}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("ad_creatives", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("ad_creatives", id) : undefined}
            onEdit={canEdit ? (item) => setEditingAdCreative(item) : undefined}
            loading={loading}
          />
          {editingAdCreative && (
            <EditAdCreativeDialog
              adCreative={editingAdCreative}
              open={!!editingAdCreative}
              onOpenChange={(open) => !open && setEditingAdCreative(null)}
              onSuccess={fetchAdCreatives}
            />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
