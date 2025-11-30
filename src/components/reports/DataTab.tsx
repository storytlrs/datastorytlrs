import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateCreatorDialog } from "./CreateCreatorDialog";
import { CreateContentDialog } from "./CreateContentDialog";
import { CreateKPITargetDialog } from "./CreateKPITargetDialog";
import { CreatePromoCodeDialog } from "./CreatePromoCodeDialog";

interface DataTabProps {
  reportId: string;
}

export const DataTab = ({ reportId }: DataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("creators");
  const [creators, setCreators] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [kpiTargets, setKpiTargets] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCreators(),
        fetchContent(),
        fetchKpiTargets(),
        fetchPromoCodes(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreators = async () => {
    const { data, error } = await supabase
      .from("creators")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load creators");
      return;
    }
    setCreators(data || []);
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

  const fetchKpiTargets = async () => {
    const { data, error } = await supabase
      .from("kpi_targets")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load KPI targets");
      return;
    }
    setKpiTargets(data || []);
  };

  const fetchPromoCodes = async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*, creators(handle)")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load promo codes");
      return;
    }
    setPromoCodes(data || []);
  };

  const handleUpdate = async (table: "creators" | "content" | "kpi_targets" | "promo_codes", id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    // Refresh the specific dataset
    if (table === "creators") await fetchCreators();
    if (table === "content") await fetchContent();
    if (table === "kpi_targets") await fetchKpiTargets();
    if (table === "promo_codes") await fetchPromoCodes();
  };

  const handleDelete = async (table: "creators" | "content" | "kpi_targets" | "promo_codes", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    // Refresh the specific dataset
    if (table === "creators") await fetchCreators();
    if (table === "content") await fetchContent();
    if (table === "kpi_targets") await fetchKpiTargets();
    if (table === "promo_codes") await fetchPromoCodes();
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const creatorsColumns: ColumnDef[] = [
    { key: "handle", label: "Handle", type: "text", width: "200px" },
    { 
      key: "platform", 
      label: "Platform", 
      type: "select", 
      width: "150px",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "tiktok", label: "TikTok" },
        { value: "youtube", label: "YouTube" },
        { value: "facebook", label: "Facebook" },
        { value: "twitter", label: "Twitter" },
      ]
    },
    { key: "followers", label: "Followers", type: "number", width: "120px", format: formatNumber },
    { key: "profile_url", label: "Profile URL", type: "text", width: "250px" },
    { key: "notes", label: "Notes", type: "text" },
  ];

  const contentColumns: ColumnDef[] = [
    { key: "creators", label: "Creator", type: "text", width: "150px", editable: false, format: (val: any) => val?.handle || "-" },
    { 
      key: "platform", 
      label: "Platform", 
      type: "select", 
      width: "120px",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "tiktok", label: "TikTok" },
        { value: "youtube", label: "YouTube" },
        { value: "facebook", label: "Facebook" },
        { value: "twitter", label: "Twitter" },
      ]
    },
    { 
      key: "content_type", 
      label: "Type", 
      type: "select", 
      width: "120px",
      options: [
        { value: "story", label: "Story" },
        { value: "reel", label: "Reel" },
        { value: "post", label: "Post" },
        { value: "video", label: "Video" },
        { value: "short", label: "Short" },
      ]
    },
    { key: "views", label: "Views", type: "number", width: "100px", format: formatNumber },
    { key: "likes", label: "Likes", type: "number", width: "100px", format: formatNumber },
    { key: "comments", label: "Comments", type: "number", width: "100px", format: formatNumber },
    { key: "shares", label: "Shares", type: "number", width: "100px", format: formatNumber },
    { key: "engagement_rate", label: "ER %", type: "number", width: "100px" },
    { key: "url", label: "URL", type: "text", width: "200px" },
  ];

  const kpiColumns: ColumnDef[] = [
    { key: "kpi_name", label: "KPI Name", type: "text", width: "200px" },
    { key: "planned_value", label: "Planned", type: "number", width: "150px" },
    { key: "actual_value", label: "Actual", type: "number", width: "150px" },
    { key: "unit", label: "Unit", type: "text", width: "100px" },
  ];

  const promoColumns: ColumnDef[] = [
    { key: "creators", label: "Creator", type: "text", width: "150px", editable: false, format: (val: any) => val?.handle || "-" },
    { key: "code", label: "Promo Code", type: "text", width: "150px" },
    { key: "clicks", label: "Clicks", type: "number", width: "100px" },
    { key: "purchases", label: "Purchases", type: "number", width: "120px" },
    { key: "revenue", label: "Revenue", type: "number", width: "120px", format: (val: number) => val ? `$${val.toFixed(2)}` : "-" },
    { key: "conversion_rate", label: "Conv. Rate %", type: "number", width: "120px" },
  ];

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Report Data</h2>
        <p className="text-muted-foreground">
          View and edit all data in this report {canEdit ? "(Click cells to edit)" : "(Read-only)"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-[35px] border border-foreground mb-6">
          <TabsTrigger value="creators" className="rounded-[35px]">
            Creators
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-[35px]">
            Content
          </TabsTrigger>
          <TabsTrigger value="kpi" className="rounded-[35px]">
            KPI Targets
          </TabsTrigger>
          <TabsTrigger value="promo" className="rounded-[35px]">
            Promo Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <CreateCreatorDialog reportId={reportId} onSuccess={fetchCreators} />
            </div>
          )}
          <EditableDataTable
            columns={creatorsColumns}
            data={creators}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("creators", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("creators", id) : undefined}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
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
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="kpi" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <CreateKPITargetDialog reportId={reportId} onSuccess={fetchKpiTargets} />
            </div>
          )}
          <EditableDataTable
            columns={kpiColumns}
            data={kpiTargets}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("kpi_targets", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("kpi_targets", id) : undefined}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="promo" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <CreatePromoCodeDialog reportId={reportId} onSuccess={fetchPromoCodes} />
            </div>
          )}
          <EditableDataTable
            columns={promoColumns}
            data={promoCodes}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("promo_codes", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("promo_codes", id) : undefined}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
