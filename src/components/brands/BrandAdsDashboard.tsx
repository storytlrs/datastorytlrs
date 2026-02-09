import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Eye, MousePointer, TrendingUp, Target, RefreshCw, Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { TopContentGrid, TopContentItem } from "./TopContentGrid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

interface BrandAdsDashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

interface AdSetRow {
  id: string;
  ad_name: string | null;
  platform: string;
  amount_spent: number | null;
  impressions: number | null;
  link_clicks: number | null;
  ctr: number | null;
  frequency: number | null;
  date_start: string | null;
}

interface AdCreative {
  id: string;
  name: string;
  platform: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  ctr: number | null;
  roas: number | null;
  frequency: number | null;
  thumbnail_url: string | null;
  url: string | null;
  published_date: string | null;
  brand_campaign_id: string | null;
}

type MetricKey = "spend" | "impressions" | "clicks" | "ctr" | "roas";

interface BrandCampaign {
  id: string;
  campaign_name: string | null;
  campaign_id: string;
}

const BrandAdsDashboard = ({ spaceId, filters }: BrandAdsDashboardProps) => {
  const [adCreatives, setAdCreatives] = useState<AdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<BrandCampaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [campaignFilterOpen, setCampaignFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("spend");
  const [currency, setCurrency] = useState("CZK");

  useEffect(() => {
    fetchData();
  }, [spaceId, filters, selectedCampaignIds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch campaigns for this space
      const { data: campaignsData } = await supabase
        .from("brand_campaigns")
        .select("id, campaign_name, campaign_id")
        .eq("space_id", spaceId)
        .order("campaign_name");

      setCampaigns((campaignsData || []) as BrandCampaign[]);

      // Build ad sets query - filter by selected campaigns if any
      let adsQuery = supabase
        .from("brand_ad_sets" as any)
        .select("id, adset_name, amount_spent, impressions, clicks, ctr, frequency, date_start, brand_campaign_id")
        .eq("space_id", spaceId);

      if (selectedCampaignIds.length > 0) {
        adsQuery = adsQuery.in("brand_campaign_id", selectedCampaignIds);
      }

      if (filters.platform !== "all") {
        adsQuery = adsQuery.eq("platform", filters.platform as "instagram" | "tiktok" | "youtube" | "facebook" | "twitter");
      }

      const { data: adsData, error: adsError } = await adsQuery;
      if (adsError) throw adsError;

      const mappedData: AdCreative[] = ((adsData || []) as any[]).map((row: any) => ({
        id: row.id,
        name: row.adset_name || "Unnamed Ad",
        platform: "facebook",
        spend: row.amount_spent,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: null,
        ctr: row.ctr,
        roas: null,
        frequency: row.frequency,
        thumbnail_url: null,
        url: null,
        published_date: row.date_start,
        brand_campaign_id: row.brand_campaign_id,
      }));

      setAdCreatives(mappedData);
    } catch (error) {
      console.error("Failed to fetch ads data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const removeCampaign = (id: string) => {
    setSelectedCampaignIds(prev => prev.filter(cid => cid !== id));
  };

  const clearCampaigns = () => setSelectedCampaignIds([]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalSpend = adCreatives.reduce((sum, a) => sum + (a.spend || 0), 0);
    const totalImpressions = adCreatives.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalClicks = adCreatives.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const totalConversions = adCreatives.reduce((sum, a) => sum + (a.conversions || 0), 0);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgRoas = adCreatives.length > 0
      ? adCreatives.reduce((sum, a) => sum + (a.roas || 0), 0) / adCreatives.filter(a => a.roas).length || 0
      : 0;
    const avgFrequency = adCreatives.length > 0
      ? adCreatives.reduce((sum, a) => sum + (a.frequency || 0), 0) / adCreatives.filter(a => a.frequency).length || 0
      : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    return {
      totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      ctr,
      roas: avgRoas,
      frequency: avgFrequency,
      cpm,
      cpc,
    };
  }, [adCreatives]);

  // Campaign-based chart data
  const chartData = useMemo(() => {
    const campaignData: Record<string, {
      campaignId: string;
      name: string;
      spend: number;
      impressions: number;
      clicks: number;
      totalRoas: number;
      roasCount: number;
    }> = {};

    adCreatives.forEach(a => {
      const cId = a.brand_campaign_id || "unknown";
      const campaign = campaigns.find(c => c.id === cId);
      const campaignName = campaign?.campaign_name || campaign?.campaign_id || "Unknown";

      if (!campaignData[cId]) {
        campaignData[cId] = {
          campaignId: cId,
          name: campaignName,
          spend: 0,
          impressions: 0,
          clicks: 0,
          totalRoas: 0,
          roasCount: 0,
        };
      }

      campaignData[cId].spend += a.spend || 0;
      campaignData[cId].impressions += a.impressions || 0;
      campaignData[cId].clicks += a.clicks || 0;
      if (a.roas) {
        campaignData[cId].totalRoas += a.roas;
        campaignData[cId].roasCount += 1;
      }
    });

    return Object.values(campaignData)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => ({
        name: d.name,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        roas: d.roasCount > 0 ? d.totalRoas / d.roasCount : 0,
      }));
  }, [adCreatives, campaigns]);

  // Top 5 ad creatives by composite score
  const topContent: TopContentItem[] = useMemo(() => {
    if (adCreatives.length === 0) return [];

    const maxRoas = Math.max(...adCreatives.map(a => a.roas || 0), 1);
    const maxCtr = Math.max(...adCreatives.map(a => a.ctr || 0), 1);
    const maxConversions = Math.max(...adCreatives.map(a => a.conversions || 0), 1);
    const maxClicks = Math.max(...adCreatives.map(a => a.clicks || 0), 1);

    return adCreatives
      .map(a => {
        const score =
          ((a.roas || 0) / maxRoas) * 0.35 +
          ((a.ctr || 0) / maxCtr) * 0.30 +
          ((a.conversions || 0) / maxConversions) * 0.20 +
          ((a.clicks || 0) / maxClicks) * 0.15;

        return {
          id: a.id,
          thumbnailUrl: a.thumbnail_url,
          contentType: "ad",
          platform: a.platform,
          views: a.impressions || 0,
          engagementRate: a.ctr || 0,
          url: a.url,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [adCreatives]);

  const metricLabels: Record<MetricKey, string> = {
    spend: "Spend",
    impressions: "Impressions",
    clicks: "Clicks",
    ctr: "CTR (%)",
    roas: "ROAS",
  };

  const formatChartValue = (value: number, metric: MetricKey): string => {
    switch (metric) {
      case "spend":
        return formatCurrency(value, currency);
      case "ctr":
        return `${value.toFixed(2)}%`;
      case "roas":
        return value.toFixed(2);
      default:
        return value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p>Loading ads data...</p>
      </div>
    );
  }

  if (adCreatives.length === 0) {
  return (
    <div className="space-y-8">
      {/* Campaign Filter */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Popover open={campaignFilterOpen} onOpenChange={setCampaignFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "rounded-[35px] justify-between min-w-[200px] hover:border-foreground hover:bg-foreground hover:text-background",
                    selectedCampaignIds.length > 0
                      ? "border-accent-orange bg-accent-orange text-foreground"
                      : "border-foreground bg-card text-foreground"
                  )}
                >
                  {selectedCampaignIds.length > 0
                    ? `${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? "s" : ""} selected`
                    : "All campaigns"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                          value={campaign.campaign_name || campaign.campaign_id}
                          onSelect={() => toggleCampaign(campaign.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCampaignIds.includes(campaign.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {campaign.campaign_name || campaign.campaign_id}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCampaignIds.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearCampaigns}
                className="rounded-[35px] text-sm"
              >
                Clear
              </Button>
            )}
          </div>

          {selectedCampaignIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCampaignIds.map((id) => {
                const campaign = campaigns.find((c) => c.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="rounded-full px-3 py-1 flex items-center gap-1 cursor-pointer"
                    onClick={() => removeCampaign(id)}
                  >
                    <Check className="h-3 w-3" />
                    {campaign?.campaign_name || campaign?.campaign_id || id}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
        <Card className="p-12 rounded-[35px] border-foreground border-dashed">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <DollarSign className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Ads Data Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Ads data will appear here once you have Ads campaign reports with data,
              or when automatic ads import is configured.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Campaign Filter */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Popover open={campaignFilterOpen} onOpenChange={setCampaignFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "rounded-[35px] justify-between min-w-[200px] hover:border-foreground hover:bg-foreground hover:text-background",
                    selectedCampaignIds.length > 0
                      ? "border-accent-orange bg-accent-orange text-foreground"
                      : "border-foreground bg-card text-foreground"
                  )}
                >
                  {selectedCampaignIds.length > 0
                    ? `${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? "s" : ""} selected`
                    : "All campaigns"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                          value={campaign.campaign_name || campaign.campaign_id}
                          onSelect={() => toggleCampaign(campaign.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCampaignIds.includes(campaign.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {campaign.campaign_name || campaign.campaign_id}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCampaignIds.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearCampaigns}
                className="rounded-[35px] text-sm"
              >
                Clear
              </Button>
            )}
          </div>

          {selectedCampaignIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCampaignIds.map((id) => {
                const campaign = campaigns.find((c) => c.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="rounded-full px-3 py-1 flex items-center gap-1 cursor-pointer"
                    onClick={() => removeCampaign(id)}
                  >
                    <Check className="h-3 w-3" />
                    {campaign?.campaign_name || campaign?.campaign_id || id}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bar Chart */}
      <Card className="p-6 rounded-[35px] border-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold">Campaign Performance</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => setSelectedMetric(key)}
                className={cn(
                  "rounded-[35px] hover:border-foreground hover:bg-foreground hover:text-background",
                  selectedMetric === key
                    ? "border-accent-orange bg-accent-orange text-foreground"
                    : "border-foreground bg-card text-foreground"
                )}
              >
                {metricLabels[key]}
              </Button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis
                stroke="hsl(var(--foreground))"
                tickFormatter={(value) => formatChartValue(value, selectedMetric)}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatChartValue(value, selectedMetric),
                  metricLabels[selectedMetric]
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey={selectedMetric} fill="hsl(var(--accent-green))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available for the selected filters
          </div>
        )}
      </Card>

      {/* Top 5 Ad Creatives */}
      <TopContentGrid items={topContent} title="Top 5 Ad Creatives" emptyMessage="No ad creatives found" />

      {/* KPI Tiles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Spend"
            value={formatCurrency(kpis.totalSpend, currency)}
            icon={DollarSign}
            accentColor="orange"
            tooltip="Total advertising spend"
          />
          <KPICard
            title="Impressions"
            value={kpis.impressions.toLocaleString()}
            icon={Eye}
            tooltip="Total ad impressions"
          />
          <KPICard
            title="Clicks"
            value={kpis.clicks.toLocaleString()}
            icon={MousePointer}
            tooltip="Total ad clicks"
          />
          <KPICard
            title="CTR"
            value={`${kpis.ctr.toFixed(2)}%`}
            icon={TrendingUp}
            accentColor="green"
            tooltip="Click-through rate (clicks / impressions × 100)"
          />
          <KPICard
            title="Conversions"
            value={kpis.conversions.toLocaleString()}
            icon={Target}
            tooltip="Total conversions from ads"
          />
          <KPICard
            title="ROAS"
            value={kpis.roas.toFixed(2)}
            icon={TrendingUp}
            accentColor="green"
            tooltip="Return on Ad Spend"
          />
          <KPICard
            title="CPM"
            value={formatCurrency(kpis.cpm, currency)}
            icon={DollarSign}
            tooltip="Cost per 1000 impressions"
          />
          <KPICard
            title="CPC"
            value={formatCurrency(kpis.cpc, currency)}
            icon={MousePointer}
            tooltip="Cost per click"
          />
        </div>
      </div>
    </div>
  );
};

export default BrandAdsDashboard;
