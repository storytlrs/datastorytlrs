import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, ArrowUpDown, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currencyUtils";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

interface BrandContentDashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

interface AdCreative {
  id: string;
  ad_name: string | null;
  thumbnail_url: string | null;
  amount_spent: number | null;
  impressions: number | null;
  clicks: number | null;
  cpm: number | null;
  ctr: number | null;
  video_3s_plays: number | null;
  link_clicks: number | null;
  engagement: number; // computed
  date_start: string | null;
  platform: "meta" | "tiktok";
}

type SortMetric = "cpm" | "impressions" | "video_3s_plays" | "engagement" | "link_clicks";
type SortDirection = "best" | "worst";

const SORT_METRIC_LABELS: Record<SortMetric, string> = {
  cpm: "CPM",
  impressions: "Impressions",
  video_3s_plays: "3s Views",
  engagement: "Engagement",
  link_clicks: "Link Clicks",
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString("cs-CZ");
};

const BrandContentDashboard = ({ spaceId, filters }: BrandContentDashboardProps) => {
  const [metaAds, setMetaAds] = useState<AdCreative[]>([]);
  const [tiktokAds, setTiktokAds] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);

  // Local filters
  const [platformFilter, setPlatformFilter] = useState<"all" | "meta" | "tiktok">("all");
  const [sortMetric, setSortMetric] = useState<SortMetric>("impressions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("best");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [spaceId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Meta ads (only rows with thumbnails, aggregate/total rows)
      const { data: metaData } = await supabase
        .from("brand_ads")
        .select("id, ad_name, thumbnail_url, amount_spent, impressions, clicks, cpm, ctr, video_3s_plays, link_clicks, post_reactions, post_comments, post_shares, post_saves, date_start, publisher_platform")
        .eq("space_id", spaceId)
        .eq("age", "")
        .eq("gender", "");

      // Fetch TikTok ads
      const { data: tkCampaigns } = await supabase
        .from("tiktok_campaigns")
        .select("id")
        .eq("space_id", spaceId);

      const tkCampaignIds = tkCampaigns?.map(c => c.id) || [];

      let tkAdsData: any[] = [];
      if (tkCampaignIds.length > 0) {
        const { data: tkAdGroups } = await supabase
          .from("tiktok_ad_groups")
          .select("id")
          .in("tiktok_campaign_id", tkCampaignIds);

        const tkAdGroupIds = tkAdGroups?.map(ag => ag.id) || [];

        if (tkAdGroupIds.length > 0) {
          const { data } = await supabase
            .from("tiktok_ads")
            .select("id, ad_name, thumbnail_url, amount_spent, impressions, clicks, cpm, ctr, video_watched_2s, link_clicks, likes, comments, shares, follows")
            .in("tiktok_ad_group_id", tkAdGroupIds);
          tkAdsData = data || [];
        }
      }

      // Normalize Meta
      const normalizedMeta: AdCreative[] = (metaData || [])
        .filter(a => a.thumbnail_url)
        .map(a => ({
          id: a.id,
          ad_name: a.ad_name,
          thumbnail_url: a.thumbnail_url,
          amount_spent: a.amount_spent,
          impressions: a.impressions,
          clicks: a.clicks,
          cpm: a.cpm,
          ctr: a.ctr,
          video_3s_plays: a.video_3s_plays,
          link_clicks: a.link_clicks,
          engagement: (a.post_reactions || 0) + (a.post_comments || 0) + (a.post_shares || 0) + (a.post_saves || 0),
          date_start: a.date_start,
          platform: "meta" as const,
        }));

      // Normalize TikTok
      const normalizedTk: AdCreative[] = (tkAdsData || [])
        .filter((a: any) => a.thumbnail_url)
        .map((a: any) => ({
          id: a.id,
          ad_name: a.ad_name,
          thumbnail_url: a.thumbnail_url,
          amount_spent: a.amount_spent,
          impressions: a.impressions,
          clicks: a.clicks,
          cpm: a.cpm,
          ctr: a.ctr,
          video_3s_plays: a.video_watched_2s || 0,
          link_clicks: a.link_clicks,
          engagement: (a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.follows || 0),
          date_start: null,
          platform: "tiktok" as const,
        }));

      setMetaAds(normalizedMeta);
      setTiktokAds(normalizedTk);
    } catch (error) {
      console.error("Failed to fetch ad creatives:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let all: AdCreative[] = [];
    if (platformFilter === "all") all = [...metaAds, ...tiktokAds];
    else if (platformFilter === "meta") all = [...metaAds];
    else all = [...tiktokAds];

    // Date filter
    if (dateFrom) {
      all = all.filter(a => {
        if (!a.date_start) return true;
        return new Date(a.date_start) >= dateFrom;
      });
    }
    if (dateTo) {
      all = all.filter(a => {
        if (!a.date_start) return true;
        return new Date(a.date_start) <= dateTo;
      });
    }

    // Sort
    all.sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortMetric) {
        case "cpm":
          aVal = a.cpm || 9999999;
          bVal = b.cpm || 9999999;
          // CPM: lower = better
          return sortDirection === "best" ? aVal - bVal : bVal - aVal;
        case "impressions":
          aVal = a.impressions || 0;
          bVal = b.impressions || 0;
          return sortDirection === "best" ? bVal - aVal : aVal - bVal;
        case "video_3s_plays":
          aVal = a.video_3s_plays || 0;
          bVal = b.video_3s_plays || 0;
          return sortDirection === "best" ? bVal - aVal : aVal - bVal;
        case "engagement":
          aVal = a.engagement || 0;
          bVal = b.engagement || 0;
          return sortDirection === "best" ? bVal - aVal : aVal - bVal;
        case "link_clicks":
          aVal = a.link_clicks || 0;
          bVal = b.link_clicks || 0;
          return sortDirection === "best" ? bVal - aVal : aVal - bVal;
        default:
          return 0;
      }
    });

    return all.slice(0, 15);
  }, [metaAds, tiktokAds, platformFilter, sortMetric, sortDirection, dateFrom, dateTo]);

  const getSortMetricValue = (ad: AdCreative): string => {
    switch (sortMetric) {
      case "cpm": return ad.cpm ? formatCurrency(ad.cpm, "CZK") : "–";
      case "impressions": return formatNumber(ad.impressions || 0);
      case "video_3s_plays": return formatNumber(ad.video_3s_plays || 0);
      case "engagement": return formatNumber(ad.engagement || 0);
      case "link_clicks": return formatNumber(ad.link_clicks || 0);
      default: return "–";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p>Loading creatives...</p>
      </div>
    );
  }

  const totalAds = metaAds.length + tiktokAds.length;

  if (totalAds === 0) {
    return (
      <div className="space-y-8">
        <Card className="p-12 rounded-[35px] border-foreground border-dashed">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Ad Creatives Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Ad creatives will appear here once you have ads with thumbnails imported for this brand.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4 rounded-[35px] border-foreground">
        <div className="flex flex-wrap items-end gap-4">
          {/* Platform */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Platform</Label>
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
              <SelectTrigger className="w-[130px] rounded-[35px] border-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort metric */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sortMetric} onValueChange={(v) => setSortMetric(v as SortMetric)}>
              <SelectTrigger className="w-[150px] rounded-[35px] border-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SORT_METRIC_LABELS) as [SortMetric, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort direction */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Order</Label>
            <Button
              variant="outline"
              className="rounded-[35px] border-foreground gap-2"
              onClick={() => setSortDirection(d => d === "best" ? "worst" : "best")}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortDirection === "best" ? "Best first" : "Worst first"}
            </Button>
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-[35px] border-foreground gap-2 w-[140px] justify-start">
                  <CalendarIcon className="w-4 h-4" />
                  {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "–"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-[35px] border-foreground gap-2 w-[140px] justify-start">
                  <CalendarIcon className="w-4 h-4" />
                  {dateTo ? format(dateTo, "dd.MM.yyyy") : "–"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reset */}
          {(dateFrom || dateTo || platformFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-[35px] text-muted-foreground"
              onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPlatformFilter("all"); }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Creatives Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredAndSorted.map((ad, index) => (
          <Card key={ad.id} className="rounded-[20px] border-foreground overflow-hidden hover:shadow-lg transition-shadow relative">
            {/* Rank badge */}
            <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-accent-green text-accent-green-foreground flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>

            {/* Thumbnail */}
            <div className="relative aspect-[9/16] bg-muted overflow-hidden">
              {ad.thumbnail_url ? (
                <img
                  src={ad.thumbnail_url}
                  alt={ad.ad_name || "Ad creative"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.querySelector(".fallback-icon")?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={cn("fallback-icon w-full h-full flex items-center justify-center absolute inset-0", ad.thumbnail_url ? "hidden" : "")}>
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>

              {/* Platform badge */}
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "px-2 py-0.5 backdrop-blur-sm rounded-full text-[10px] font-medium",
                  ad.platform === "meta"
                    ? "bg-accent-cyan/80 text-foreground"
                    : "bg-foreground/80 text-background"
                )}>
                  {ad.platform === "meta" ? "Meta" : "TikTok"}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              {ad.ad_name && (
                <p className="text-xs font-semibold truncate" title={ad.ad_name}>
                  {ad.ad_name}
                </p>
              )}

              {/* Primary sorted metric highlighted */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">{SORT_METRIC_LABELS[sortMetric]}</span>
                  <p className="font-bold text-sm">{getSortMetricValue(ad)}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Impr.</span>
                  <p className="font-bold">{formatNumber(ad.impressions || 0)}</p>
                </div>
              </div>

              {/* Date */}
              {ad.date_start && (
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(ad.date_start), "dd.MM.yyyy")}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground border border-dashed border-border rounded-[35px]">
          No creatives match the selected filters
        </div>
      )}
    </div>
  );
};

export default BrandContentDashboard;
