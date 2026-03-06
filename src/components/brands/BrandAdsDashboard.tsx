import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Eye, MousePointer, TrendingUp, Target, Loader2, Heart, MessageCircle, Share2, Bookmark, Play, Video, Link2 } from "lucide-react";
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
      const [metaCampaigns, metaAllCampaigns, metaAdSets, metaAds, metaAdThumbnails] = await Promise.all([
        supabase.from("brand_campaigns").select("id, campaign_name, campaign_id").eq("space_id", spaceId).eq("publisher_platform", "unknown").or("age.is.null,age.eq.").or("gender.is.null,gender.eq.").order("campaign_name"),
        supabase.from("brand_campaigns").select("id, campaign_name, campaign_id").eq("space_id", spaceId).neq("publisher_platform", "unknown").or("age.is.null,age.eq.").or("gender.is.null,gender.eq."),
        supabase.from("brand_ad_sets" as any).select("id, adset_name, adset_id, brand_campaign_id, amount_spent, impressions, clicks, ctr, frequency, reach, date_start, publisher_platform, video_3s_plays, thruplays, thruplay_rate, view_rate_3s, cost_per_3s_play, cost_per_thruplay").eq("space_id", spaceId).or("age.is.null,age.eq.").or("gender.is.null,gender.eq."),
        supabase.from("brand_ads").select("id, ad_name, ad_id, brand_ad_set_id, amount_spent, impressions, clicks, ctr, frequency, reach, link_clicks, post_reactions, post_comments, post_shares, post_saves, date_start, thumbnail_url, publisher_platform, video_3s_plays, thruplays, thruplay_rate, view_rate_3s, cost_per_3s_play, cost_per_thruplay, cpm, cpc").eq("space_id", spaceId).or("age.is.null,age.eq.").or("gender.is.null,gender.eq."),
        supabase.from("brand_ads").select("ad_id, thumbnail_url").eq("space_id", spaceId).not("thumbnail_url", "is", null),
      ]);

      // Build a map from any campaign UUID to its campaign_id (platform ID)
      // This resolves ad sets that reference platform-specific campaign rows
      const campaignUuidToIdMap = new Map<string, string>();
      [...(metaCampaigns.data || []), ...(metaAllCampaigns.data || [])].forEach((c: any) => {
        campaignUuidToIdMap.set(c.id, c.campaign_id);
      });

      // Build thumbnail lookup by ad_id
      const metaThumbnailMap = new Map<string, string>();
      (metaAdThumbnails.data || []).forEach((t: any) => {
        if (t.thumbnail_url && !metaThumbnailMap.has(t.ad_id)) {
          metaThumbnailMap.set(t.ad_id, t.thumbnail_url);
        }
      });

      // Fetch TikTok data
      const [ttCampaigns, ttAdGroups, ttAds] = await Promise.all([
        supabase.from("tiktok_campaigns").select("id, campaign_name, campaign_id").eq("space_id", spaceId).or("age.is.null,age.eq.").or("gender.is.null,gender.eq.").or("location.is.null,location.eq.").order("campaign_name"),
        supabase.from("tiktok_ad_groups").select("id, adgroup_name, adgroup_id, tiktok_campaign_id, amount_spent, impressions, clicks, ctr, frequency, reach, video_watched_2s, average_video_play, cpm, cpc").eq("space_id", spaceId),
        supabase.from("tiktok_ads").select("id, ad_name, ad_id, tiktok_ad_group_id, amount_spent, impressions, clicks, ctr, frequency, reach, link_clicks, likes, comments, shares, thumbnail_url, video_watched_2s, average_video_play, cpm, cpc").eq("space_id", spaceId),
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

      // Build a reverse map: campaign_id (platform) -> total campaign UUID
      const campaignIdToTotalUuid = new Map<string, string>();
      (metaCampaigns.data || []).forEach((c: any) => {
        campaignIdToTotalUuid.set(c.campaign_id, c.id);
      });

      // Normalize Meta ad sets - deduplicate by adset_id (may have multiple platform rows)
      const adSetMap = new Map<string, NormalizedAdSet>();
      (metaAdSets.data || []).forEach((a: any) => {
        // Resolve to total campaign UUID via campaign_id mapping
        const platformCampaignId = campaignUuidToIdMap.get(a.brand_campaign_id);
        const totalCampaignUuid = platformCampaignId ? (campaignIdToTotalUuid.get(platformCampaignId) || a.brand_campaign_id) : a.brand_campaign_id;

        if (!adSetMap.has(a.adset_id)) {
          adSetMap.set(a.adset_id, {
            id: a.id,
            adset_name: a.adset_name,
            adset_id: a.adset_id,
            campaign_id: totalCampaignUuid,
            amount_spent: a.amount_spent || 0,
            impressions: a.impressions || 0,
            clicks: a.clicks || 0,
            ctr: a.ctr || 0,
            frequency: a.frequency || 0,
            date_start: a.date_start,
            platform: "meta" as const,
          });
        } else {
          // Aggregate metrics from platform breakdown rows
          const existing = adSetMap.get(a.adset_id)!;
          existing.amount_spent = (existing.amount_spent || 0) + (a.amount_spent || 0);
          existing.impressions = (existing.impressions || 0) + (a.impressions || 0);
          existing.clicks = (existing.clicks || 0) + (a.clicks || 0);
        }
      });
      // Recalculate CTR for aggregated ad sets
      adSetMap.forEach(as => {
        as.ctr = as.impressions > 0 ? (as.clicks / as.impressions) * 100 : 0;
      });
      const normMetaAdSets: NormalizedAdSet[] = Array.from(adSetMap.values());

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

      // Normalize Meta ads - deduplicate by ad_id (may have multiple platform rows)
      // Also resolve adset_id to the deduplicated adset
      const adSetIdMap = new Map<string, string>(); // original UUID -> deduplicated UUID
      (metaAdSets.data || []).forEach((a: any) => {
        const deduped = adSetMap.get(a.adset_id);
        if (deduped) adSetIdMap.set(a.id, deduped.id);
      });

      const adMap = new Map<string, NormalizedAd>();
      (metaAds.data || []).forEach((a: any) => {
        const resolvedAdSetId = adSetIdMap.get(a.brand_ad_set_id) || a.brand_ad_set_id;
        if (!adMap.has(a.ad_id)) {
          adMap.set(a.ad_id, {
            id: a.id,
            ad_name: a.ad_name,
            ad_id: a.ad_id,
            adset_id: resolvedAdSetId,
            amount_spent: a.amount_spent || 0,
            impressions: a.impressions || 0,
            clicks: a.clicks || 0,
            ctr: a.ctr || 0,
            frequency: a.frequency || 0,
            link_clicks: a.link_clicks || 0,
            post_reactions: a.post_reactions || 0,
            post_comments: a.post_comments || 0,
            post_shares: a.post_shares || 0,
            post_saves: a.post_saves || 0,
            date_start: a.date_start,
            thumbnail_url: a.thumbnail_url || metaThumbnailMap.get(a.ad_id) || null,
            platform: "meta" as const,
          });
        } else {
          const existing = adMap.get(a.ad_id)!;
          existing.amount_spent = (existing.amount_spent || 0) + (a.amount_spent || 0);
          existing.impressions = (existing.impressions || 0) + (a.impressions || 0);
          existing.clicks = (existing.clicks || 0) + (a.clicks || 0);
          if (!existing.thumbnail_url && a.thumbnail_url) {
            existing.thumbnail_url = a.thumbnail_url;
          }
        }
      });
      adMap.forEach(ad => {
        ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
      });
      const normMetaAds: NormalizedAd[] = Array.from(adMap.values());

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

  // Platform-filtered base data
  const platformCampaigns = useMemo(() => {
    if (!filters.platform || filters.platform === "all") return campaigns;
    const p = filters.platform === "tiktok" ? "tiktok" : "meta";
    return campaigns.filter(c => c.platform === p);
  }, [campaigns, filters.platform]);

  const platformAdSets = useMemo(() => {
    if (!filters.platform || filters.platform === "all") return adSets;
    const p = filters.platform === "tiktok" ? "tiktok" : "meta";
    return adSets.filter(a => a.platform === p);
  }, [adSets, filters.platform]);

  const platformAds = useMemo(() => {
    if (!filters.platform || filters.platform === "all") return ads;
    const p = filters.platform === "tiktok" ? "tiktok" : "meta";
    return ads.filter(a => a.platform === p);
  }, [ads, filters.platform]);

  // Reset all filters when space or platform changes
  useEffect(() => {
    setSelectedCampaignIds([]);
    setSelectedAdSetIds([]);
    setSelectedAdIds([]);
  }, [spaceId, filters.platform]);

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
    if (selectedCampaignIds.length === 0) return platformAdSets;
    return platformAdSets.filter(a => selectedCampaignIds.includes(a.campaign_id));
  }, [platformAdSets, selectedCampaignIds]);

  // Filtered ads based on selected ad sets (or all ad sets from selected campaigns)
  const filteredAds = useMemo(() => {
    const relevantAdSetIds = selectedAdSetIds.length > 0
      ? selectedAdSetIds
      : filteredAdSets.map(a => a.id);
    if (relevantAdSetIds.length === 0 && selectedCampaignIds.length > 0) return [];
    if (relevantAdSetIds.length === 0) return platformAds;
    return platformAds.filter(a => relevantAdSetIds.includes(a.adset_id));
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
  const hasAdsData = platformAds.length > 0;

  // KPI calculation
  const kpis = useMemo(() => {
    const dataSource = hasAdsData ? finalAds : finalAdSets;
    const totalSpend = dataSource.reduce((sum, a) => sum + (a.amount_spent || 0), 0);
    const totalImpressions = dataSource.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalClicks = dataSource.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const totalReach = dataSource.reduce((sum, a) => sum + ((a as any).reach || 0), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgFrequency = dataSource.length > 0
      ? dataSource.reduce((sum, a) => sum + (a.frequency || 0), 0) / dataSource.filter(a => a.frequency).length || 0
      : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // Engagement
    const totalReactions = dataSource.reduce((sum, a) => sum + ((a as any).post_reactions || 0), 0);
    const totalComments = dataSource.reduce((sum, a) => sum + ((a as any).post_comments || 0), 0);
    const totalShares = dataSource.reduce((sum, a) => sum + ((a as any).post_shares || 0), 0);
    const totalSaves = dataSource.reduce((sum, a) => sum + ((a as any).post_saves || 0), 0);
    const totalEngagement = totalReactions + totalComments + totalShares + totalSaves;
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    const cpe = totalEngagement > 0 ? totalSpend / totalEngagement : 0;

    // Video
    const totalThruplays = dataSource.reduce((sum, a) => sum + ((a as any).thruplays || 0), 0);
    const thruplayRate = totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0;
    const costPerThruplay = totalThruplays > 0 ? totalSpend / totalThruplays : 0;
    const total3sViews = dataSource.reduce((sum, a) => sum + ((a as any).video_3s_plays || (a as any).video_watched_2s || 0), 0);
    const viewRate3s = totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0;
    const costPer3sView = total3sViews > 0 ? totalSpend / total3sViews : 0;

    // Avg watch time - weighted by impressions
    let totalWeightedWatchTime = 0;
    let totalWatchTimeImpressions = 0;
    dataSource.forEach(a => {
      const wt = (a as any).average_video_play || 0;
      const imp = a.impressions || 0;
      if (wt > 0 && imp > 0) {
        totalWeightedWatchTime += wt * imp;
        totalWatchTimeImpressions += imp;
      }
    });
    const avgWatchTime = totalWatchTimeImpressions > 0 ? totalWeightedWatchTime / totalWatchTimeImpressions : 0;

    // Traffic
    const totalLinkClicks = dataSource.reduce((sum, a) => sum + ((a as any).link_clicks || 0), 0);

    return {
      totalSpend, impressions: totalImpressions, clicks: totalClicks, ctr, frequency: avgFrequency, cpm, cpc,
      reach: totalReach,
      reactions: totalReactions, comments: totalComments, shares: totalShares, saves: totalSaves,
      engagement: totalEngagement, engagementRate, cpe,
      thruplays: totalThruplays, thruplayRate, costPerThruplay,
      views3s: total3sViews, viewRate3s, costPer3sView,
      avgWatchTime,
      linkClicks: totalLinkClicks,
    };
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
      const campaign = platformCampaigns.find(c => c.id === campaignId);
      const name = campaign ? `${campaign.campaign_name || campaign.campaign_id} (${campaign.platform === "tiktok" ? "TT" : "Meta"})` : "Unknown";

      if (!campaignData[campaignId]) {
        campaignData[campaignId] = { name, spend: 0, impressions: 0, clicks: 0 };
      }
      campaignData[campaignId].spend += item.amount_spent || 0;
      campaignData[campaignId].impressions += item.impressions || 0;
      campaignData[campaignId].clicks += item.clicks || 0;
    });

    const all = Object.values(campaignData)
      .map(d => ({
        name: d.name,
        spend: d.spend,
        impressions: d.impressions,
        clicks: d.clicks,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        roas: 0,
      }));

    // Sort by selected metric descending and take top 10
    return all
      .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))
      .slice(0, 10);
  }, [finalAds, finalAdSets, hasAdsData, adSets, campaigns, selectedMetric]);

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
          name: "ad_name" in a ? a.ad_name : ("adset_name" in a ? (a as any).adset_name : null),
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
  const campaignOptions: FilterOption[] = platformCampaigns.map(c => ({
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

  const hasData = platformAdSets.length > 0 || platformAds.length > 0;

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
            <Wallet className="w-12 h-12 text-muted-foreground" />
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
              <h3 className="text-lg font-semibold">Top 10 Campaign Performance</h3>
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
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--foreground))"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-40}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(value: string) => value.length > 22 ? value.substring(0, 20) + "…" : value}
                  />
                  <YAxis
                    stroke="hsl(var(--foreground))"
                    tickFormatter={(value) => formatChartValue(value, selectedMetric)}
                    width={80}
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


          {/* Awareness */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Awareness</h3>
            <div className="grid grid-cols-5 gap-4">
              <KPICard title="Total Spend" value={formatCurrency(kpis.totalSpend, currency)} icon={Wallet} accentColor="orange" />
              <KPICard title="Reach" value={kpis.reach.toLocaleString("cs-CZ")} icon={Eye} />
              <KPICard title="Frequency" value={kpis.frequency.toFixed(2)} icon={Target} />
              <KPICard title="CPM" value={formatCurrency(kpis.cpm, currency)} icon={Wallet} />
              <KPICard title="Impressions" value={kpis.impressions.toLocaleString("cs-CZ")} icon={Eye} />
            </div>
          </div>

          {/* Engagement */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Engagement</h3>
            <div className="grid grid-cols-4 gap-4">
              <KPICard title="Reactions" value={kpis.reactions.toLocaleString("cs-CZ")} icon={Heart} />
              <KPICard title="Comments" value={kpis.comments.toLocaleString("cs-CZ")} icon={MessageCircle} />
              <KPICard title="Shares" value={kpis.shares.toLocaleString("cs-CZ")} icon={Share2} />
              <KPICard title="Saves" value={kpis.saves.toLocaleString("cs-CZ")} icon={Bookmark} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <KPICard title="Engagement" value={kpis.engagement.toLocaleString("cs-CZ")} icon={TrendingUp} />
              <KPICard title="Engagement Rate" value={`${kpis.engagementRate.toFixed(2)}%`} icon={TrendingUp} accentColor="green" />
              <KPICard title="CPE" value={formatCurrency(kpis.cpe, currency)} icon={Wallet} />
            </div>
          </div>

          {/* Video */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Video</h3>
            <div className="grid grid-cols-3 gap-4">
              <KPICard title="ThruPlays" value={kpis.thruplays.toLocaleString("cs-CZ")} icon={Play} />
              <KPICard title="ThruPlay Rate" value={`${kpis.thruplayRate.toFixed(2)}%`} icon={Play} accentColor="green" />
              <KPICard title="Cost per ThruPlay" value={formatCurrency(kpis.costPerThruplay, currency)} icon={Wallet} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <KPICard title="3s Views" value={kpis.views3s.toLocaleString("cs-CZ")} icon={Video} />
              <KPICard title="3s View Rate" value={`${kpis.viewRate3s.toFixed(2)}%`} icon={Video} accentColor="green" />
              <KPICard title="Cost per 3s View" value={formatCurrency(kpis.costPer3sView, currency)} icon={Wallet} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <KPICard title="Avg Watch Time" value={`${kpis.avgWatchTime.toFixed(1)}s`} icon={Video} />
            </div>
          </div>

          {/* Traffic */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Traffic</h3>
            <div className="grid grid-cols-3 gap-4">
              <KPICard title="Link Clicks" value={kpis.linkClicks.toLocaleString("cs-CZ")} icon={Link2} />
              <KPICard title="CTR" value={`${kpis.ctr.toFixed(2)}%`} icon={TrendingUp} accentColor="green" />
              <KPICard title="CPC" value={formatCurrency(kpis.cpc, currency)} icon={Wallet} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BrandAdsDashboard;
