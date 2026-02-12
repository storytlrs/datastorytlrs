import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Eye, MousePointer, TrendingUp, Target, Loader2 } from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { TopContentGrid, TopContentItem } from "./TopContentGrid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import MultiSelectFilter, { FilterOption } from "./MultiSelectFilter";

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

interface BrandAdsDashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

// Normalized interfaces that work for both Meta and TikTok
interface NormalizedCampaign {
  id: string;
  campaign_name: string | null;
  campaign_id: string;
  platform: "meta" | "tiktok";
}

interface NormalizedAdSet {
  id: string;
  adset_name: string | null;
  adset_id: string;
  campaign_id: string; // normalized parent id
  amount_spent: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  frequency: number | null;
  date_start: string | null;
  platform: "meta" | "tiktok";
}

interface NormalizedAd {
  id: string;
  ad_name: string | null;
  ad_id: string;
  adset_id: string; // normalized parent id
  amount_spent: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  frequency: number | null;
  link_clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  thumbnail_url: string | null;
  platform: "meta" | "tiktok";
}

type MetricKey = "spend" | "impressions" | "clicks" | "ctr" | "roas";

const BrandAdsDashboard = ({ spaceId, filters }: BrandAdsDashboardProps) => {
  const [campaigns, setCampaigns] = useState<NormalizedCampaign[]>([]);
  const [adSets, setAdSets] = useState<NormalizedAdSet[]>([]);
  const [ads, setAds] = useState<NormalizedAd[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdSetIds, setSelectedAdSetIds] = useState<string[]>([]);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("spend");
  const [currency] = useState("CZK");

  useEffect(() => {
    fetchData();
  }, [spaceId, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Meta data
      const [metaCampaigns, metaAdSets, metaAds] = await Promise.all([
        supabase.from("brand_campaigns").select("id, campaign_name, campaign_id").eq("space_id", spaceId).order("campaign_name"),
        supabase.from("brand_ad_sets" as any).select("id, adset_name, adset_id, brand_campaign_id, amount_spent, impressions, clicks, ctr, frequency, date_start").eq("space_id", spaceId),
        supabase.from("brand_ads").select("id, ad_name, ad_id, brand_ad_set_id, amount_spent, impressions, clicks, ctr, frequency, link_clicks, post_reactions, post_comments, post_shares, post_saves, date_start, thumbnail_url").eq("space_id", spaceId),
      ]);

      // Fetch TikTok data
      const [ttCampaigns, ttAdGroups, ttAds] = await Promise.all([
        supabase.from("tiktok_campaigns").select("id, campaign_name, campaign_id").eq("space_id", spaceId).order("campaign_name"),
        supabase.from("tiktok_ad_groups").select("id, adgroup_name, adgroup_id, tiktok_campaign_id, amount_spent, impressions, clicks, ctr, frequency").eq("space_id", spaceId),
        supabase.from("tiktok_ads").select("id, ad_name, ad_id, tiktok_ad_group_id, amount_spent, impressions, clicks, ctr, frequency, link_clicks, likes, comments, shares, thumbnail_url").eq("space_id", spaceId),
      ]);

      // Normalize Meta campaigns
      const normMetaCampaigns: NormalizedCampaign[] = (metaCampaigns.data || []).map((c: any) => ({
        id: c.id,
        campaign_name: c.campaign_name,
        campaign_id: c.campaign_id,
        platform: "meta" as const,
      }));

      // Normalize TikTok campaigns (deduplicate by campaign_id since TikTok has demographic dimensions)
      const ttCampaignMap = new Map<string, NormalizedCampaign>();
      (ttCampaigns.data || []).forEach((c: any) => {
        if (!ttCampaignMap.has(c.id)) {
          ttCampaignMap.set(c.id, {
            id: c.id,
            campaign_name: c.campaign_name,
            campaign_id: c.campaign_id,
            platform: "tiktok" as const,
          });
        }
      });

      // Normalize Meta ad sets
      const normMetaAdSets: NormalizedAdSet[] = (metaAdSets.data || []).map((a: any) => ({
        id: a.id,
        adset_name: a.adset_name,
        adset_id: a.adset_id,
        campaign_id: a.brand_campaign_id,
        amount_spent: a.amount_spent,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        frequency: a.frequency,
        date_start: a.date_start,
        platform: "meta" as const,
      }));

      // Normalize TikTok ad groups -> ad sets
      const normTTAdSets: NormalizedAdSet[] = (ttAdGroups.data || []).map((a: any) => ({
        id: a.id,
        adset_name: a.adgroup_name,
        adset_id: a.adgroup_id,
        campaign_id: a.tiktok_campaign_id,
        amount_spent: a.amount_spent,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        frequency: a.frequency,
        date_start: null,
        platform: "tiktok" as const,
      }));

      // Normalize Meta ads
      const normMetaAds: NormalizedAd[] = (metaAds.data || []).map((a: any) => ({
        id: a.id,
        ad_name: a.ad_name,
        ad_id: a.ad_id,
        adset_id: a.brand_ad_set_id,
        amount_spent: a.amount_spent,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        frequency: a.frequency,
        link_clicks: a.link_clicks,
        post_reactions: a.post_reactions,
        post_comments: a.post_comments,
        post_shares: a.post_shares,
        post_saves: a.post_saves,
        date_start: a.date_start,
        thumbnail_url: a.thumbnail_url,
        platform: "meta" as const,
      }));

      // Normalize TikTok ads
      const normTTAds: NormalizedAd[] = (ttAds.data || []).map((a: any) => ({
        id: a.id,
        ad_name: a.ad_name,
        ad_id: a.ad_id,
        adset_id: a.tiktok_ad_group_id,
        amount_spent: a.amount_spent,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: a.ctr,
        frequency: a.frequency,
        link_clicks: a.link_clicks,
        post_reactions: a.likes,
        post_comments: a.comments,
        post_shares: a.shares,
        post_saves: null,
        date_start: null,
        thumbnail_url: a.thumbnail_url,
        platform: "tiktok" as const,
      }));

      setCampaigns([...normMetaCampaigns, ...Array.from(ttCampaignMap.values())]);
      setAdSets([...normMetaAdSets, ...normTTAdSets]);
      setAds([...normMetaAds, ...normTTAds]);
    } catch (error) {
      console.error("Failed to fetch ads data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset all filters when space changes
  useEffect(() => {
    setSelectedCampaignIds([]);
    setSelectedAdSetIds([]);
    setSelectedAdIds([]);
  }, [spaceId]);

  // Reset child filters when parent changes
  useEffect(() => {
    setSelectedAdSetIds([]);
    setSelectedAdIds([]);
  }, [selectedCampaignIds]);

  useEffect(() => {
    setSelectedAdIds([]);
  }, [selectedAdSetIds]);

  // Filtered ad sets based on selected campaigns
  const filteredAdSets = useMemo(() => {
    if (selectedCampaignIds.length === 0) return adSets;
    return adSets.filter(a => selectedCampaignIds.includes(a.campaign_id));
  }, [adSets, selectedCampaignIds]);

  // Filtered ads based on selected ad sets (or all ad sets from selected campaigns)
  const filteredAds = useMemo(() => {
    const relevantAdSetIds = selectedAdSetIds.length > 0
      ? selectedAdSetIds
      : filteredAdSets.map(a => a.id);
    if (relevantAdSetIds.length === 0 && selectedCampaignIds.length > 0) return [];
    if (relevantAdSetIds.length === 0) return ads;
    return ads.filter(a => relevantAdSetIds.includes(a.adset_id));
  }, [ads, selectedAdSetIds, filteredAdSets, selectedCampaignIds]);

  // Final filtered ads
  const finalAds = useMemo(() => {
    if (selectedAdIds.length > 0) return filteredAds.filter(a => selectedAdIds.includes(a.id));
    return filteredAds;
  }, [filteredAds, selectedAdIds]);

  // Final filtered ad sets
  const finalAdSets = useMemo(() => {
    if (selectedAdSetIds.length > 0) return filteredAdSets.filter(a => selectedAdSetIds.includes(a.id));
    return filteredAdSets;
  }, [filteredAdSets, selectedAdSetIds]);

  // Determine data granularity for KPIs
  const hasAdsData = ads.length > 0;

  // KPI calculation
  const kpis = useMemo(() => {
    const dataSource = hasAdsData ? finalAds : finalAdSets;
    const totalSpend = dataSource.reduce((sum, a) => sum + (a.amount_spent || 0), 0);
    const totalImpressions = dataSource.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalClicks = dataSource.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgFrequency = dataSource.length > 0
      ? dataSource.reduce((sum, a) => sum + (a.frequency || 0), 0) / dataSource.filter(a => a.frequency).length || 0
      : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    return { totalSpend, impressions: totalImpressions, clicks: totalClicks, ctr, frequency: avgFrequency, cpm, cpc };
  }, [finalAds, finalAdSets, hasAdsData]);

  // Chart data grouped by campaign
  const chartData = useMemo(() => {
    const dataSource = hasAdsData ? finalAds : finalAdSets;
    const campaignData: Record<string, { name: string; spend: number; impressions: number; clicks: number }> = {};

    dataSource.forEach(item => {
      let campaignId: string;
      if ("campaign_id" in item && !("adset_id" in item && "ad_id" in item)) {
        // It's an ad set
        campaignId = (item as NormalizedAdSet).campaign_id;
      } else {
        // It's an ad - find its ad set to get campaign
        const adSet = adSets.find(as => as.id === (item as NormalizedAd).adset_id);
        campaignId = adSet?.campaign_id || "unknown";
      }
      const campaign = campaigns.find(c => c.id === campaignId);
      const name = campaign ? `${campaign.campaign_name || campaign.campaign_id} (${campaign.platform === "tiktok" ? "TT" : "Meta"})` : "Unknown";

      if (!campaignData[campaignId]) {
        campaignData[campaignId] = { name, spend: 0, impressions: 0, clicks: 0 };
      }
      campaignData[campaignId].spend += item.amount_spent || 0;
      campaignData[campaignId].impressions += item.impressions || 0;
      campaignData[campaignId].clicks += item.clicks || 0;
    });

    return Object.values(campaignData)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => ({
        name: d.name,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        roas: 0,
      }));
  }, [finalAds, finalAdSets, hasAdsData, adSets, campaigns]);

  // Top 5 items
  const topContent: TopContentItem[] = useMemo(() => {
    const dataSource = hasAdsData ? finalAds : finalAdSets;
    if (dataSource.length === 0) return [];
    const maxCtr = Math.max(...dataSource.map(a => a.ctr || 0), 1);
    const maxClicks = Math.max(...dataSource.map(a => a.clicks || 0), 1);

    return dataSource
      .map(a => {
        const score = ((a.ctr || 0) / maxCtr) * 0.5 + ((a.clicks || 0) / maxClicks) * 0.5;
        const storedPreviewUrl = "thumbnail_url" in a ? a.thumbnail_url || null : null;
        return {
          id: a.id,
          thumbnailUrl: storedPreviewUrl,
          previewIframeUrl: null,
          contentType: "ad",
          platform: a.platform === "tiktok" ? "tiktok" : "facebook",
          views: a.impressions || 0,
          engagementRate: a.ctr || 0,
          url: null,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [finalAds, finalAdSets, hasAdsData]);

  const metricLabels: Record<MetricKey, string> = {
    spend: "Spend",
    impressions: "Impressions",
    clicks: "Clicks",
    ctr: "CTR (%)",
    roas: "ROAS",
  };

  const formatChartValue = (value: number, metric: MetricKey): string => {
    switch (metric) {
      case "spend": return formatCurrency(value, currency);
      case "ctr": return `${value.toFixed(2)}%`;
      case "roas": return value.toFixed(2);
      default: return value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
    }
  };

  // Filter options - show platform in label
  const campaignOptions: FilterOption[] = campaigns.map(c => ({
    id: c.id,
    label: `${c.campaign_name || c.campaign_id} (${c.platform === "tiktok" ? "TT" : "Meta"})`,
  }));

  const adSetOptions: FilterOption[] = filteredAdSets.map(a => ({
    id: a.id,
    label: `${a.adset_name || a.adset_id} (${a.platform === "tiktok" ? "TT" : "Meta"})`,
  }));

  const adOptions: FilterOption[] = filteredAds.map(a => ({
    id: a.id,
    label: `${a.ad_name || a.ad_id} (${a.platform === "tiktok" ? "TT" : "Meta"})`,
  }));

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p>Loading ads data...</p>
      </div>
    );
  }

  const hasData = adSets.length > 0 || ads.length > 0;

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap items-start gap-4">
        {campaignOptions.length > 0 && (
          <MultiSelectFilter
            label="Campaign"
            options={campaignOptions}
            selectedIds={selectedCampaignIds}
            onToggle={(id) => setSelectedCampaignIds(prev => toggleIn(prev, id))}
            onRemove={(id) => setSelectedCampaignIds(prev => prev.filter(x => x !== id))}
            onClear={() => setSelectedCampaignIds([])}
            searchPlaceholder="Search campaigns..."
            emptyMessage="No campaigns found."
          />
        )}

        {adSetOptions.length > 0 && (
          <MultiSelectFilter
            label="Ad Set / Ad Group"
            options={adSetOptions}
            selectedIds={selectedAdSetIds}
            onToggle={(id) => setSelectedAdSetIds(prev => toggleIn(prev, id))}
            onRemove={(id) => setSelectedAdSetIds(prev => prev.filter(x => x !== id))}
            onClear={() => setSelectedAdSetIds([])}
            searchPlaceholder="Search ad sets..."
            emptyMessage="No ad sets found."
          />
        )}

        {adOptions.length > 0 && (
          <MultiSelectFilter
            label="Ad"
            options={adOptions}
            selectedIds={selectedAdIds}
            onToggle={(id) => setSelectedAdIds(prev => toggleIn(prev, id))}
            onRemove={(id) => setSelectedAdIds(prev => prev.filter(x => x !== id))}
            onClear={() => setSelectedAdIds([])}
            searchPlaceholder="Search ads..."
            emptyMessage="No ads found."
          />
        )}
      </div>

      {!hasData ? (
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
      ) : (
        <>
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
              <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 44 + 40)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 11 }}
                    width={180}
                    tickFormatter={(value: string) => value.length > 28 ? value.substring(0, 26) + "…" : value}
                  />
                  <XAxis
                    type="number"
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
                  <Bar dataKey={selectedMetric} fill="hsl(var(--accent-green))" radius={[0, 4, 4, 0]} barSize={28} />
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
              <KPICard title="Total Spend" value={formatCurrency(kpis.totalSpend, currency)} icon={DollarSign} accentColor="orange" tooltip="Total advertising spend" />
              <KPICard title="Impressions" value={kpis.impressions.toLocaleString()} icon={Eye} tooltip="Total ad impressions" />
              <KPICard title="Clicks" value={kpis.clicks.toLocaleString()} icon={MousePointer} tooltip="Total ad clicks" />
              <KPICard title="CTR" value={`${kpis.ctr.toFixed(2)}%`} icon={TrendingUp} accentColor="green" tooltip="Click-through rate" />
              <KPICard title="Frequency" value={kpis.frequency.toFixed(2)} icon={Target} tooltip="Average frequency" />
              <KPICard title="CPM" value={formatCurrency(kpis.cpm, currency)} icon={DollarSign} tooltip="Cost per 1000 impressions" />
              <KPICard title="CPC" value={formatCurrency(kpis.cpc, currency)} icon={MousePointer} tooltip="Cost per click" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BrandAdsDashboard;
