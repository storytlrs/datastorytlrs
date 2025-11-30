import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateCreatorDialog } from "./CreateCreatorDialog";
import { CreateContentDialog } from "./CreateContentDialog";
import { CreatePromoCodeDialog } from "./CreatePromoCodeDialog";

interface DataTabProps {
  reportId: string;
}

export const DataTab = ({ reportId }: DataTabProps) => {
  const { canEdit } = useUserRole();
  const [activeTab, setActiveTab] = useState("creators");
  const [creators, setCreators] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
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

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CZK: "Kč",
      PLN: "zł"
    };
    return symbols[curr] || "$";
  };

  const creatorsColumns: ColumnDef[] = [
    { key: "handle", label: "Name", type: "text", width: "150px" },
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
    { key: "profile_url", label: "Profile URL", type: "text", width: "200px" },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      width: "100px",
      options: [
        { value: "USD", label: "$ USD" },
        { value: "EUR", label: "€ EUR" },
        { value: "GBP", label: "£ GBP" },
        { value: "CZK", label: "Kč CZK" },
        { value: "PLN", label: "zł PLN" },
      ],
    },
    { 
      key: "posts", 
      label: "Posts", 
      type: "text", 
      width: "120px", 
      editable: false,
      calculated: true,
      format: (val: any, row: any) => row.posts_count > 0 ? `${row.posts_count} × ${getCurrencySymbol(row.currency)}${row.posts_cost}` : "-"
    },
    { 
      key: "reels", 
      label: "Reels", 
      type: "text", 
      width: "120px", 
      editable: false,
      calculated: true,
      format: (val: any, row: any) => row.reels_count > 0 ? `${row.reels_count} × ${getCurrencySymbol(row.currency)}${row.reels_cost}` : "-"
    },
    { 
      key: "stories", 
      label: "Stories", 
      type: "text", 
      width: "120px", 
      editable: false,
      calculated: true,
      format: (val: any, row: any) => row.stories_count > 0 ? `${row.stories_count} × ${getCurrencySymbol(row.currency)}${row.stories_cost}` : "-"
    },
    { key: "avg_reach", label: "Avg Reach", type: "number", width: "110px", format: formatNumber },
    { key: "avg_views", label: "Avg Views", type: "number", width: "110px", format: formatNumber },
    { key: "avg_engagement_rate", label: "Avg ER %", type: "number", width: "100px" },
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
        return `${getCurrencySymbol(row.currency)}${total.toFixed(2)}`;
      }
    },
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
