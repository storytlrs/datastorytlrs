import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateCreatorDialog } from "./CreateCreatorDialog";
import { EditCreatorDialog } from "./EditCreatorDialog";
import { CreateContentDialog } from "./CreateContentDialog";
import { EditContentDialog } from "./EditContentDialog";
import { CreatePromoCodeDialog } from "./CreatePromoCodeDialog";
import { ImportDataDialog } from "./ImportDataDialog";
import { formatWatchTimeDisplay } from "@/lib/watchTimeUtils";
import { formatCurrencySimple } from "@/lib/currencyUtils";
import { Upload } from "lucide-react";

interface DataTabProps {
  reportId: string;
  onImportSuccess?: () => void;
}

export const DataTab = ({ reportId, onImportSuccess }: DataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("creators");
  const [creators, setCreators] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCreator, setEditingCreator] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCreators(),
        fetchContent(),
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

  const handleUpdate = async (table: "creators" | "content" | "promo_codes", id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    // Refresh the specific dataset
    if (table === "creators") await fetchCreators();
    if (table === "content") await fetchContent();
    if (table === "promo_codes") await fetchPromoCodes();
  };

  const handleDelete = async (table: "creators" | "content" | "promo_codes", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    // Refresh the specific dataset
    if (table === "creators") await fetchCreators();
    if (table === "content") await fetchContent();
    if (table === "promo_codes") await fetchPromoCodes();
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };


  const creatorsColumns: ColumnDef[] = [
    { key: "handle", label: "Handle", type: "text", width: "150px", editable: false },
    { 
      key: "platform", 
      label: "Platform", 
      type: "select", 
      width: "120px",
      editable: false,
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "tiktok", label: "TikTok" },
        { value: "youtube", label: "YouTube" },
        { value: "facebook", label: "Facebook" },
        { value: "twitter", label: "Twitter" },
      ]
    },
    { key: "profile_url", label: "Profile URL", type: "text", width: "200px", editable: false },
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
        { value: "GBP", label: "£ GBP" },
        { value: "PLN", label: "zł PLN" },
      ],
    },
    { key: "posts_count", label: "Posts", type: "number", width: "80px", editable: false },
    { 
      key: "posts_cost", 
      label: "Posts Cost", 
      type: "number", 
      width: "100px", 
      editable: false,
      format: (val: any, row: any) => formatCurrencySimple(val, row.currency)
    },
    { key: "reels_count", label: "Reels", type: "number", width: "80px", editable: false },
    { 
      key: "reels_cost", 
      label: "Reels Cost", 
      type: "number", 
      width: "100px", 
      editable: false,
      format: (val: any, row: any) => formatCurrencySimple(val, row.currency)
    },
    { key: "stories_count", label: "Stories", type: "number", width: "80px", editable: false },
    { 
      key: "stories_cost", 
      label: "Stories Cost", 
      type: "number", 
      width: "100px", 
      editable: false,
      format: (val: any, row: any) => formatCurrencySimple(val, row.currency)
    },
    { key: "avg_reach", label: "Avg Reach", type: "number", width: "110px", editable: false, format: formatNumber },
    { key: "avg_views", label: "Avg Views", type: "number", width: "110px", editable: false, format: formatNumber },
    { key: "avg_engagement_rate", label: "Avg ER %", type: "number", width: "100px", editable: false },
    { 
      key: "total_pieces", 
      label: "Total Pieces", 
      type: "text", 
      width: "100px", 
      editable: false,
      calculated: true,
      format: (val: any, row: any) => (row.posts_count + row.reels_count + row.stories_count).toString()
    },
    { 
      key: "total_cost", 
      label: "Total Cost", 
      type: "text", 
      width: "120px", 
      editable: false,
      calculated: true,
      format: (val: any, row: any) => {
        const total = (row.posts_count * row.posts_cost) + (row.reels_count * row.reels_cost) + (row.stories_count * row.stories_cost);
        return formatCurrencySimple(total, row.currency);
      }
    },
  ];

  const contentColumns: ColumnDef[] = [
    // Preview
    { key: "thumbnail_url", label: "Preview", type: "text", width: "80px", editable: false, format: (val: string | null) => val ? "✓" : "-" },
    // Content Info
    { key: "creators", label: "Creator", type: "text", editable: false, format: (val: any) => val?.handle || "-" },
    { key: "platform", label: "Platform", type: "text", editable: false },
    { key: "content_type", label: "Type", type: "text", editable: false },
    { key: "url", label: "URL", type: "text", editable: false },
    { key: "published_date", label: "Published", type: "date", editable: false },
    // Engagement Metrics
    { key: "reach", label: "Reach", type: "number", editable: false, format: formatNumber },
    // Views = impressions + views (merged)
    { 
      key: "views_combined", 
      label: "Views", 
      type: "number", 
      editable: false, 
      calculated: true,
      format: (val: any, row: any) => formatNumber((row.impressions || 0) + (row.views || 0))
    },
    // 3s View Rate as percentage
    { 
      key: "views_3s", 
      label: "3s View Rate", 
      type: "number", 
      editable: false, 
      format: (val: number | null) => val !== null && val !== undefined ? `${val.toFixed(1)}%` : "-"
    },
    { key: "likes", label: "Likes", type: "number", editable: false, format: formatNumber },
    { key: "comments", label: "Comments", type: "number", editable: false, format: formatNumber },
    { key: "saves", label: "Saves", type: "number", editable: false, format: formatNumber },
    { key: "shares", label: "Shares", type: "number", editable: false, format: formatNumber },
    { key: "reposts", label: "Reposts", type: "number", editable: false, format: formatNumber },
    { key: "sticker_clicks", label: "Sticker Clicks", type: "number", editable: false, format: formatNumber },
    { key: "link_clicks", label: "Link Clicks", type: "number", editable: false, format: formatNumber },
    // Performance
    { key: "watch_time", label: "Watch Time", type: "text", editable: false, format: formatWatchTimeDisplay },
    // Avg Watch Time in seconds
    { 
      key: "avg_watch_time", 
      label: "Avg. Watch Time (s)", 
      type: "number", 
      editable: false, 
      format: (val: number | null) => val !== null && val !== undefined ? val.toString() : "-"
    },
    // TSWB calculated field
    { 
      key: "tswb", 
      label: "TSWB", 
      type: "text", 
      editable: false, 
      calculated: true,
      format: (val: any, row: any) => {
        const watchTime = row.watch_time || 0;
        const likes = row.likes || 0;
        const comments = row.comments || 0;
        const saves = row.saves || 0;
        const shares = row.shares || 0;
        const reposts = row.reposts || 0;
        // TSWB = watch_time + (likes×3 + comments×5 + (saves+shares+reposts)×10)
        const tswbSeconds = watchTime + (likes * 3) + (comments * 5) + ((saves + shares + reposts) * 10);
        return formatWatchTimeDisplay(tswbSeconds);
      }
    },
    { key: "sentiment", label: "Sentiment", type: "text", editable: false },
    { key: "sentiment_summary", label: "Sentiment Summary", type: "text", editable: false, maxWidth: "300px", truncate: true, truncateLines: 3 },
  ];


  const promoColumns: ColumnDef[] = [
    { key: "creators", label: "Creator", type: "text", width: "150px", editable: false, format: (val: any) => val?.handle || "-" },
    { key: "code", label: "Promo Code", type: "text", width: "150px" },
    { key: "clicks", label: "Clicks", type: "number", width: "100px" },
    { key: "purchases", label: "Purchases", type: "number", width: "120px" },
    { key: "revenue", label: "Revenue (Kč)", type: "number", width: "120px", format: (val: number) => val ? formatCurrencySimple(val, "CZK") : "-" },
    { key: "conversion_rate", label: "Conv. Rate %", type: "number", width: "120px" },
  ];

  const handleImportSuccess = () => {
    fetchData();
    onImportSuccess?.();
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Report Data</h2>
          <p className="text-muted-foreground">
            View and edit all data in this report {canEdit ? "(Click cells to edit)" : "(Read-only)"}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            className="rounded-[35px]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-[35px] border border-foreground mb-6">
          <TabsTrigger value="creators" className="rounded-[35px]">
            Creators
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-[35px]">
            Content
          </TabsTrigger>
          <TabsTrigger value="promo" className="rounded-[35px]">
            Promo Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Creators (Campaign Planning)</h3>
            <p className="text-sm text-muted-foreground">
              Planned content deliverables and expected performance. Actual results are tracked in Content tab.
            </p>
          </div>
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
            onEdit={canEdit ? (creator) => setEditingCreator(creator) : undefined}
            loading={loading}
          />
          {editingCreator && (
            <EditCreatorDialog
              creator={editingCreator}
              open={!!editingCreator}
              onOpenChange={(open) => !open && setEditingCreator(null)}
              onSuccess={fetchCreators}
            />
          )}
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
            onEdit={canEdit ? (contentItem) => setEditingContent(contentItem) : undefined}
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

      <ImportDataDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        reportId={reportId}
        onSuccess={handleImportSuccess}
      />
    </Card>
  );
};
