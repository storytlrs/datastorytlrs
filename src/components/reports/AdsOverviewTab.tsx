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
  DollarSign,
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
  Check
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
}

const KPISection = ({ title, icon: Icon, children }: KPISectionProps) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5" />
      <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {children}
    </div>
  </div>
);

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
  
  return {
    awareness: {
      reach: totalReach,
      impressions: totalImpressions,
      thruplays: totalThruplays,
      video3sPlays: total3sViews,
      frequency: avgFrequency,
    },
    engagement: {
      linkClicks: totalLinkClicks,
      reactions: totalReactions,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      interactions: totalInteractions,
      ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
      engagementRate: totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0,
      thruplayRate: totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0,
      viewRate3s: totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0,
    },
    effectiveness: {
      spend: totalSpend,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      cpc: totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0,
      costPerThruplay: totalThruplays > 0 ? totalSpend / totalThruplays : 0,
      costPer3sView: total3sViews > 0 ? totalSpend / total3sViews : 0,
      cpe: totalInteractions > 0 ? totalSpend / totalInteractions : 0,
      count: data.length,
    },
  };
};

export const AdsOverviewTab = ({ reportId, spaceId }: AdsOverviewTabProps) => {
  const [campaignMeta, setCampaignMeta] = useState<CampaignMeta[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  
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
        const [campaignMetaRes, adSetsRes] = await Promise.all([
          supabase.from("brand_campaigns" as any).select("*").eq("space_id", spaceId).in("id", metaLinkedIds),
          supabase.from("brand_ad_sets" as any).select("*").eq("space_id", spaceId).in("brand_campaign_id", metaLinkedIds),
        ]);
        metaCampaigns = (campaignMetaRes.data || []).map((c: any) => ({ ...c, platform: "meta" }));
        metaAdSets = (adSetsRes.data || []).map((as: any) => ({ ...as, platform: "meta" }));

        const adSetIds = metaAdSets.map((as: any) => as.id);
        if (adSetIds.length > 0) {
          const adsRes = await supabase.from("brand_ads" as any).select("*").eq("space_id", spaceId).in("brand_ad_set_id", adSetIds);
          metaAds = (adsRes.data || []).map((a: any) => ({ ...a, platform: "meta" }));
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

  // Get campaigns for selector
  const campaigns = useMemo(() => {
    return campaignMeta.map(cm => ({
      id: cm.id,
      name: cm.campaign_name || "Unnamed Campaign",
      data: cm
    }));
  }, [campaignMeta]);

  // Get ad sets filtered by selected campaigns
  const filteredAdSets = useMemo(() => {
    let filtered = adSets;
    if (selectedCampaignIds.length > 0) {
      const idSet = new Set(selectedCampaignIds);
      filtered = adSets.filter(adSet => idSet.has(adSet.brand_campaign_id));
    }
    if (dateRange.start) {
      filtered = filtered.filter(item => !item.date_start || new Date(item.date_start) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => !item.date_stop || new Date(item.date_stop) <= dateRange.end!);
    }
    return filtered;
  }, [adSets, selectedCampaignIds, dateRange]);

  // Get ads filtered by selected ad set
  const filteredAds = useMemo(() => {
    let filtered = ads;
    if (selectedAdSetId) {
      filtered = ads.filter(ad => ad.brand_ad_set_id === selectedAdSetId);
    } else if (selectedCampaignIds.length > 0) {
      const adSetIds = new Set(filteredAdSets.map(as => as.id));
      filtered = ads.filter(ad => adSetIds.has(ad.brand_ad_set_id));
    }
    if (dateRange.start) {
      filtered = filtered.filter(item => !item.date_start || new Date(item.date_start) >= dateRange.start!);
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => !item.date_stop || new Date(item.date_stop) <= dateRange.end!);
    }
    return filtered;
  }, [ads, selectedAdSetId, selectedCampaignIds, filteredAdSets, dateRange]);

  // Filter campaign meta by date
  const filteredCampaignMeta = useMemo(() => {
    let filtered = campaignMeta;
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
  }, [campaignMeta, selectedCampaignIds, dateRange]);

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
    const data = adSets.filter(as => as.id === selectedAdSetId);
    if (data.length === 0) return null;
    return calculateKPIs(data);
  }, [adSets, selectedAdSetId]);

  const adsKPIs = useMemo(() => {
    if (!selectedAdId) return null;
    const data = ads.filter(a => a.id === selectedAdId);
    if (data.length === 0) return null;
    return calculateKPIs(data);
  }, [ads, selectedAdId]);

  const formatCurrency = (num: number): string => formatCurrencyUtil(num, "CZK");

  const hasFilters = dateRange.start || dateRange.end || selectedCampaignIds.length > 0;

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

      {/* Campaign KPIs - show only when campaign is selected but NOT ad set or ad */}
      {campaignKPIs && !selectedAdSetId && !selectedAdId && (
        <div className="space-y-8">
          <div className="border-b pb-2">
            <h2 className="font-bold text-xl uppercase tracking-wide">Campaign</h2>
          </div>
          
          {/* Awareness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold text-lg uppercase tracking-wide">Awareness</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard title="Reach" value={formatNumber(campaignKPIs.awareness.reach)} icon={Users} accentColor="blue" />
              <KPICard title="Impressions" value={formatNumber(campaignKPIs.awareness.impressions)} icon={Eye} accentColor="blue" />
              <KPICard title="ThruPlays" value={formatNumber(campaignKPIs.awareness.thruplays)} icon={Play} accentColor="blue" />
              <KPICard title="3s Views" value={formatNumber(campaignKPIs.awareness.video3sPlays)} icon={Play} accentColor="blue" />
              <KPICard title="Frequency" value={campaignKPIs.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
            </div>
          </div>

          {/* Engagement Section */}
          <KPISection title="Engagement" icon={MessageCircle}>
            <KPICard title="Link Clicks" value={formatNumber(campaignKPIs.engagement.linkClicks)} icon={MousePointer} accentColor="green" />
            <KPICard title="Reactions" value={formatNumber(campaignKPIs.engagement.reactions)} icon={Heart} accentColor="green" />
            <KPICard title="Comments" value={formatNumber(campaignKPIs.engagement.comments)} icon={MessageCircle} accentColor="green" />
            <KPICard title="Shares" value={formatNumber(campaignKPIs.engagement.shares)} icon={Share2} accentColor="green" />
            <KPICard title="Saves" value={formatNumber(campaignKPIs.engagement.saves)} icon={Bookmark} accentColor="green" />
            <KPICard title="CTR" value={formatPercent(campaignKPIs.engagement.ctr)} icon={Target} accentColor="green" tooltip="CTR = (Link Clicks / Impressions) × 100" />
            <KPICard title="Engagement Rate" value={formatPercent(campaignKPIs.engagement.engagementRate)} icon={TrendingUp} accentColor="green" tooltip="Engagement Rate = (Interactions / Impressions) × 100" />
            <KPICard title="ThruPlay Rate" value={formatPercent(campaignKPIs.engagement.thruplayRate)} icon={Play} accentColor="green" tooltip="ThruPlay Rate = (ThruPlays / Impressions) × 100" />
            <KPICard title="3s View Rate" value={formatPercent(campaignKPIs.engagement.viewRate3s)} icon={Play} accentColor="green" tooltip="3s View Rate = (3s Views / Impressions) × 100" />
          </KPISection>

          {/* Effectiveness Section */}
          <KPISection title="Effectiveness" icon={BarChart3}>
            <KPICard title="Total Spend" value={formatCurrency(campaignKPIs.effectiveness.spend)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(campaignKPIs.effectiveness.cpm)} icon={DollarSign} accentColor="orange" tooltip="CPM = (Spend / Impressions) × 1000" />
            <KPICard title="CPC" value={formatCurrency(campaignKPIs.effectiveness.cpc)} icon={MousePointer} accentColor="orange" tooltip="CPC = Spend / Link Clicks" />
            <KPICard title="Cost per ThruPlay" value={formatCurrency(campaignKPIs.effectiveness.costPerThruplay)} icon={Play} accentColor="orange" tooltip="Cost per ThruPlay = Spend / ThruPlays" />
            <KPICard title="Cost per 3s View" value={formatCurrency(campaignKPIs.effectiveness.costPer3sView)} icon={Play} accentColor="orange" tooltip="Cost per 3s View = Spend / 3s Views" />
            <KPICard title="CPE" value={formatCurrency(campaignKPIs.effectiveness.cpe)} icon={Target} accentColor="orange" tooltip="CPE (Cost per Engagement) = Spend / Total Interactions" />
          </KPISection>
        </div>
      )}

      {/* Ad Set KPIs - show only when ad set is selected but NOT ad */}
      {adSetKPIs && !selectedAdId && (
        <div className="space-y-8">
          <div className="border-b pb-2">
            <h2 className="font-bold text-xl uppercase tracking-wide">Ad Set</h2>
          </div>
          
          {/* Awareness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold text-lg uppercase tracking-wide">Awareness</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard title="Reach" value={formatNumber(adSetKPIs.awareness.reach)} icon={Users} accentColor="blue" />
              <KPICard title="Impressions" value={formatNumber(adSetKPIs.awareness.impressions)} icon={Eye} accentColor="blue" />
              <KPICard title="ThruPlays" value={formatNumber(adSetKPIs.awareness.thruplays)} icon={Play} accentColor="blue" />
              <KPICard title="3s Views" value={formatNumber(adSetKPIs.awareness.video3sPlays)} icon={Play} accentColor="blue" />
              <KPICard title="Frequency" value={adSetKPIs.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
            </div>
          </div>

          {/* Engagement Section */}
          <KPISection title="Engagement" icon={MessageCircle}>
            <KPICard title="Link Clicks" value={formatNumber(adSetKPIs.engagement.linkClicks)} icon={MousePointer} accentColor="green" />
            <KPICard title="Reactions" value={formatNumber(adSetKPIs.engagement.reactions)} icon={Heart} accentColor="green" />
            <KPICard title="Comments" value={formatNumber(adSetKPIs.engagement.comments)} icon={MessageCircle} accentColor="green" />
            <KPICard title="Shares" value={formatNumber(adSetKPIs.engagement.shares)} icon={Share2} accentColor="green" />
            <KPICard title="Saves" value={formatNumber(adSetKPIs.engagement.saves)} icon={Bookmark} accentColor="green" />
            <KPICard title="CTR" value={formatPercent(adSetKPIs.engagement.ctr)} icon={Target} accentColor="green" />
            <KPICard title="Engagement Rate" value={formatPercent(adSetKPIs.engagement.engagementRate)} icon={TrendingUp} accentColor="green" />
            <KPICard title="ThruPlay Rate" value={formatPercent(adSetKPIs.engagement.thruplayRate)} icon={Play} accentColor="green" />
            <KPICard title="3s View Rate" value={formatPercent(adSetKPIs.engagement.viewRate3s)} icon={Play} accentColor="green" />
          </KPISection>

          {/* Effectiveness Section */}
          <KPISection title="Effectiveness" icon={BarChart3}>
            <KPICard title="Total Spend" value={formatCurrency(adSetKPIs.effectiveness.spend)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(adSetKPIs.effectiveness.cpm)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPC" value={formatCurrency(adSetKPIs.effectiveness.cpc)} icon={MousePointer} accentColor="orange" />
            <KPICard title="Cost per ThruPlay" value={formatCurrency(adSetKPIs.effectiveness.costPerThruplay)} icon={Play} accentColor="orange" />
            <KPICard title="Cost per 3s View" value={formatCurrency(adSetKPIs.effectiveness.costPer3sView)} icon={Play} accentColor="orange" />
            <KPICard title="CPE" value={formatCurrency(adSetKPIs.effectiveness.cpe)} icon={Target} accentColor="orange" />
          </KPISection>
        </div>
      )}

      {/* Ads KPIs - show only when ad is selected */}
      {adsKPIs && (
        <div className="space-y-8">
          <div className="border-b pb-2">
            <h2 className="font-bold text-xl uppercase tracking-wide">Ad</h2>
          </div>
          
          {/* Awareness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold text-lg uppercase tracking-wide">Awareness</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard title="Reach" value={formatNumber(adsKPIs.awareness.reach)} icon={Users} accentColor="blue" />
              <KPICard title="Impressions" value={formatNumber(adsKPIs.awareness.impressions)} icon={Eye} accentColor="blue" />
              <KPICard title="ThruPlays" value={formatNumber(adsKPIs.awareness.thruplays)} icon={Play} accentColor="blue" />
              <KPICard title="3s Views" value={formatNumber(adsKPIs.awareness.video3sPlays)} icon={Play} accentColor="blue" />
              <KPICard title="Frequency" value={adsKPIs.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
            </div>
          </div>

          {/* Engagement Section */}
          <KPISection title="Engagement" icon={MessageCircle}>
            <KPICard title="Link Clicks" value={formatNumber(adsKPIs.engagement.linkClicks)} icon={MousePointer} accentColor="green" />
            <KPICard title="Reactions" value={formatNumber(adsKPIs.engagement.reactions)} icon={Heart} accentColor="green" />
            <KPICard title="Comments" value={formatNumber(adsKPIs.engagement.comments)} icon={MessageCircle} accentColor="green" />
            <KPICard title="Shares" value={formatNumber(adsKPIs.engagement.shares)} icon={Share2} accentColor="green" />
            <KPICard title="Saves" value={formatNumber(adsKPIs.engagement.saves)} icon={Bookmark} accentColor="green" />
            <KPICard title="CTR" value={formatPercent(adsKPIs.engagement.ctr)} icon={Target} accentColor="green" />
            <KPICard title="Engagement Rate" value={formatPercent(adsKPIs.engagement.engagementRate)} icon={TrendingUp} accentColor="green" />
            <KPICard title="ThruPlay Rate" value={formatPercent(adsKPIs.engagement.thruplayRate)} icon={Play} accentColor="green" />
            <KPICard title="3s View Rate" value={formatPercent(adsKPIs.engagement.viewRate3s)} icon={Play} accentColor="green" />
          </KPISection>

          {/* Effectiveness Section */}
          <KPISection title="Effectiveness" icon={BarChart3}>
            <KPICard title="Total Spend" value={formatCurrency(adsKPIs.effectiveness.spend)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(adsKPIs.effectiveness.cpm)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPC" value={formatCurrency(adsKPIs.effectiveness.cpc)} icon={MousePointer} accentColor="orange" />
            <KPICard title="Cost per ThruPlay" value={formatCurrency(adsKPIs.effectiveness.costPerThruplay)} icon={Play} accentColor="orange" />
            <KPICard title="Cost per 3s View" value={formatCurrency(adsKPIs.effectiveness.costPer3sView)} icon={Play} accentColor="orange" />
            <KPICard title="CPE" value={formatCurrency(adsKPIs.effectiveness.cpe)} icon={Target} accentColor="orange" />
          </KPISection>
        </div>
      )}

      {/* No data message */}
      {!campaignKPIs && !adSetKPIs && !adsKPIs && (
        <Card className="p-8 rounded-[35px] border-foreground">
          <p className="text-muted-foreground text-center">
            Vyber kampaň pro zobrazení KPI.
          </p>
        </Card>
      )}

      {/* Snapshot Trend Chart - Meta + TikTok */}
      {campaignMeta.length > 0 && (
        <SnapshotTrendChart
          spaceId={spaceId}
          campaignIds={campaignMeta.map((c: any) => c.campaign_id).filter(Boolean)}
          entityTypes={["meta_campaign", "tiktok_campaign"]}
        />
      )}
    </div>
  );
};
