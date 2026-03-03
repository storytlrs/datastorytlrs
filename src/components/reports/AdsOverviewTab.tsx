import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "./KPICard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { format } from "date-fns";
import { 
  Eye, 
  Wallet,
  MousePointer,
  BarChart3,
  CalendarIcon,
  X,
  Target,
  Users,
  Play,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronDown,
  Check,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currencyUtils";
import { SnapshotTrendChart } from "./SnapshotTrendChart";

interface AdsOverviewTabProps {
  reportId: string;
  spaceId: string;
}

interface CampaignMeta {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  account_name: string | null;
  platform: string | null;
  amount_spent: number | null;
  reach: number | null;
  impressions: number | null;
  thruplays: number | null;
  video_3s_plays: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  link_clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  date_stop: string | null;
}

interface AdSet {
  id: string;
  brand_campaign_id: string;
  adset_name: string | null;
  status: string | null;
  amount_spent: number | null;
  reach: number | null;
  impressions: number | null;
  thruplays: number | null;
  video_3s_plays: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  date_stop: string | null;
}

interface Ad {
  id: string;
  brand_ad_set_id: string;
  ad_name: string;
  status: string | null;
  amount_spent: number | null;
  reach: number | null;
  impressions: number | null;
  thruplays: number | null;
  video_3s_plays: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  date_stop: string | null;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatPercent = (num: number, decimals: number = 2): string => {
  return `${num.toFixed(decimals)}%`;
};

interface KPISectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  columns?: number;
}

const KPISection = ({ title, icon: Icon, children, columns }: KPISectionProps) => {
  const gridClass = columns 
    ? `grid gap-4 ${columns === 1 ? 'grid-cols-1 max-w-xs' : columns === 3 ? 'grid-cols-1 md:grid-cols-3' : columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`
    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
      </div>
      <div className={gridClass}>
        {children}
      </div>
    </div>
  );
};

