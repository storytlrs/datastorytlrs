import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, RefreshCw, Download, Upload } from "lucide-react";
import { exportToExcel } from "@/lib/exportToExcel";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { EditableDataTable, ColumnDef } from "./EditableDataTable";
import { ColumnSelector } from "./ColumnSelector";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { EditAdSetDialog } from "./EditAdSetDialog";
import { EditAdDialog } from "./EditAdDialog";
import { EditPlanningItemDialog } from "./EditPlanningItemDialog";
import { CreatePlanningItemDialog } from "./CreatePlanningItemDialog";
import { ImportMediaPlanDialog } from "./ImportMediaPlanDialog";
import { formatCurrencySimple } from "@/lib/currencyUtils";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdsDataTabProps {
  reportId: string;
  spaceId: string;
  onImportSuccess?: () => void;
  embedded?: boolean;
}

export const AdsDataTab = ({ reportId, spaceId, onImportSuccess, embedded = false }: AdsDataTabProps) => {
  const { canEdit } = useUserRole();
  const [campaignMeta, setCampaignMeta] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hierarchical selection state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  
  // Search/popover state
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [adSetOpen, setAdSetOpen] = useState(false);
  const [adOpen, setAdOpen] = useState(false);
  
  // Edit dialogs
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [editingAdSet, setEditingAdSet] = useState<any>(null);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [fetchingThumbnails, setFetchingThumbnails] = useState(false);
  const [syncingMetaData, setSyncingMetaData] = useState(false);
  const [importMediaPlanOpen, setImportMediaPlanOpen] = useState(false);
  const [mediaPlanItems, setMediaPlanItems] = useState<any[]>([]);

  const handleSyncMetaData = async () => {
    setSyncingMetaData(true);
    try {
      const response = await supabase.functions.invoke("import-brand-meta-data", {
        body: { spaceId, reportId },
      });
      if (response.error) throw response.error;
      const result = response.data;
      if (result?.success) {
        const { campaigns = 0, adSets = 0, ads = 0 } = result.imported || {};
        toast.success(`Synced: ${campaigns} campaigns, ${adSets} ad sets, ${ads} ads`);
        fetchData();
      } else {
        toast.error(result?.error || "Sync failed");
      }
      if (result?.errors?.length > 0) {
        console.warn("Sync errors:", result.errors);
      }
    } catch (error) {
      console.error("Sync Meta data error:", error);
      toast.error("Failed to sync Meta data");
    } finally {
      setSyncingMetaData(false);
    }
  };

  // Column visibility & order state — persisted in localStorage
  const adsStorageKey = (tab: string, type: string) => `adsDataTab_${reportId}_${tab}_${type}`;

  const loadAdsStorage = (tab: string, type: string, fallback: string[]): string[] => {
    try {
      const stored = localStorage.getItem(adsStorageKey(tab, type));
      if (stored) return JSON.parse(stored);
    } catch {}
    return fallback;
  };

  const defaultCampaignVisible = ["campaign_name", "platform", "amount_spent", "impressions", "reach", "thruplays", "ctr", "frequency"];
  const defaultAdSetVisible = ["thumbnail_url", "ad_name", "platform", "amount_spent", "impressions", "reach", "thruplays", "ctr", "frequency"];
  const defaultAdsVisible = ["thumbnail_url", "ad_name", "platform", "amount_spent", "impressions", "reach", "thruplays", "ctr", "frequency"];

  const [visibleCampaignColumns, setVisibleCampaignColumns] = useState<string[]>(() => loadAdsStorage("campaigns", "visible", defaultCampaignVisible));
  const [campaignColOrder, setCampaignColOrder] = useState<string[]>([]);
  const [visibleAdSetColumns, setVisibleAdSetColumns] = useState<string[]>(() => loadAdsStorage("adsets", "visible", defaultAdSetVisible));
  const [adSetColOrder, setAdSetColOrder] = useState<string[]>([]);
  const [visibleAdsColumns, setVisibleAdsColumns] = useState<string[]>(() => loadAdsStorage("ads", "visible", defaultAdsVisible));
  const [adsColOrder, setAdsColOrder] = useState<string[]>([]);
  const [mediaPlanColOrder, setMediaPlanColOrder] = useState<string[]>([]);
  const [mediaPlanVisibleCols, setMediaPlanVisibleCols] = useState<string[]>([]);

  const handleFetchThumbnails = async () => {
    setFetchingThumbnails(true);
    try {
      const response = await supabase.functions.invoke("import-brand-meta-data", {
        body: { spaceId, thumbnailsOnly: true },
      });
      if (response.error) throw response.error;
      const result = response.data;
      if (result?.success) {
        toast.success(`Imported ${result.imported?.ads || 0} ads with previews`);
        fetchData();
      } else {
        toast.info("No data imported");
      }
      if (result?.errors?.length > 0) {
        console.warn("Import errors:", result.errors);
      }
    } catch (error) {
      console.error("Fetch thumbnails error:", error);
      toast.error("Failed to fetch ad previews");
    } finally {
      setFetchingThumbnails(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMediaPlan();
  }, [reportId, spaceId]);

  const fetchMediaPlan = async () => {
    const { data, error } = await supabase
      .from("media_plan_items" as any)
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    if (!error && data) setMediaPlanItems(data as any[]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch linked campaign IDs for this report (Meta + TikTok)
      const [metaLinksRes, tiktokLinksRes] = await Promise.all([
        supabase.from("report_campaigns").select("brand_campaign_id").eq("report_id", reportId),
        supabase.from("report_tiktok_campaigns").select("tiktok_campaign_id").eq("report_id", reportId),
      ]);

      const metaLinkedIds = metaLinksRes.data?.map((l) => l.brand_campaign_id) || [];
      const tiktokLinkedIds = tiktokLinksRes.data?.map((l) => l.tiktok_campaign_id) || [];

      await Promise.all([
        fetchCampaignMeta(metaLinkedIds, tiktokLinkedIds),
        fetchAdSets(metaLinkedIds, tiktokLinkedIds),
        fetchAds(metaLinkedIds, tiktokLinkedIds),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignMeta = async (metaIds: string[], tiktokIds: string[]) => {
    let allCampaigns: any[] = [];

    if (metaIds.length > 0) {
      const { data, error } = await supabase
        .from("brand_campaigns" as any)
        .select("*")
        .eq("space_id", spaceId)
        .in("id", metaIds)
        .order("created_at", { ascending: false });
      if (!error && data) {
        allCampaigns.push(...data.map((c: any) => ({ ...c, platform: "meta" })));
      }
    }

    if (tiktokIds.length > 0) {
      const { data, error } = await supabase
        .from("tiktok_campaigns")
        .select("*")
        .eq("space_id", spaceId)
        .in("id", tiktokIds)
        .eq("age", "").eq("gender", "").eq("location", "")
        .order("created_at", { ascending: false });
      if (!error && data) {
        allCampaigns.push(...data.map((c: any) => ({
          ...c,
          campaign_name: c.campaign_name ? `[TikTok] ${c.campaign_name}` : c.campaign_name,
          platform: "tiktok",
          thruplays: c.video_views_p100,
          video_3s_plays: c.video_watched_2s,
          link_clicks: c.clicks,
          post_reactions: c.likes,
          post_comments: c.comments,
          post_shares: c.shares,
        })));
      }
    }

    setCampaignMeta(allCampaigns);
  };

  const fetchAdSets = async (metaIds: string[], tiktokIds: string[]) => {
    let allAdSets: any[] = [];

    if (metaIds.length > 0) {
      const { data, error } = await supabase
        .from("brand_ad_sets" as any)
        .select("*")
        .eq("space_id", spaceId)
        .in("brand_campaign_id", metaIds)
        .order("created_at", { ascending: false });
      if (!error && data) {
        allAdSets.push(...data.map((as: any) => ({ ...as, platform: "meta" })));
      }
    }

    if (tiktokIds.length > 0) {
      const { data, error } = await supabase
        .from("tiktok_ad_groups")
        .select("*")
        .eq("space_id", spaceId)
        .in("tiktok_campaign_id", tiktokIds)
        .order("created_at", { ascending: false });
      if (!error && data) {
        allAdSets.push(...data.map((ag: any) => ({
          id: ag.id,
          brand_campaign_id: ag.tiktok_campaign_id,
          adset_name: ag.adgroup_name ? `[TikTok] ${ag.adgroup_name}` : ag.adgroup_name,
          adset_id: ag.adgroup_id,
          status: ag.status,
          amount_spent: ag.amount_spent,
          reach: ag.reach,
          impressions: ag.impressions,
          frequency: ag.frequency,
          ctr: ag.ctr,
          cpm: ag.cpm,
          cpc: ag.cpc,
          clicks: ag.clicks,
          thruplays: ag.video_views_p100,
          video_3s_plays: ag.video_watched_2s,
          post_reactions: ag.likes,
          post_comments: ag.comments,
          post_shares: ag.shares,
          platform: "tiktok",
          space_id: ag.space_id,
          created_at: ag.created_at,
          updated_at: ag.updated_at,
        })));
      }
    }

    setAdSets(allAdSets);
  };

  const fetchAds = async (metaIds: string[], tiktokIds: string[]) => {
    let allAds: any[] = [];

    if (metaIds.length > 0) {
      const { data: adSetData } = await supabase
        .from("brand_ad_sets" as any)
        .select("id")
        .eq("space_id", spaceId)
        .in("brand_campaign_id", metaIds);

      const adSetIds = adSetData?.map((as: any) => as.id) || [];
      if (adSetIds.length > 0) {
        const { data, error } = await supabase
          .from("brand_ads" as any)
          .select("*")
          .eq("space_id", spaceId)
          .in("brand_ad_set_id", adSetIds)
          .order("created_at", { ascending: false });
        if (!error && data) {
          allAds.push(...data.map((a: any) => ({ ...a, platform: "meta" })));
        }
      }
    }

    if (tiktokIds.length > 0) {
      const { data: adGroupData } = await supabase
        .from("tiktok_ad_groups")
        .select("id")
        .eq("space_id", spaceId)
        .in("tiktok_campaign_id", tiktokIds);

      const adGroupIds = adGroupData?.map((ag: any) => ag.id) || [];
      if (adGroupIds.length > 0) {
        const { data, error } = await supabase
          .from("tiktok_ads")
          .select("*")
          .eq("space_id", spaceId)
          .in("tiktok_ad_group_id", adGroupIds)
          .order("created_at", { ascending: false });
        if (!error && data) {
          allAds.push(...data.map((a: any) => ({
            id: a.id,
            brand_ad_set_id: a.tiktok_ad_group_id,
            ad_id: a.ad_id,
            ad_name: a.ad_name ? `[TikTok] ${a.ad_name}` : a.ad_name,
            status: a.status,
            amount_spent: a.amount_spent,
            reach: a.reach,
            impressions: a.impressions,
            frequency: a.frequency,
            ctr: a.ctr,
            cpm: a.cpm,
            cpc: a.cpc,
            clicks: a.clicks,
            thruplays: a.video_views_p100,
            video_3s_plays: a.video_watched_2s,
            link_clicks: a.link_clicks,
            post_reactions: a.likes,
            post_comments: a.comments,
            post_shares: a.shares,
            thumbnail_url: a.thumbnail_url,
            platform: "tiktok",
            space_id: a.space_id,
            created_at: a.created_at,
            updated_at: a.updated_at,
          })));
        }
      }
    }

    setAds(allAds);
  };

  // Get unique campaigns from brand_campaigns
  const campaigns = useMemo(() => {
    return campaignMeta.map(cm => ({
      id: cm.id,
      name: cm.campaign_name || "Unnamed Campaign",
      data: cm
    }));
  }, [campaignMeta]);

  // Get ad sets filtered by selected campaign
  const filteredAdSets = useMemo(() => {
    if (!selectedCampaignId) return adSets;
    return adSets.filter(adSet => adSet.brand_campaign_id === selectedCampaignId);
  }, [adSets, selectedCampaignId]);

  // Get ads filtered by selected ad set
  const filteredAds = useMemo(() => {
    if (!selectedAdSetId) {
      if (!selectedCampaignId) return ads;
      const adSetIds = new Set(filteredAdSets.map(as => as.id));
      return ads.filter(ad => adSetIds.has(ad.brand_ad_set_id));
    }
    return ads.filter(ad => ad.brand_ad_set_id === selectedAdSetId);
  }, [ads, selectedAdSetId, selectedCampaignId, filteredAdSets]);

  // Selected items
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedAdSet = adSets.find(as => as.id === selectedAdSetId);
  const selectedAd = ads.find(a => a.id === selectedAdId);

  // Clear selections
  const clearCampaign = () => {
    setSelectedCampaignId(null);
    setSelectedAdSetId(null);
    setSelectedAdId(null);
  };

  const clearAdSet = () => {
    setSelectedAdSetId(null);
    setSelectedAdId(null);
  };

  const clearAd = () => {
    setSelectedAdId(null);
  };

  const handleUpdate = async (table: string, id: string, field: string, value: any) => {
    const { error } = await supabase
      .from(table as any)
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;
    await fetchData();
  };

  const handleDelete = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);

    if (error) throw error;

    if (table === "brand_campaigns" && selectedCampaignId === id) clearCampaign();
    if (table === "brand_ad_sets" && selectedAdSetId === id) clearAdSet();
    if (table === "brand_ads" && selectedAdId === id) clearAd();

    await fetchData();
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Campaign Meta columns
  const allCampaignColumns: ColumnDef[] = [
    { key: "campaign_name", label: "Campaign Name", type: "text", width: "200px", editable: false },
    { key: "account_name", label: "Account", type: "text", width: "150px", editable: false },
    { key: "platform", label: "Platform", type: "text", width: "100px", editable: false },
    { key: "date_start", label: "Start Date", type: "date", width: "120px", editable: false },
    { key: "date_stop", label: "End Date", type: "date", width: "120px", editable: false },
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
    { key: "engagement_rate", label: "ER %", type: "number", width: "80px", editable: false, format: (val: number) => val ? `${val.toFixed(2)}%` : "-" },
  ];

  // Ad Sets columns
  const allAdSetsColumns: ColumnDef[] = [
    { key: "thumbnail_url", label: "Thumbnail", type: "text", width: "80px", editable: false, format: (val: string) => val ? `<img>` : "-", render: (val: string) => val ? <img src={val} alt="" className="w-12 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" /> : <span className="text-muted-foreground">-</span> },
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

  // Ads columns
  const allAdsColumns: ColumnDef[] = [
    { key: "thumbnail_url", label: "Thumbnail", type: "text", width: "80px", editable: false, format: (val: string) => val ? `<img>` : "-", render: (val: string) => val ? <img src={val} alt="" className="w-12 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" /> : <span className="text-muted-foreground">-</span> },
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

  // Media plan columns
  const mediaPlanColumns: ColumnDef[] = [
    { key: "type", label: "Type", type: "text", width: "150px", editable: false },
    { key: "platform", label: "Platform", type: "text", width: "150px", editable: false },
    { key: "target_group", label: "Target Group", type: "text", width: "180px", editable: false },
    { key: "placements", label: "Placements", type: "text", width: "180px", editable: false },
    { key: "media_buying_type", label: "Media Buying / Optimization", type: "text", width: "220px", editable: false },
    { key: "creatives", label: "Creatives", type: "text", width: "180px", editable: false },
    { key: "impressions", label: "Impressions", type: "number", width: "120px", editable: false, format: formatNumber },
    { key: "reach", label: "Reach", type: "number", width: "100px", editable: false, format: formatNumber },
    { key: "frequency", label: "Frequency", type: "number", width: "100px", editable: false, format: (val: number) => val ? val.toFixed(2) : "-" },
    { key: "cpm", label: "CPM", type: "number", width: "100px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
    { key: "budget", label: "Budget", type: "number", width: "120px", editable: false, format: (val: number) => formatCurrencySimple(val, "CZK") },
  ];

  // Initialize column orders from localStorage
  useEffect(() => {
    if (campaignColOrder.length === 0) {
      const defaultKeys = allCampaignColumns.map(c => c.key);
      setCampaignColOrder(loadAdsStorage("campaigns", "order", defaultKeys));
    }
    if (adSetColOrder.length === 0) {
      const defaultKeys = allAdSetsColumns.map(c => c.key);
      setAdSetColOrder(loadAdsStorage("adsets", "order", defaultKeys));
    }
    if (adsColOrder.length === 0) {
      const defaultKeys = allAdsColumns.map(c => c.key);
      setAdsColOrder(loadAdsStorage("ads", "order", defaultKeys));
    }
    if (mediaPlanColOrder.length === 0) {
      const defaultKeys = mediaPlanColumns.map(c => c.key);
      setMediaPlanColOrder(loadAdsStorage("mediaplan", "order", defaultKeys));
      setMediaPlanVisibleCols(loadAdsStorage("mediaplan", "visible", defaultKeys));
    }
  }, []);

  // Persist all column preferences
  useEffect(() => { if (campaignColOrder.length) localStorage.setItem(adsStorageKey("campaigns", "order"), JSON.stringify(campaignColOrder)); }, [campaignColOrder]);
  useEffect(() => { if (visibleCampaignColumns.length) localStorage.setItem(adsStorageKey("campaigns", "visible"), JSON.stringify(visibleCampaignColumns)); }, [visibleCampaignColumns]);
  useEffect(() => { if (adSetColOrder.length) localStorage.setItem(adsStorageKey("adsets", "order"), JSON.stringify(adSetColOrder)); }, [adSetColOrder]);
  useEffect(() => { if (visibleAdSetColumns.length) localStorage.setItem(adsStorageKey("adsets", "visible"), JSON.stringify(visibleAdSetColumns)); }, [visibleAdSetColumns]);
  useEffect(() => { if (adsColOrder.length) localStorage.setItem(adsStorageKey("ads", "order"), JSON.stringify(adsColOrder)); }, [adsColOrder]);
  useEffect(() => { if (visibleAdsColumns.length) localStorage.setItem(adsStorageKey("ads", "visible"), JSON.stringify(visibleAdsColumns)); }, [visibleAdsColumns]);
  useEffect(() => { if (mediaPlanColOrder.length) localStorage.setItem(adsStorageKey("mediaplan", "order"), JSON.stringify(mediaPlanColOrder)); }, [mediaPlanColOrder]);
  useEffect(() => { if (mediaPlanVisibleCols.length) localStorage.setItem(adsStorageKey("mediaplan", "visible"), JSON.stringify(mediaPlanVisibleCols)); }, [mediaPlanVisibleCols]);

  const makeReorder = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (from: number, to: number) => {
    setter(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const makeToggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (key: string) => {
    setter(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const campaignColMap = Object.fromEntries(allCampaignColumns.map(c => [c.key, c]));
  const adSetColMap = Object.fromEntries(allAdSetsColumns.map(c => [c.key, c]));
  const adsColMap = Object.fromEntries(allAdsColumns.map(c => [c.key, c]));
  const mediaPlanColMap = Object.fromEntries(mediaPlanColumns.map(c => [c.key, c]));

  const orderedCampaignCols = campaignColOrder.map(k => campaignColMap[k]).filter(Boolean);
  const visibleCampaignColumnDefs = orderedCampaignCols.filter(col => visibleCampaignColumns.includes(col.key));

  const orderedAdSetCols = adSetColOrder.map(k => adSetColMap[k]).filter(Boolean);
  const visibleAdSetColumnDefs = orderedAdSetCols.filter(col => visibleAdSetColumns.includes(col.key));

  const orderedAdsCols = adsColOrder.map(k => adsColMap[k]).filter(Boolean);
  const visibleAdsColumnDefs = orderedAdsCols.filter(col => visibleAdsColumns.includes(col.key));

  const orderedMediaPlanCols = mediaPlanColOrder.map(k => mediaPlanColMap[k]).filter(Boolean);
  const filteredMediaPlanCols = orderedMediaPlanCols.filter(col => mediaPlanVisibleCols.includes(col.key));

  // Get data for display based on selection level
  const displayCampaigns = selectedCampaignId 
    ? campaignMeta.filter(cm => cm.id === selectedCampaignId)
    : campaignMeta;

  const displayAdSets = selectedAdSetId
    ? adSets.filter(as => as.id === selectedAdSetId)
    : filteredAdSets;

  const displayAds = selectedAdId
    ? ads.filter(a => a.id === selectedAdId)
    : filteredAds;

  const Wrapper = embedded ? 'div' : Card;
  const wrapperProps = embedded ? {} : { className: "p-8 rounded-[35px] border-foreground" };

  return (
    <Wrapper {...wrapperProps as any}>
      {!embedded && (
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Campaign Data</h2>
            <p className="text-muted-foreground">
              Hierarchical campaign data {canEdit ? "(Click rows to edit)" : "(Read-only)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[35px]"
              onClick={() => {
                const sheets = [
                  { name: "Campaigns", columns: allCampaignColumns, data: displayCampaigns },
                  { name: "Ad Sets", columns: allAdSetsColumns.filter(c => c.key !== "thumbnail_url"), data: displayAdSets },
                  { name: "Ads", columns: allAdsColumns.filter(c => c.key !== "thumbnail_url"), data: displayAds },
                ];
                exportToExcel(sheets, "ads-campaign-data");
                toast.success("Data exported to Excel");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[35px]"
                  onClick={() => setImportMediaPlanOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Media Plan
                </Button>
                <CreatePlanningItemDialog reportId={reportId} onSuccess={fetchData} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Hierarchical Filters - hide in embedded mode */}
      {!embedded && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Campaign Selector */}
          <Popover open={campaignOpen} onOpenChange={setCampaignOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={campaignOpen}
                className={cn(
                  "min-w-[200px] justify-between rounded-[35px] border-foreground",
                  selectedCampaignId && "border-accent-orange bg-accent-orange text-foreground"
                )}
              >
                {selectedCampaign?.name || "Select Campaign..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search campaigns..." />
                <CommandList>
                  <CommandEmpty>No campaigns found.</CommandEmpty>
                  <CommandGroup>
                    {campaigns.map((campaign) => (
                      <CommandItem
                        key={campaign.id}
                        value={campaign.name}
                        onSelect={() => {
                          setSelectedCampaignId(campaign.id);
                          setSelectedAdSetId(null);
                          setSelectedAdId(null);
                          setCampaignOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCampaignId === campaign.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {campaign.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedCampaignId && (
            <Button variant="ghost" size="icon" onClick={clearCampaign} className="h-9 w-9">
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Ad Set Selector - only show when campaign is selected */}
          {selectedCampaignId && filteredAdSets.length > 0 && (
            <>
              <span className="text-muted-foreground">→</span>
              <Popover open={adSetOpen} onOpenChange={setAdSetOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={adSetOpen}
                    className={cn(
                      "min-w-[200px] justify-between rounded-[35px] border-foreground",
                      selectedAdSetId && "border-accent-orange bg-accent-orange text-foreground"
                    )}
                  >
                     {selectedAdSet?.adset_name || "Select Ad Set..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search ad sets..." />
                    <CommandList>
                      <CommandEmpty>No ad sets found.</CommandEmpty>
                      <CommandGroup>
                        {filteredAdSets.map((adSet) => (
                          <CommandItem
                            key={adSet.id}
                            value={adSet.adset_name || adSet.id}
                            onSelect={() => {
                              setSelectedAdSetId(adSet.id);
                              setSelectedAdId(null);
                              setAdSetOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAdSetId === adSet.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {adSet.adset_name || "Unnamed Ad Set"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAdSetId && (
                <Button variant="ghost" size="icon" onClick={clearAdSet} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {/* Ad Selector - only show when ad set is selected */}
          {selectedAdSetId && filteredAds.length > 0 && (
            <>
              <span className="text-muted-foreground">→</span>
              <Popover open={adOpen} onOpenChange={setAdOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={adOpen}
                    className={cn(
                      "min-w-[200px] justify-between rounded-[35px] border-foreground",
                      selectedAdId && "border-accent-orange bg-accent-orange text-foreground"
                    )}
                  >
                    {selectedAd?.ad_name || "Select Ad..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search ads..." />
                    <CommandList>
                      <CommandEmpty>No ads found.</CommandEmpty>
                      <CommandGroup>
                        {filteredAds.map((ad) => (
                          <CommandItem
                            key={ad.id}
                            value={ad.ad_name || ad.id}
                            onSelect={() => {
                              setSelectedAdId(ad.id);
                              setAdOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAdId === ad.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {ad.ad_name || "Unnamed Ad"}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAdId && (
                <Button variant="ghost" size="icon" onClick={clearAd} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-8">
        {/* Campaign Meta Table */}
        {displayCampaigns.length > 0 && (embedded || (!selectedAdSetId && !selectedAdId)) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Campaigns</h3>
              <ColumnSelector
                allColumns={orderedCampaignCols}
                visibleColumns={visibleCampaignColumns}
                onColumnToggle={makeToggle(setVisibleCampaignColumns)}
                onReorder={makeReorder(setCampaignColOrder)}
              />
            </div>
            <EditableDataTable
              columns={visibleCampaignColumnDefs}
              data={embedded ? campaignMeta : displayCampaigns}
              canEdit={canEdit}
              onUpdate={(id, field, value) => handleUpdate("brand_campaigns", id, field, value)}
              onDelete={canEdit ? (id) => handleDelete("brand_campaigns", id) : undefined}
              onEdit={canEdit ? (item) => setEditingCampaign(item) : undefined}
              loading={loading}
            />
          </div>
        )}

        {/* Ad Sets Table - hide in embedded mode */}
        {!embedded && selectedAdSetId && !selectedAdId && displayAdSets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ad Sets</h3>
              <ColumnSelector
                allColumns={orderedAdSetCols}
                visibleColumns={visibleAdSetColumns}
                onColumnToggle={makeToggle(setVisibleAdSetColumns)}
                onReorder={makeReorder(setAdSetColOrder)}
              />
            </div>
            <EditableDataTable
              columns={visibleAdSetColumnDefs}
              data={displayAdSets}
              canEdit={canEdit}
              onUpdate={(id, field, value) => handleUpdate("brand_ad_sets", id, field, value)}
              onDelete={canEdit ? (id) => handleDelete("brand_ad_sets", id) : undefined}
              onEdit={canEdit ? (item) => setEditingAdSet(item) : undefined}
              loading={loading}
            />
          </div>
        )}

        {/* Ads Table - hide in embedded mode */}
        {!embedded && selectedAdId && displayAds.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ads</h3>
              <ColumnSelector
                allColumns={orderedAdsCols}
                visibleColumns={visibleAdsColumns}
                onColumnToggle={makeToggle(setVisibleAdsColumns)}
                onReorder={makeReorder(setAdsColOrder)}
              />
            </div>
            <EditableDataTable
              columns={visibleAdsColumnDefs}
              data={displayAds}
              canEdit={canEdit}
              onUpdate={(id, field, value) => handleUpdate("brand_ads", id, field, value)}
              onDelete={canEdit ? (id) => handleDelete("brand_ads", id) : undefined}
              onEdit={canEdit ? (item) => setEditingAd(item) : undefined}
              loading={loading}
            />
          </div>
        )}

        {/* Media Plan Table - hide in embedded mode */}
        {!embedded && mediaPlanItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Media Plan</h3>
              <ColumnSelector
                allColumns={orderedMediaPlanCols}
                visibleColumns={mediaPlanVisibleCols}
                onColumnToggle={makeToggle(setMediaPlanVisibleCols)}
                onReorder={makeReorder(setMediaPlanColOrder)}
              />
            </div>
            <EditableDataTable
              columns={filteredMediaPlanCols}
              data={mediaPlanItems}
              canEdit={canEdit}
              onUpdate={(id, field, value) => handleUpdate("media_plan_items", id, field, value)}
              onDelete={canEdit ? (id) => handleDelete("media_plan_items", id) : undefined}
              loading={loading}
            />
          </div>
        )}

        {/* Empty state */}
        {campaignMeta.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No campaign data found. {!embedded ? 'Use "Import from Meta" to fetch data.' : ''}</p>
          </div>
        )}
      </div>

      {editingCampaign && (
        <EditPlanningItemDialog
          item={editingCampaign}
          open={!!editingCampaign}
          onOpenChange={(open) => !open && setEditingCampaign(null)}
          onSuccess={fetchData}
        />
      )}

      {editingAdSet && (
        <EditAdSetDialog
          adSet={editingAdSet}
          open={!!editingAdSet}
          onOpenChange={(open) => !open && setEditingAdSet(null)}
          onSuccess={fetchData}
        />
      )}

      {editingAd && (
        <EditAdDialog
          ad={editingAd}
          open={!!editingAd}
          onOpenChange={(open) => !open && setEditingAd(null)}
          onSuccess={fetchData}
        />
      )}

      <ImportMediaPlanDialog
        open={importMediaPlanOpen}
        onOpenChange={setImportMediaPlanOpen}
        reportId={reportId}
        spaceId={spaceId}
        onSuccess={() => { fetchMediaPlan(); onImportSuccess?.(); }}
      />
    </Wrapper>
  );
};
