import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MousePointer, ImageIcon, X, ArrowUpDown, Loader2, TrendingUp, Play, Link2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { KPICard } from "./KPICard";

interface AdCreativesTabProps {
  reportId: string;
  spaceId: string;
}

interface AdCreative {
  id: string;
  ad_id: string;
  name: string;
  platform: string;
  ad_type: string | null;
  thumbnail_url: string | null;
  url: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  frequency: number | null;
  published_date: string | null;
  video_3s_plays: number | null;
  engagement: number | null;
  link_clicks: number | null;
}

export const AdCreativesTab = ({ reportId, spaceId }: AdCreativesTabProps) => {
  const [adCreatives, setAdCreatives] = useState<AdCreative[]>([]);
  const [campaignKpis, setCampaignKpis] = useState<{ totalSpend: number; totalImpressions: number; total3sViews: number; totalEngagement: number; totalLinkClicks: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedAdType, setSelectedAdType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("cpm");

  useEffect(() => {
    fetchAdCreatives();
  }, [reportId, spaceId]);

  const fetchAdCreatives = async () => {
    setLoading(true);

    const [metaLinksRes, tiktokLinksRes] = await Promise.all([
      supabase.from("report_campaigns").select("brand_campaign_id").eq("report_id", reportId),
      supabase.from("report_tiktok_campaigns").select("tiktok_campaign_id").eq("report_id", reportId),
    ]);

    const metaLinkedIds = metaLinksRes.data?.map((l) => l.brand_campaign_id) || [];
    const tiktokLinkedIds = tiktokLinksRes.data?.map((l) => l.tiktok_campaign_id) || [];

    if (metaLinkedIds.length === 0 && tiktokLinkedIds.length === 0) {
      setAdCreatives([]);
      setLoading(false);
      return;
    }

    let allCreatives: AdCreative[] = [];
    let fallbackKpis: typeof campaignKpis = null;

    // Fetch Meta ads
    if (metaLinkedIds.length > 0) {
      const { data: campaignsData } = await supabase
        .from("brand_campaigns")
        .select("id, campaign_name, amount_spent, impressions, video_3s_plays, link_clicks, post_reactions, post_comments, post_shares, post_saves")
        .in("id", metaLinkedIds)
        .or("age.is.null,age.eq.")
        .or("gender.is.null,gender.eq.");
      const metaCampaignMap = Object.fromEntries((campaignsData || []).map((c: any) => [c.id, c.campaign_name]));

      const { data: adSetsData } = await supabase
        .from("brand_ad_sets" as any)
        .select("id, adset_name, brand_campaign_id, age, gender")
        .eq("space_id", spaceId)
        .in("brand_campaign_id", metaLinkedIds);

      // Deduplicate ad sets by id, keep summary rows (empty/null age+gender)
      const adSetsSeen = new Set<string>();
      const adSetsDeduped = (adSetsData || []).filter((a: any) => {
        const isAgeEmpty = !a.age || a.age === "";
        const isGenderEmpty = !a.gender || a.gender === "";
        if (!isAgeEmpty || !isGenderEmpty) return false;
        if (adSetsSeen.has(a.id)) return false;
        adSetsSeen.add(a.id);
        return true;
      });

      const adSetIds = adSetsDeduped.map((a: any) => a.id);
      const adSetMap = Object.fromEntries(adSetsDeduped.map((a: any) => [a.id, { adset_name: a.adset_name, campaign_id: a.brand_campaign_id }]));

      // If no ad sets, aggregate campaign-level data as fallback KPIs
      if (adSetIds.length === 0 && (campaignsData || []).length > 0) {
        const kpiTotals = (campaignsData || []).reduce((acc: any, c: any) => ({
          totalSpend: acc.totalSpend + (c.amount_spent || 0),
          totalImpressions: acc.totalImpressions + (c.impressions || 0),
          total3sViews: acc.total3sViews + (c.video_3s_plays || 0),
          totalEngagement: acc.totalEngagement + (c.post_reactions || 0) + (c.post_comments || 0) + (c.post_shares || 0) + (c.post_saves || 0),
          totalLinkClicks: acc.totalLinkClicks + (c.link_clicks || 0),
        }), { totalSpend: 0, totalImpressions: 0, total3sViews: 0, totalEngagement: 0, totalLinkClicks: 0 });
        fallbackKpis = kpiTotals;
      }

      if (adSetIds.length > 0) {
        const { data: adsRaw, error } = await supabase
          .from("brand_ads")
          .select("id, ad_id, ad_name, brand_ad_set_id, amount_spent, impressions, clicks, ctr, frequency, date_start, thumbnail_url, video_3s_plays, post_reactions, post_comments, post_shares, post_saves, link_clicks, age, gender")
          .eq("space_id", spaceId)
          .in("brand_ad_set_id", adSetIds)
          .order("amount_spent", { ascending: false });

        // Keep only summary rows (no demographic breakdown)
        const data = (adsRaw || []).filter((r: any) => (!r.age || r.age === "") && (!r.gender || r.gender === ""));

        if (!error && data) {
          allCreatives.push(...data.map((row: any) => {
            const adSetInfo = adSetMap[row.brand_ad_set_id] || {};
            const campaignName = metaCampaignMap[adSetInfo.campaign_id] || null;
            const engagement = (row.post_reactions || 0) + (row.post_comments || 0) + (row.post_shares || 0) + (row.post_saves || 0);
            return {
              id: row.id,
              ad_id: row.ad_id,
              name: row.ad_name || "Unnamed Ad",
              platform: "meta",
              ad_type: null,
              thumbnail_url: row.thumbnail_url || null,
              url: null,
              campaign_name: campaignName,
              adset_name: adSetInfo.adset_name || null,
              spend: row.amount_spent,
              impressions: row.impressions,
              clicks: row.clicks,
              ctr: row.ctr,
              frequency: row.frequency,
              published_date: row.date_start,
              video_3s_plays: row.video_3s_plays || 0,
              engagement,
              link_clicks: row.link_clicks || 0,
            };
          }));
        }
      }
    }

    // Fetch TikTok ads
    if (tiktokLinkedIds.length > 0) {
      const { data: tiktokCampaignsData } = await supabase
        .from("tiktok_campaigns")
        .select("id, campaign_name")
        .in("id", tiktokLinkedIds);
      const tiktokCampaignMap = Object.fromEntries((tiktokCampaignsData || []).map((c: any) => [c.id, c.campaign_name]));

      const { data: adGroupsData } = await supabase
        .from("tiktok_ad_groups")
        .select("id, adgroup_name, tiktok_campaign_id")
        .eq("space_id", spaceId)
        .in("tiktok_campaign_id", tiktokLinkedIds);

      const adGroupIds = (adGroupsData || []).map((a: any) => a.id);
      const adGroupMap = Object.fromEntries((adGroupsData || []).map((a: any) => [a.id, { adgroup_name: a.adgroup_name, campaign_id: a.tiktok_campaign_id }]));

      if (adGroupIds.length > 0) {
        const { data, error } = await supabase
          .from("tiktok_ads")
          .select("id, ad_id, ad_name, tiktok_ad_group_id, amount_spent, impressions, clicks, ctr, frequency, thumbnail_url, video_watched_2s, likes, comments, shares, link_clicks")
          .eq("space_id", spaceId)
          .in("tiktok_ad_group_id", adGroupIds)
          .order("amount_spent", { ascending: false });

        if (!error && data) {
          allCreatives.push(...data.map((row: any) => {
            const adGroupInfo = adGroupMap[row.tiktok_ad_group_id] || {};
            const campaignName = tiktokCampaignMap[adGroupInfo.campaign_id] || null;
            const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
            return {
              id: row.id,
              ad_id: row.ad_id,
              name: row.ad_name || "Unnamed Ad",
              platform: "tiktok",
              ad_type: null,
              thumbnail_url: row.thumbnail_url || null,
              url: null,
              campaign_name: campaignName,
              adset_name: adGroupInfo.adgroup_name || null,
              spend: row.amount_spent,
              impressions: row.impressions,
              clicks: row.clicks,
              ctr: row.ctr,
              frequency: row.frequency,
              published_date: null,
              video_3s_plays: row.video_watched_2s || 0,
              engagement,
              link_clicks: row.link_clicks || 0,
            };
          }));
        }
      }
    }

    allCreatives.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    setAdCreatives(allCreatives);
    setCampaignKpis(allCreatives.length === 0 ? fallbackKpis : null);
    setLoading(false);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrencyWhole = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return `${Math.round(amount).toLocaleString("cs-CZ")} Kč`;
  };

  const uniqueCampaigns = useMemo(() => {
    return Array.from(new Set(adCreatives.filter(item => item.campaign_name).map(item => item.campaign_name!)))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [adCreatives]);

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(adCreatives.map(item => item.platform))).sort();
  }, [adCreatives]);

  const uniqueAdTypes = useMemo(() => {
    return Array.from(new Set(adCreatives.filter(item => item.ad_type).map(item => item.ad_type!)))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [adCreatives]);

  const filteredCreatives = useMemo(() => {
    let filtered = adCreatives.filter(item => {
      if (dateRange?.from && item.published_date) {
        const pubDate = new Date(item.published_date);
        if (pubDate < dateRange.from) return false;
        if (dateRange.to && pubDate > dateRange.to) return false;
      }
      if (selectedCampaign !== "all" && item.campaign_name !== selectedCampaign) return false;
      if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;
      if (selectedAdType !== "all" && item.ad_type !== selectedAdType) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const cpmA = (a.impressions || 0) > 0 && a.spend ? (a.spend / a.impressions!) * 1000 : Infinity;
      const cpmB = (b.impressions || 0) > 0 && b.spend ? (b.spend / b.impressions!) * 1000 : Infinity;
      switch (sortBy) {
        case "cpm":
          return cpmA - cpmB; // lowest first
        case "impressions":
          return (b.impressions || 0) - (a.impressions || 0);
        case "video_3s_plays":
          return (b.video_3s_plays || 0) - (a.video_3s_plays || 0);
        case "engagement":
          return (b.engagement || 0) - (a.engagement || 0);
        case "link_clicks":
          return (b.link_clicks || 0) - (a.link_clicks || 0);
        case "spend":
        default:
          return (b.spend || 0) - (a.spend || 0);
      }
    });
  }, [adCreatives, dateRange, selectedCampaign, selectedPlatform, selectedAdType, sortBy]);

  // Calculate KPIs (use campaign-level fallback when no individual ads available)
  const kpis = useMemo(() => {
    if (campaignKpis && filteredCreatives.length === 0) {
      const avgCpm = campaignKpis.totalImpressions > 0 ? (campaignKpis.totalSpend / campaignKpis.totalImpressions) * 1000 : 0;
      return { ...campaignKpis, avgCpm };
    }
    const totalSpend = filteredCreatives.reduce((sum, item) => sum + (item.spend || 0), 0);
    const totalImpressions = filteredCreatives.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const total3sViews = filteredCreatives.reduce((sum, item) => sum + (item.video_3s_plays || 0), 0);
    const totalEngagement = filteredCreatives.reduce((sum, item) => sum + (item.engagement || 0), 0);
    const totalLinkClicks = filteredCreatives.reduce((sum, item) => sum + (item.link_clicks || 0), 0);

    return { totalSpend, totalImpressions, avgCpm, total3sViews, totalEngagement, totalLinkClicks };
  }, [filteredCreatives, campaignKpis]);

  const hasActiveFilters = dateRange || selectedCampaign !== "all" || selectedPlatform !== "all" || selectedAdType !== "all";

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedCampaign("all");
    setSelectedPlatform("all");
    setSelectedAdType("all");
  };

  const getPreviewIframeUrl = (item: AdCreative): string | null => {
    if (!item.thumbnail_url) return null;
    if (/tiktokcdn/i.test(item.thumbnail_url)) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'rltxqoupobfohrkrbtib';
      return `https://${projectId}.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(item.thumbnail_url)}`;
    }
    return item.thumbnail_url;
  };

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <p className="text-muted-foreground">Loading ad creatives...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Spend" value={formatCurrencyWhole(kpis.totalSpend)} icon={Wallet} accentColor="orange" />
        <KPICard title="Impressions" value={formatNumber(kpis.totalImpressions)} icon={Eye} />
        <KPICard 
          title="Avg CPM" 
          value={formatCurrencyWhole(kpis.avgCpm)} 
          icon={Wallet} 
          accentColor="blue"
          tooltip="CPM = (Total Spend / Impressions) × 1000" 
        />
        <KPICard title="3s Views" value={formatNumber(kpis.total3sViews)} icon={Play} accentColor="orange" />
        <KPICard title="Engagement" value={formatNumber(kpis.totalEngagement)} icon={TrendingUp} accentColor="green" />
        <KPICard title="Link Clicks" value={formatNumber(kpis.totalLinkClicks)} icon={Link2} accentColor="blue" />
      </div>

      <Card className="p-8 rounded-[35px] border-foreground">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Ad Creatives</h2>
          <p className="text-muted-foreground">
            Visual overview of ad performance across campaigns
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                  dateRange
                    ? "border-accent-orange bg-accent-orange text-foreground"
                    : "border-foreground bg-card text-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className={cn(
              "w-[180px] rounded-[35px]",
              selectedCampaign !== "all" ? "border-accent-orange bg-accent-orange text-foreground" : ""
            )}>
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {uniqueCampaigns.map((campaign) => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className={cn(
              "w-[180px] rounded-[35px]",
              selectedPlatform !== "all" ? "border-accent-orange bg-accent-orange text-foreground" : ""
            )}>
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {uniquePlatforms.map((platform) => (
                <SelectItem key={platform} value={platform} className="capitalize">{platform}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {uniqueAdTypes.length > 0 && (
            <Select value={selectedAdType} onValueChange={setSelectedAdType}>
              <SelectTrigger className={cn(
                "w-[180px] rounded-[35px]",
                selectedAdType !== "all" ? "border-accent-orange bg-accent-orange text-foreground" : ""
              )}>
                <SelectValue placeholder="All ad types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ad types</SelectItem>
                {uniqueAdTypes.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className={cn(
              "w-[180px] rounded-[35px]",
              sortBy !== "spend" ? "border-accent-orange bg-accent-orange text-foreground" : ""
            )}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cpm">CPM (lowest)</SelectItem>
              <SelectItem value="impressions">Impressions</SelectItem>
              <SelectItem value="video_3s_plays">3s Views</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="link_clicks">Link Clicks</SelectItem>
              <SelectItem value="spend">Spend (highest)</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-[35px]">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {filteredCreatives.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {adCreatives.length === 0 && campaignKpis
              ? "Individual ad data is not available — data was imported at campaign level only. KPI totals above reflect campaign-level aggregates."
              : adCreatives.length === 0
              ? "No ad creatives yet. Add ads in the Data tab."
              : "No ads match your filters."}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredCreatives.map((item) => {
              const iframeUrl = getPreviewIframeUrl(item);
              const cpm = item.impressions && item.impressions > 0 && item.spend
                ? (item.spend / item.impressions) * 1000
                : null;
              
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[9/12.8] bg-muted overflow-hidden">
                    {iframeUrl ? (
                      <img
                        src={iframeUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement?.querySelector('.placeholder')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={cn("w-full h-full flex flex-col items-center justify-center gap-2 placeholder", iframeUrl ? "hidden absolute inset-0" : "")}>
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-card text-card-foreground border border-foreground capitalize text-[10px] px-1.5 py-0.5">
                        {item.platform}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <span className="font-medium text-xs truncate block">{item.name}</span>

                    {item.campaign_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{item.campaign_name}</p>
                    )}

                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Wallet className="w-3 h-3 flex-shrink-0" />
                        <span>{formatCurrencyWhole(item.spend || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3 h-3 flex-shrink-0" />
                        <span>{formatNumber(item.impressions)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Wallet className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px]">CPM {cpm !== null ? formatCurrencyWhole(cpm) : "-"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Play className="w-3 h-3 flex-shrink-0" />
                        <span>{formatNumber(item.video_3s_plays)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-3 h-3 flex-shrink-0" />
                        <span>{formatNumber(item.engagement)}</span>
                      </div>
                      {(item.link_clicks || 0) > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Link2 className="w-3 h-3 flex-shrink-0" />
                          <span>{formatNumber(item.link_clicks)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
