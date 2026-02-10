import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MousePointer, DollarSign, ImageIcon, X, ArrowUpDown, Loader2, TrendingUp } from "lucide-react";
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
import { formatCurrencySimple } from "@/lib/currencyUtils";
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
  conversions: number | null;
  ctr: number | null;
  roas: number | null;
  frequency: number | null;
  published_date: string | null;
}

export const AdCreativesTab = ({ reportId, spaceId }: AdCreativesTabProps) => {
  const [adCreatives, setAdCreatives] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedAdType, setSelectedAdType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("spend");
  const [adPreviews, setAdPreviews] = useState<Record<string, string | null>>({});
  const [previewsLoading, setPreviewsLoading] = useState(false);

  useEffect(() => {
    fetchAdCreatives();
  }, [reportId, spaceId]);

  const fetchAdCreatives = async () => {
    setLoading(true);

    // Fetch linked campaign IDs for this report
    const { data: links } = await supabase
      .from("report_campaigns")
      .select("brand_campaign_id")
      .eq("report_id", reportId);

    const linkedIds = links?.map((l) => l.brand_campaign_id) || [];

    if (linkedIds.length === 0) {
      setAdCreatives([]);
      setLoading(false);
      return;
    }

    // Get ad sets for linked campaigns
    const { data: adSetsData } = await supabase
      .from("brand_ad_sets" as any)
      .select("id, adset_name, brand_campaign_id")
      .eq("space_id", spaceId)
      .in("brand_campaign_id", linkedIds);

    const adSetIds = (adSetsData || []).map((a: any) => a.id);
    const adSetMap = Object.fromEntries((adSetsData || []).map((a: any) => [a.id, a.adset_name]));

    if (adSetIds.length === 0) {
      setAdCreatives([]);
      setLoading(false);
      return;
    }

    // Get ads for those ad sets
    const { data, error } = await supabase
      .from("brand_ads")
      .select("id, ad_id, ad_name, brand_ad_set_id, amount_spent, impressions, clicks, ctr, frequency, date_start, thumbnail_url")
      .eq("space_id", spaceId)
      .in("brand_ad_set_id", adSetIds)
      .order("amount_spent", { ascending: false });

    if (!error && data) {
      const mappedData: AdCreative[] = (data || []).map((row: any) => ({
        id: row.id,
        ad_id: row.ad_id,
        name: row.ad_name || "Unnamed Ad",
        platform: "facebook",
        ad_type: null,
        thumbnail_url: row.thumbnail_url || null,
        url: null,
        campaign_name: null,
        adset_name: adSetMap[row.brand_ad_set_id] || null,
        spend: row.amount_spent,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: null,
        ctr: row.ctr,
        roas: null,
        frequency: row.frequency,
        published_date: row.date_start,
      }));
      setAdCreatives(mappedData);
    }
    setLoading(false);
  };

  // Fetch ad previews from Meta API
  const fetchPreviews = useCallback(async (adIds: string[]) => {
    if (adIds.length === 0) return;
    setPreviewsLoading(true);
    try {
      const response = await supabase.functions.invoke("fetch-ad-previews", {
        body: { adIds },
      });
      if (response.data?.previews) {
        setAdPreviews(prev => ({ ...prev, ...response.data.previews }));
      }
    } catch (err) {
      console.error("Failed to fetch ad previews:", err);
    } finally {
      setPreviewsLoading(false);
    }
  }, []);

  // Fetch previews when creatives load
  useEffect(() => {
    const adIds = adCreatives.map(c => c.ad_id).filter(Boolean);
    if (adIds.length > 0) {
      // Batch in chunks of 10
      const chunks: string[][] = [];
      for (let i = 0; i < adIds.length; i += 10) {
        chunks.push(adIds.slice(i, i + 10));
      }
      chunks.forEach(chunk => fetchPreviews(chunk));
    }
  }, [adCreatives, fetchPreviews]);

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get unique values for filters (sorted A-Z)
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

  // Filter and sort
  const filteredCreatives = useMemo(() => {
    let filtered = adCreatives.filter(item => {
      if (dateRange?.from && item.published_date) {
        const pubDate = new Date(item.published_date);
        if (pubDate < dateRange.from) return false;
        if (dateRange.to && pubDate > dateRange.to) return false;
      }
      
      if (selectedCampaign !== "all" && item.campaign_name !== selectedCampaign) {
        return false;
      }
      
      if (selectedPlatform !== "all" && item.platform !== selectedPlatform) {
        return false;
      }

      if (selectedAdType !== "all" && item.ad_type !== selectedAdType) {
        return false;
      }
      
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "ctr":
          return (b.ctr || 0) - (a.ctr || 0);
        case "roas":
          return (b.roas || 0) - (a.roas || 0);
        case "impressions":
          return (b.impressions || 0) - (a.impressions || 0);
        case "clicks":
          return (b.clicks || 0) - (a.clicks || 0);
        case "spend":
        default:
          return (b.spend || 0) - (a.spend || 0);
      }
    });
  }, [adCreatives, dateRange, selectedCampaign, selectedPlatform, selectedAdType, sortBy]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalSpend = filteredCreatives.reduce((sum, item) => sum + (item.spend || 0), 0);
    const totalImpressions = filteredCreatives.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const totalClicks = filteredCreatives.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const totalConversions = filteredCreatives.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgRoas = filteredCreatives.length > 0 
      ? filteredCreatives.reduce((sum, item) => sum + (item.roas || 0), 0) / filteredCreatives.filter(i => i.roas).length || 0
      : 0;

    return { totalSpend, totalImpressions, totalClicks, totalConversions, avgCtr, avgRoas };
  }, [filteredCreatives]);

  // ROAS coloring
  const { roasP10, roasP90 } = useMemo(() => {
    const roasValues = filteredCreatives.filter(i => i.roas).map(item => item.roas!).sort((a, b) => a - b);
    if (roasValues.length === 0) return { roasP10: 0, roasP90: 0 };
    const p10Index = Math.floor(roasValues.length * 0.1);
    const p90Index = Math.floor(roasValues.length * 0.9);
    return {
      roasP10: roasValues[p10Index] || 0,
      roasP90: roasValues[p90Index] || roasValues[roasValues.length - 1]
    };
  }, [filteredCreatives]);

  const getROASColor = (roas: number | null) => {
    if (!roas) return "bg-muted text-muted-foreground";
    if (roas >= roasP90) return "bg-accent-green text-accent-green-foreground";
    if (roas <= roasP10) return "bg-accent-orange text-accent-orange-foreground";
    return "bg-accent-blue text-white";
  };

  const hasActiveFilters = dateRange || selectedCampaign !== "all" || selectedPlatform !== "all" || selectedAdType !== "all";

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedCampaign("all");
    setSelectedPlatform("all");
    setSelectedAdType("all");
  };

  const getPreviewIframeUrl = (item: AdCreative): string | null => {
    return adPreviews[item.ad_id] || null;
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
        <KPICard title="Total Spend" value={formatCurrencySimple(kpis.totalSpend, "CZK")} icon={DollarSign} accentColor="orange" />
        <KPICard title="Impressions" value={formatNumber(kpis.totalImpressions)} icon={Eye} />
        <KPICard title="Clicks" value={formatNumber(kpis.totalClicks)} icon={MousePointer} />
        <KPICard title="Conversions" value={formatNumber(kpis.totalConversions)} icon={TrendingUp} accentColor="green" />
        <KPICard title="Avg CTR" value={`${kpis.avgCtr.toFixed(2)}%`} icon={MousePointer} />
        <KPICard title="Avg ROAS" value={kpis.avgRoas.toFixed(2)} icon={TrendingUp} accentColor="green" />
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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className={cn(
              "w-[180px] rounded-[35px]",
              sortBy !== "spend" ? "border-accent-orange bg-accent-orange text-foreground" : ""
            )}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Spend (highest)</SelectItem>
              <SelectItem value="roas">ROAS (highest)</SelectItem>
              <SelectItem value="ctr">CTR (highest)</SelectItem>
              <SelectItem value="impressions">Impressions</SelectItem>
              <SelectItem value="clicks">Clicks</SelectItem>
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
            {adCreatives.length === 0 
              ? "No ad creatives yet. Add ads in the Data tab."
              : "No ads match your filters."}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredCreatives.map((item) => {
              const iframeUrl = getPreviewIframeUrl(item);
              
              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[9/12.8] bg-muted overflow-hidden">
                    {iframeUrl ? (
                      <div className="w-full h-full relative">
                        <iframe
                          src={iframeUrl}
                          className="absolute top-0 left-0 border-0"
                          style={{
                            width: "540px",
                            height: "720px",
                            transform: "scale(0.28)",
                            transformOrigin: "top left",
                          }}
                          scrolling="no"
                          allowFullScreen
                        />
                        <div className="absolute inset-0 pointer-events-none" />
                      </div>
                    ) : previewsLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-card text-card-foreground border border-foreground capitalize text-[10px] px-1.5 py-0.5">
                        {item.platform}
                      </Badge>
                    </div>
                    {item.ad_type && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="bg-card/80 text-[10px] px-1.5 py-0.5 capitalize">
                          {item.ad_type}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs truncate">{item.name}</span>
                      <Badge className={cn("text-[10px] px-1.5 py-0.5", getROASColor(item.roas))}>
                        ROAS {item.roas?.toFixed(1) || "-"}
                      </Badge>
                    </div>

                    {item.campaign_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{item.campaign_name}</p>
                    )}

                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>{formatCurrencySimple(item.spend || 0, "CZK")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{formatNumber(item.impressions)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MousePointer className="w-3 h-3" />
                        <span>{formatNumber(item.clicks)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        <span>{item.ctr?.toFixed(2) || 0}%</span>
                      </div>
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
