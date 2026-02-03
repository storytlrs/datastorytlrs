import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { ColumnSelector } from "./ColumnSelector";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { CreateAdSetDialog } from "./CreateAdSetDialog";
import { EditAdSetDialog } from "./EditAdSetDialog";
import { EditAdDialog } from "./EditAdDialog";
import { formatCurrencySimple } from "@/lib/currencyUtils";

interface AdsDataTabProps {
  reportId: string;
  onImportSuccess?: () => void;
}

export const AdsDataTab = ({ reportId, onImportSuccess }: AdsDataTabProps) => {
  const { canEdit } = useUserRole();
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [editingAdSet, setEditingAdSet] = useState<any>(null);
  const [editingAd, setEditingAd] = useState<any>(null);

  // Column visibility state
  const [visibleAdSetColumns, setVisibleAdSetColumns] = useState<string[]>([
    "ad_name", "platform", "amount_spent", "impressions", "reach", "thruplays", "ctr", "frequency"
  ]);
  const [visibleAdsColumns, setVisibleAdsColumns] = useState<string[]>([
    "ad_name", "platform", "amount_spent", "impressions", "reach", "thruplays", "ctr", "frequency"
  ]);

  useEffect(() => {
    fetchData();
  }, [reportId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAdSets(), fetchAds()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdSets = async () => {
    const { data, error } = await supabase
      .from("ad_sets")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load ad sets");
      return;
    }
    setAdSets(data || []);
  };

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load ads");
      return;
    }
    setAds(data || []);
  };

  // Get unique campaigns for filter
  const campaigns = useMemo(() => {
    const uniqueCampaigns = new Map<string, string>();
    adSets.forEach((adSet) => {
      if (adSet.campaign_id && adSet.campaign_name) {
        uniqueCampaigns.set(adSet.campaign_id, adSet.campaign_name);
      }
    });
    return Array.from(uniqueCampaigns, ([id, name]) => ({ id, name }));
  }, [adSets]);

  // Get account name from first ad set
  const accountName = useMemo(() => {
    const firstWithAccount = adSets.find((adSet) => adSet.campaign_name);
    return firstWithAccount?.campaign_name?.split(" - ")?.[0] || "Account";
  }, [adSets]);

  // Filter data based on selected campaign
  const filteredAdSets = useMemo(() => {
    if (selectedCampaign === "all") return adSets;
    return adSets.filter((adSet) => adSet.campaign_id === selectedCampaign);
  }, [adSets, selectedCampaign]);

  const filteredAds = useMemo(() => {
    if (selectedCampaign === "all") return ads;
    const adSetIds = new Set(filteredAdSets.map((adSet) => adSet.id));
    return ads.filter((ad) => adSetIds.has(ad.ad_set_id));
  }, [ads, filteredAdSets, selectedCampaign]);

  const handleUpdate = async (table: "ad_sets" | "ads", id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;

    if (table === "ad_sets") await fetchAdSets();
    if (table === "ads") await fetchAds();
  };

  const handleDelete = async (table: "ad_sets" | "ads", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;

    if (table === "ad_sets") await fetchAdSets();
    if (table === "ads") await fetchAds();
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // All available columns for Ad Sets
  const allAdSetsColumns: ColumnDef[] = [
    { key: "ad_name", label: "Ad Set Name", type: "text", width: "200px", editable: false },
    { key: "campaign_name", label: "Campaign", type: "text", width: "180px", editable: false },
    { key: "platform", label: "Platform", type: "text", width: "100px", editable: false },
    { key: "amount_spent", label: "Spend", type: "number", width: "100px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "impressions", label: "Impressions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "reach", label: "Reach", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "thruplays", label: "ThruPlays", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "video_3s_plays", label: "3s Views", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "ctr", label: "CTR %", type: "number", width: "80px", editable: false, format: (val: number) => val ? `${val.toFixed(2)}%` : "-" },
    { key: "cpm", label: "CPM", type: "number", width: "80px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "cpc", label: "CPC", type: "number", width: "80px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "frequency", label: "Frequency", type: "number", width: "90px", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
    { key: "link_clicks", label: "Link Clicks", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_reactions", label: "Reactions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_comments", label: "Comments", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_shares", label: "Shares", type: "number", width: "100px", editable: false, format: formatNumber },
  ];

  // All available columns for Ads
  const allAdsColumns: ColumnDef[] = [
    { key: "ad_name", label: "Ad Name", type: "text", width: "200px", editable: false },
    { key: "platform", label: "Platform", type: "text", width: "100px", editable: false },
    { key: "amount_spent", label: "Spend", type: "number", width: "100px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "impressions", label: "Impressions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "reach", label: "Reach", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "thruplays", label: "ThruPlays", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "video_3s_plays", label: "3s Views", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "ctr", label: "CTR %", type: "number", width: "80px", editable: false, format: (val: number) => val ? `${val.toFixed(2)}%` : "-" },
    { key: "cpm", label: "CPM", type: "number", width: "80px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "cpc", label: "CPC", type: "number", width: "80px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "frequency", label: "Frequency", type: "number", width: "90px", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
    { key: "link_clicks", label: "Link Clicks", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_reactions", label: "Reactions", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_comments", label: "Comments", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "post_shares", label: "Shares", type: "number", width: "100px", editable: false, format: formatNumber },
  ];

  // Filter columns based on visibility
  const visibleAdSetColumnDefs = useMemo(() => 
    allAdSetsColumns.filter(col => visibleAdSetColumns.includes(col.key)),
    [visibleAdSetColumns]
  );

  const visibleAdsColumnDefs = useMemo(() => 
    allAdsColumns.filter(col => visibleAdsColumns.includes(col.key)),
    [visibleAdsColumns]
  );

  const toggleAdSetColumn = (columnKey: string) => {
    setVisibleAdSetColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const toggleAdsColumn = (columnKey: string) => {
    setVisibleAdsColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{accountName}</h2>
          <p className="text-muted-foreground">
            Campaign performance data {canEdit ? "(Click rows to edit)" : "(Read-only)"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <CreateAdSetDialog reportId={reportId} onSuccess={fetchAdSets} />
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Ad Sets Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Ad Sets</h3>
            <ColumnSelector
              allColumns={allAdSetsColumns}
              visibleColumns={visibleAdSetColumns}
              onColumnToggle={toggleAdSetColumn}
            />
          </div>
          <EditableDataTable
            columns={visibleAdSetColumnDefs}
            data={filteredAdSets}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("ad_sets", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("ad_sets", id) : undefined}
            onEdit={canEdit ? (item) => setEditingAdSet(item) : undefined}
            loading={loading}
          />
        </div>

        {/* Ads Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Ads</h3>
            <ColumnSelector
              allColumns={allAdsColumns}
              visibleColumns={visibleAdsColumns}
              onColumnToggle={toggleAdsColumn}
            />
          </div>
          <EditableDataTable
            columns={visibleAdsColumnDefs}
            data={filteredAds}
            canEdit={canEdit}
            onUpdate={(id, field, value) => handleUpdate("ads", id, field, value)}
            onDelete={canEdit ? (id) => handleDelete("ads", id) : undefined}
            onEdit={canEdit ? (item) => setEditingAd(item) : undefined}
            loading={loading}
          />
        </div>
      </div>

      {editingAdSet && (
        <EditAdSetDialog
          adSet={editingAdSet}
          open={!!editingAdSet}
          onOpenChange={(open) => !open && setEditingAdSet(null)}
          onSuccess={fetchAdSets}
        />
      )}

      {editingAd && (
        <EditAdDialog
          ad={editingAd}
          open={!!editingAd}
          onOpenChange={(open) => !open && setEditingAd(null)}
          onSuccess={fetchAds}
        />
      )}
    </Card>
  );
};