// Helper to calculate KPIs from data array
const calculateKPIs = (data: any[]) => {
  const totalReach = data.reduce((sum, item) => sum + (item.reach || 0), 0);
  const totalImpressions = data.reduce((sum, item) => sum + (item.impressions || 0), 0);
  const totalThruplays = data.reduce((sum, item) => sum + (item.thruplays || 0), 0);
  const total3sViews = data.reduce((sum, item) => sum + (item.video_3s_plays || 0), 0);
  const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
  
  const totalLinkClicks = data.reduce((sum, item) => sum + (item.clicks || item.link_clicks || 0), 0);
  const totalReactions = data.reduce((sum, item) => sum + (item.post_reactions || 0), 0);
  const totalComments = data.reduce((sum, item) => sum + (item.post_comments || 0), 0);
  const totalShares = data.reduce((sum, item) => sum + (item.post_shares || 0), 0);
  const totalSaves = data.reduce((sum, item) => sum + (item.post_saves || 0), 0);
  const totalInteractions = totalReactions + totalComments + totalShares + totalSaves;
  const totalSpend = data.reduce((sum, item) => sum + (item.amount_spent || 0), 0);

  // Average watch time (weighted by impressions for proper averaging)
  const totalWeightedWatchTime = data.reduce((sum, item) => sum + (item.average_video_play || 0) * (item.impressions || 1), 0);
  const totalImpressionsForAvg = data.reduce((sum, item) => sum + ((item.average_video_play || 0) > 0 ? (item.impressions || 1) : 0), 0);
  const avgWatchTime = totalImpressionsForAvg > 0 ? totalWeightedWatchTime / totalImpressionsForAvg : 0;
  
  return {
    awareness: {
      spend: totalSpend,
      reach: totalReach,
      frequency: avgFrequency,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      impressions: totalImpressions,
    },
    engagement: {
      reactions: totalReactions,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      interactions: totalInteractions,
      engagementRate: totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0,
      cpe: totalInteractions > 0 ? totalSpend / totalInteractions : 0,
    },
    video: {
      thruplays: totalThruplays,
      thruplayRate: totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0,
      costPerThruplay: totalThruplays > 0 ? totalSpend / totalThruplays : 0,
      video3sPlays: total3sViews,
      viewRate3s: totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0,
      costPer3sView: total3sViews > 0 ? totalSpend / total3sViews : 0,
      avgWatchTime,
    },
    traffic: {
      linkClicks: totalLinkClicks,
      ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
      cpc: totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0,
    },
  };
};
// Reusable KPI display for the new layout
const AdsKPIDisplay = ({ kpis, title, formatCurrency }: { kpis: ReturnType<typeof calculateKPIs>; title: string; formatCurrency: (n: number) => string }) => (
  <div className="space-y-8">
    <div className="border-b pb-2">
      <h2 className="font-bold text-xl uppercase tracking-wide">{title}</h2>
    </div>

    {/* Awareness: Total Spend, Reach, Frequency, CPM, Impressions */}
    <KPISection title="Awareness" icon={Eye} columns={5}>
      <KPICard title="Total Spend" value={formatCurrency(kpis.awareness.spend)} icon={Wallet} accentColor="blue" />
      <KPICard title="Reach" value={formatNumber(kpis.awareness.reach)} icon={Users} accentColor="blue" />
      <KPICard title="Frequency" value={kpis.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
      <KPICard title="CPM" value={formatCurrency(kpis.awareness.cpm)} icon={Wallet} accentColor="blue" tooltip="CPM = (Spend / Impressions) × 1000" />
      <KPICard title="Impressions" value={formatNumber(kpis.awareness.impressions)} icon={Eye} accentColor="blue" />
    </KPISection>

    {/* Engagement: Row 1 (4 items) + Row 2 (3 items) */}
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-bold text-lg uppercase tracking-wide">Engagement</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Reactions" value={formatNumber(kpis.engagement.reactions)} icon={Heart} accentColor="green" />
        <KPICard title="Comments" value={formatNumber(kpis.engagement.comments)} icon={MessageCircle} accentColor="green" />
        <KPICard title="Shares" value={formatNumber(kpis.engagement.shares)} icon={Share2} accentColor="green" />
        <KPICard title="Saves" value={formatNumber(kpis.engagement.saves)} icon={Bookmark} accentColor="green" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Engagement" value={formatNumber(kpis.engagement.interactions)} icon={TrendingUp} accentColor="green" tooltip="Engagement = Reactions + Comments + Shares + Saves" />
        <KPICard title="Engagement Rate" value={formatPercent(kpis.engagement.engagementRate)} icon={TrendingUp} accentColor="green" tooltip="Engagement Rate = (Engagement / Impressions) × 100" />
        <KPICard title="CPE" value={formatCurrency(kpis.engagement.cpe)} icon={Target} accentColor="green" tooltip="CPE = Spend / Engagement" />
      </div>
    </div>

    {/* Video: Row 1 (3) + Row 2 (3) + Row 3 (1) */}
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Play className="w-5 h-5" />
        <h3 className="font-bold text-lg uppercase tracking-wide">Video</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="ThruPlays" value={formatNumber(kpis.video.thruplays)} icon={Play} accentColor="orange" />
        <KPICard title="ThruPlay Rate" value={formatPercent(kpis.video.thruplayRate)} icon={Play} accentColor="orange" tooltip="ThruPlay Rate = (ThruPlays / Impressions) × 100" />
        <KPICard title="Cost per ThruPlay" value={formatCurrency(kpis.video.costPerThruplay)} icon={Wallet} accentColor="orange" tooltip="Cost per ThruPlay = Spend / ThruPlays" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="3s Views" value={formatNumber(kpis.video.video3sPlays)} icon={Play} accentColor="orange" />
        <KPICard title="3s View Rate" value={formatPercent(kpis.video.viewRate3s)} icon={Play} accentColor="orange" tooltip="3s View Rate = (3s Views / Impressions) × 100" />
        <KPICard title="Cost per 3s View" value={formatCurrency(kpis.video.costPer3sView)} icon={Wallet} accentColor="orange" tooltip="Cost per 3s View = Spend / 3s Views" />
      </div>
      <div className="grid grid-cols-1 max-w-xs gap-4">
        <KPICard title="Avg Watch Time" value={`${kpis.video.avgWatchTime.toFixed(1)}s`} icon={Clock} accentColor="orange" />
      </div>
    </div>

    {/* Traffic: 3 items */}
    <KPISection title="Traffic" icon={MousePointer} columns={3}>
      <KPICard title="Link Clicks" value={formatNumber(kpis.traffic.linkClicks)} icon={MousePointer} accentColor="blue" />
      <KPICard title="CTR" value={formatPercent(kpis.traffic.ctr)} icon={Target} accentColor="blue" tooltip="CTR = (Link Clicks / Impressions) × 100" />
      <KPICard title="CPC" value={formatCurrency(kpis.traffic.cpc)} icon={Wallet} accentColor="blue" tooltip="CPC = Spend / Link Clicks" />
    </KPISection>
  </div>
);

export const AdsOverviewTab = ({ reportId, spaceId }: AdsOverviewTabProps) => {
  const [campaignMeta, setCampaignMeta] = useState<CampaignMeta[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  // Maps total campaign UUID -> all linked campaign UUIDs (original breakdown + total)
  const [campaignIdMapping, setCampaignIdMapping] = useState<Record<string, string[]>>({});

  // Filter state
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [selectedPlatform, setSelectedPlatform] = useState<"meta" | "tiktok">("meta");
  
  // Hierarchical selection state
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  
  // Popover state
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [adSetOpen, setAdSetOpen] = useState(false);
  const [adOpen, setAdOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch linked campaign IDs for this report (Meta + TikTok)
      const [metaLinksRes, tiktokLinksRes] = await Promise.all([
        supabase.from("report_campaigns").select("brand_campaign_id").eq("report_id", reportId),
        supabase.from("report_tiktok_campaigns").select("tiktok_campaign_id").eq("report_id", reportId),
      ]);

      const metaLinkedIds = metaLinksRes.data?.map((l) => l.brand_campaign_id) || [];
      const tiktokLinkedIds = tiktokLinksRes.data?.map((l) => l.tiktok_campaign_id) || [];

      if (metaLinkedIds.length === 0 && tiktokLinkedIds.length === 0) {
        setCampaignMeta([]);
        setAdSets([]);
        setAds([]);
        setLoading(false);
        return;
      }

      // Fetch Meta data
      let metaCampaigns: any[] = [];
      let metaAdSets: any[] = [];
      let metaAds: any[] = [];

      if (metaLinkedIds.length > 0) {
        // First get the campaign_id text values from linked rows
        const linkedCampaignsRes = await supabase
          .from("brand_campaigns" as any)
          .select("campaign_id")
          .in("id", metaLinkedIds);
        const linkedCampaignTextIds = (linkedCampaignsRes.data || []).map((c: any) => c.campaign_id).filter(Boolean);

        if (linkedCampaignTextIds.length > 0) {
          // Fetch "total" rows (publisher_platform=unknown) using campaign_id text match
          const campaignMetaRes = await supabase
            .from("brand_campaigns" as any)
            .select("*")
            .eq("space_id", spaceId)
            .in("campaign_id", linkedCampaignTextIds)
            .eq("publisher_platform", "unknown")
            .eq("age", "")
            .eq("gender", "");
          metaCampaigns = (campaignMetaRes.data || []).map((c: any) => ({ ...c, platform: "meta" }));

          // Build mapping: total campaign UUID -> all related UUIDs (original + total)
          // so filtering by total campaign ID also matches ad sets linked to original IDs
          const totalCampaignIds = metaCampaigns.map((c: any) => c.id);
          const mapping: Record<string, string[]> = {};
          // For each total campaign, find original linked IDs with same campaign_id text
          const linkedCampaignData = (linkedCampaignsRes.data || []) as any[];
          metaCampaigns.forEach((tc: any) => {
            const relatedOriginalIds = metaLinkedIds.filter((_id, idx) => 
              linkedCampaignData[idx]?.campaign_id === tc.campaign_id
            );
            mapping[tc.id] = [...new Set([tc.id, ...relatedOriginalIds])];
          });
          setCampaignIdMapping(mapping);

          // Use BOTH original linked IDs and total campaign IDs to fetch ad sets
          const allCampaignIdsForAdSets = [...new Set([...metaLinkedIds, ...totalCampaignIds])];
          if (allCampaignIdsForAdSets.length > 0) {
            const adSetsRes = await supabase
              .from("brand_ad_sets" as any)
              .select("*")
              .eq("space_id", spaceId)
              .in("brand_campaign_id", allCampaignIdsForAdSets)
              .eq("age", "")
              .eq("gender", "");
            metaAdSets = (adSetsRes.data || []).map((as: any) => ({ ...as, platform: "meta" }));
          }

          const adSetIds = metaAdSets.map((as: any) => as.id);
          if (adSetIds.length > 0) {
            const adsRes = await supabase.from("brand_ads" as any).select("*").eq("space_id", spaceId).in("brand_ad_set_id", adSetIds).eq("age", "").eq("gender", "");
            metaAds = (adsRes.data || []).map((a: any) => ({ ...a, platform: "meta" }));
          }
        }
      }

      // Fetch TikTok data
      let tiktokCampaigns: any[] = [];
      let tiktokAdGroups: any[] = [];
      let tiktokAdsData: any[] = [];

      if (tiktokLinkedIds.length > 0) {
        const [tiktokCampaignsRes, tiktokAdGroupsRes] = await Promise.all([
          supabase.from("tiktok_campaigns").select("*").eq("space_id", spaceId).in("id", tiktokLinkedIds).eq("age", "").eq("gender", "").eq("location", ""),
          supabase.from("tiktok_ad_groups").select("*").eq("space_id", spaceId).in("tiktok_campaign_id", tiktokLinkedIds),
        ]);

        // Map TikTok campaigns to unified format
        tiktokCampaigns = (tiktokCampaignsRes.data || []).map((c: any) => ({
          id: c.id,
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name ? `[TikTok] ${c.campaign_name}` : c.campaign_name,
          platform: "tiktok",
          amount_spent: c.amount_spent,
          reach: c.reach,
          impressions: c.impressions,
          frequency: c.frequency,
          ctr: c.ctr,
          cpm: c.cpm,
          cpc: c.cpc,
          thruplays: c.video_views_p100,
          video_3s_plays: c.video_watched_2s,
          link_clicks: c.clicks,
          post_reactions: c.likes,
          post_comments: c.comments,
          post_shares: c.shares,
          post_saves: 0,
          average_video_play: c.average_video_play || 0,
          date_start: null,
          date_stop: null,
        }));

        // Map TikTok ad groups to unified ad set format
        tiktokAdGroups = (tiktokAdGroupsRes.data || []).map((ag: any) => ({
          id: ag.id,
          brand_campaign_id: ag.tiktok_campaign_id,
          adset_name: ag.adgroup_name ? `[TikTok] ${ag.adgroup_name}` : ag.adgroup_name,
          status: ag.status,
          amount_spent: ag.amount_spent,
          reach: ag.reach,
          impressions: ag.impressions,
          frequency: ag.frequency,
          ctr: ag.ctr,
          cpm: ag.cpm,
          cpc: ag.cpc,
          thruplays: ag.video_views_p100,
          video_3s_plays: ag.video_watched_2s,
          clicks: ag.clicks,
          post_reactions: ag.likes,
          post_comments: ag.comments,
          post_shares: ag.shares,
          post_saves: 0,
          average_video_play: ag.average_video_play || 0,
          date_start: null,
          date_stop: null,
          platform: "tiktok",
        }));

        const adGroupIds = tiktokAdGroups.map((ag: any) => ag.id);
        if (adGroupIds.length > 0) {
          const tiktokAdsRes = await supabase.from("tiktok_ads").select("*").eq("space_id", spaceId).in("tiktok_ad_group_id", adGroupIds);
          tiktokAdsData = (tiktokAdsRes.data || []).map((a: any) => ({
            id: a.id,
            brand_ad_set_id: a.tiktok_ad_group_id,
            ad_name: a.ad_name ? `[TikTok] ${a.ad_name}` : a.ad_name,
            status: a.status,
            amount_spent: a.amount_spent,
            reach: a.reach,
            impressions: a.impressions,
            frequency: a.frequency,
            ctr: a.ctr,
            cpm: a.cpm,
            cpc: a.cpc,
            thruplays: a.video_views_p100,
            video_3s_plays: a.video_watched_2s,
            clicks: a.clicks,
            post_reactions: a.likes,
            post_comments: a.comments,
            post_shares: a.shares,
            post_saves: 0,
            average_video_play: a.average_video_play || 0,
            link_clicks: a.link_clicks,
            date_start: null,
            date_stop: null,
            thumbnail_url: a.thumbnail_url,
            platform: "tiktok",
          }));
        }
      }

      setCampaignMeta([...metaCampaigns, ...tiktokCampaigns] as any);
      setAdSets([...metaAdSets, ...tiktokAdGroups] as any);
      setAds([...metaAds, ...tiktokAdsData] as any);
      setLoading(false);
    };
    fetchData();
  }, [reportId, spaceId]);

  // Detect available platforms
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    campaignMeta.forEach((c: any) => { if (c.platform) platforms.add(c.platform); });
    return Array.from(platforms);
  }, [campaignMeta]);

  // Filter all data by selected platform
  const platformFilteredCampaigns = useMemo(() => {
    return campaignMeta.filter((c: any) => c.platform === selectedPlatform);
  }, [campaignMeta, selectedPlatform]);

  const platformFilteredAdSets = useMemo(() => {
    return adSets.filter((as: any) => as.platform === selectedPlatform);
  }, [adSets, selectedPlatform]);

  const platformFilteredAds = useMemo(() => {
    return ads.filter((a: any) => a.platform === selectedPlatform);
  }, [ads, selectedPlatform]);

  // Get campaigns for selector
  const campaigns = useMemo(() => {
    return platformFilteredCampaigns.map(cm => ({
      id: cm.id,
      name: cm.campaign_name || "Unnamed Campaign",
      data: cm
    }));
  }, [platformFilteredCampaigns]);

  // Get ad sets filtered by selected campaigns
  const filteredAdSets = useMemo(() => {
    let filtered = platformFilteredAdSets;
    if (selectedCampaignIds.length > 0) {
      const allRelatedIds = new Set<string>();
      selectedCampaignIds.forEach(id => {
        const related = campaignIdMapping[id];
        if (related) {
          related.forEach(rid => allRelatedIds.add(rid));
        } else {
          allRelatedIds.add(id);
        }
      });
      filtered = filtered.filter(adSet => allRelatedIds.has(adSet.brand_campaign_id));
    }
    if (dateRange.start) {
      filtered = filtered.filter(item => !item.date_start || new Date(item.date_start) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => !item.date_stop || new Date(item.date_stop) <= dateRange.end!);
    }
    return filtered;
  }, [platformFilteredAdSets, selectedCampaignIds, campaignIdMapping, dateRange]);

  // Get ads filtered by selected ad set
  const filteredAds = useMemo(() => {
    let filtered = platformFilteredAds;
    if (selectedAdSetId) {
      filtered = filtered.filter(ad => ad.brand_ad_set_id === selectedAdSetId);
    } else if (selectedCampaignIds.length > 0) {
      const adSetIds = new Set(filteredAdSets.map(as => as.id));
      filtered = filtered.filter(ad => adSetIds.has(ad.brand_ad_set_id));
    }
    if (dateRange.start) {
      filtered = filtered.filter(item => !item.date_start || new Date(item.date_start) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => !item.date_stop || new Date(item.date_stop) <= dateRange.end!);
    }
    return filtered;
  }, [platformFilteredAds, selectedAdSetId, selectedCampaignIds, filteredAdSets, dateRange]);

  // Filter campaign meta by date
  const filteredCampaignMeta = useMemo(() => {
    let filtered = platformFilteredCampaigns;
    if (selectedCampaignIds.length > 0) {
      const idSet = new Set(selectedCampaignIds);
      filtered = filtered.filter(cm => idSet.has(cm.id));
    }
    if (dateRange.start) {
      filtered = filtered.filter(item => !item.date_start || new Date(item.date_start) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => !item.date_stop || new Date(item.date_stop) <= dateRange.end!);
    }
    return filtered;
  }, [platformFilteredCampaigns, selectedCampaignIds, dateRange]);

  const selectedAdSet = adSets.find(as => as.id === selectedAdSetId);
  const selectedAd = ads.find(a => a.id === selectedAdId);

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
    setSelectedAdSetId(null);
    setSelectedAdId(null);
  };

  const removeCampaign = (id: string) => {
    setSelectedCampaignIds(prev => prev.filter(cid => cid !== id));
    setSelectedAdSetId(null);
    setSelectedAdId(null);
  };

  // Clear selections
  const clearCampaigns = () => {
    setSelectedCampaignIds([]);
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

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    clearCampaigns();
  };

  // Calculate KPIs based on selection level
  const campaignKPIs = useMemo(() => {
    if (filteredCampaignMeta.length === 0) return null;
    return calculateKPIs(filteredCampaignMeta);
  }, [filteredCampaignMeta]);

  const adSetKPIs = useMemo(() => {
    if (!selectedAdSetId) return null;
    const data = platformFilteredAdSets.filter(as => as.id === selectedAdSetId);
    if (data.length === 0) return null;
    return calculateKPIs(data);
  }, [platformFilteredAdSets, selectedAdSetId]);

  const adsKPIs = useMemo(() => {
    if (!selectedAdId) return null;
    const data = platformFilteredAds.filter(a => a.id === selectedAdId);
    if (data.length === 0) return null;
    return calculateKPIs(data);
  }, [platformFilteredAds, selectedAdId]);

  const formatCurrency = (num: number): string => formatCurrencyUtil(num, "CZK");

  const hasFilters = dateRange.start || dateRange.end || selectedCampaignIds.length > 0;
  const hasAnyKPIs = campaignKPIs || adSetKPIs || adsKPIs;

  // Reset selections when platform changes
  const handlePlatformChange = (platform: "meta" | "tiktok") => {
    setSelectedPlatform(platform);
    setSelectedCampaignIds([]);
    setSelectedAdSetId(null);
    setSelectedAdId(null);
  };

  // Auto-select default platform: prefer meta, fallback to first available
  useEffect(() => {
    if (availablePlatforms.length > 0) {
      if (availablePlatforms.includes("meta")) {
        setSelectedPlatform("meta");
      } else {
        setSelectedPlatform(availablePlatforms[0] as "meta" | "tiktok");
      }
    }
  }, [availablePlatforms]);

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </Card>
    );
  }

  if (campaignMeta.length === 0 && adSets.length === 0) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <p className="text-muted-foreground text-center">
          No ads data available. Import data in the Data tab to see KPIs.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Platform Toggle */}
        {availablePlatforms.length > 1 && (
          <div className="flex items-center rounded-[35px] border border-foreground overflow-hidden">
            {availablePlatforms.includes("meta") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlatformChange("meta")}
                className={cn(
                  "rounded-none px-4 h-9 text-sm font-medium border-0",
                  selectedPlatform === "meta" && "bg-foreground text-background"
                )}
              >
                Meta
              </Button>
            )}
            {availablePlatforms.includes("tiktok") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlatformChange("tiktok")}
                className={cn(
                  "rounded-none px-4 h-9 text-sm font-medium border-0",
                  selectedPlatform === "tiktok" && "bg-foreground text-background"
                )}
              >
                TikTok
              </Button>
            )}
          </div>
        )}

        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Campaign Multi-Select */}
        <Popover open={campaignOpen} onOpenChange={setCampaignOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={campaignOpen}
              className={cn(
                "min-w-[200px] justify-between rounded-[35px] border-foreground",
                selectedCampaignIds.length > 0 && "border-accent-orange bg-accent-orange text-foreground"
              )}
            >
              {selectedCampaignIds.length > 0
                ? `${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? "s" : ""}`
                : "Select Campaigns..."}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search campaigns..." />
              <CommandList>
                <CommandEmpty>No campaigns found.</CommandEmpty>
                <CommandGroup>
                  {campaigns.map((campaign) => {
                    const isSelected = selectedCampaignIds.includes(campaign.id);
                    return (
                      <CommandItem
                        key={campaign.id}
                        value={campaign.name}
                        onSelect={() => toggleCampaign(campaign.id)}
                        className={cn(isSelected && "bg-foreground text-background")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {campaign.name}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedCampaignIds.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearCampaigns} className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Ad Set Selector - only show when campaign is selected */}
        {selectedCampaignIds.length === 1 && filteredAdSets.length > 0 && (
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

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="rounded-[35px]">
            <X className="w-4 h-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Selected campaign badges */}
      {selectedCampaignIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCampaignIds.map((id) => {
            const campaign = campaigns.find(c => c.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                <span className="truncate max-w-[200px]">{campaign?.name || "Unknown"}</span>
                <button
                  onClick={() => removeCampaign(id)}
                  className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Campaign KPIs */}
      {campaignKPIs && !selectedAdSetId && !selectedAdId && (
        <AdsKPIDisplay kpis={campaignKPIs} title="Campaign" formatCurrency={formatCurrency} />
      )}

      {/* Ad Set KPIs */}
      {adSetKPIs && !selectedAdId && (
        <AdsKPIDisplay kpis={adSetKPIs} title="Ad Set" formatCurrency={formatCurrency} />
      )}

      {/* Ads KPIs */}
      {adsKPIs && (
        <AdsKPIDisplay kpis={adsKPIs} title="Ad" formatCurrency={formatCurrency} />
      )}

      {/* No data message */}
      {!hasAnyKPIs && (
        <Card className="p-8 rounded-[35px] border-foreground">
          <p className="text-muted-foreground text-center">
            Vyber kampaň pro zobrazení KPI.
          </p>
        </Card>
      )}
    </div>
  );
};
