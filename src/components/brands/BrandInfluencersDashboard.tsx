import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, DollarSign, Eye, Clock, Award, TrendingUp, Loader2 } from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { TopContentGrid, TopContentItem } from "./TopContentGrid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { secondsToWatchTime } from "@/lib/watchTimeUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { format, parseISO, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

interface BrandInfluencersDashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

interface Content {
  id: string;
  report_id: string;
  creator_id: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  watch_time: number | null;
  published_date: string | null;
  platform: string;
  content_type: string;
  thumbnail_url: string | null;
  url: string | null;
  engagement_rate: number | null;
}

interface Creator {
  id: string;
  report_id: string;
  handle: string;
  posts_count: number | null;
  reels_count: number | null;
  stories_count: number | null;
  posts_cost: number | null;
  reels_cost: number | null;
  stories_cost: number | null;
  currency: string | null;
}

type MetricKey = "views" | "budget" | "creators" | "engagementRate" | "watchTime";

const BrandInfluencersDashboard = ({ spaceId, filters }: BrandInfluencersDashboardProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("views");

  useEffect(() => {
    fetchData();
  }, [spaceId, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build report filter for influencer type only
      let reportsQuery = supabase
        .from("reports")
        .select("id")
        .eq("space_id", spaceId)
        .eq("type", "influencer");

      if (filters.dateRange.start) {
        reportsQuery = reportsQuery.gte("start_date", filters.dateRange.start.toISOString().split("T")[0]);
      }
      if (filters.dateRange.end) {
        reportsQuery = reportsQuery.lte("end_date", filters.dateRange.end.toISOString().split("T")[0]);
      }

      const { data: reportsData, error: reportsError } = await reportsQuery;
      if (reportsError) throw reportsError;

      const reportIds = reportsData?.map(r => r.id) || [];

      if (reportIds.length === 0) {
        setContent([]);
        setCreators([]);
        setLoading(false);
        return;
      }

      // Build content query with platform filter
      let contentQuery = supabase
        .from("content")
        .select("id, report_id, creator_id, reach, impressions, views, likes, comments, shares, saves, watch_time, published_date, platform, content_type, thumbnail_url, url, engagement_rate")
        .in("report_id", reportIds);

      if (filters.platform !== "all") {
        contentQuery = contentQuery.eq("platform", filters.platform as "instagram" | "tiktok" | "youtube" | "facebook" | "twitter");
      }

      const [contentRes, creatorsRes] = await Promise.all([
        contentQuery,
        supabase
          .from("creators")
          .select("id, report_id, handle, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost, currency")
          .in("report_id", reportIds),
      ]);

      if (contentRes.error) throw contentRes.error;
      if (creatorsRes.error) throw creatorsRes.error;

      setContent(contentRes.data || []);
      setCreators(creatorsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch influencer data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create creator lookup
  const creatorMap = useMemo(() => {
    return new Map(creators.map(c => [c.id, c]));
  }, [creators]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalViews = content.reduce((sum, c) => sum + (c.impressions || 0) + (c.views || 0), 0);
    const totalWatchTime = content.reduce((sum, c) => sum + (c.watch_time || 0), 0);
    const totalLikes = content.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = content.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = content.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = content.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
    
    const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    const contentPieces = content.length;
    const uniqueCreators = new Set(content.map(c => c.creator_id)).size;
    
    // TSWB = watch_time (total attention index)
    const tswb = totalWatchTime;
    
    const totalBudget = creators.reduce((sum, c) => {
      const postsCost = (c.posts_count || 0) * (c.posts_cost || 0);
      const reelsCost = (c.reels_count || 0) * (c.reels_cost || 0);
      const storiesCost = (c.stories_count || 0) * (c.stories_cost || 0);
      return sum + postsCost + reelsCost + storiesCost;
    }, 0);

    const tswbMinutes = totalWatchTime / 60;
    const tswbCostPerMinute = tswbMinutes > 0 ? totalBudget / tswbMinutes : 0;
    const cpm = totalViews > 0 ? (totalBudget / totalViews) * 1000 : 0;

    // Determine currency
    const currencies = creators.map(c => c.currency || "CZK");
    const currencyCounts = currencies.reduce((acc, cur) => ({ ...acc, [cur]: (acc[cur] || 0) + 1 }), {} as Record<string, number>);
    const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "CZK";

    return {
      uniqueCreators,
      contentPieces,
      totalBudget,
      views: totalViews,
      watchTime: totalWatchTime,
      tswb,
      engagementRate,
      tswbCostPerMinute,
      cpm,
      currency,
    };
  }, [content, creators]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const monthlyData: Record<string, {
      monthKey: string;
      month: string;
      views: number;
      budget: number;
      creators: Set<string>;
      interactions: number;
      totalViews: number;
      watchTime: number;
    }> = {};

    const avgBudgetPerContent = kpis.contentPieces > 0 ? kpis.totalBudget / kpis.contentPieces : 0;

    content.forEach(c => {
      if (!c.published_date) return;
      const date = parseISO(c.published_date);
      const monthKey = format(startOfMonth(date), "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy");

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          monthKey,
          month: monthLabel,
          views: 0,
          budget: 0,
          creators: new Set(),
          interactions: 0,
          totalViews: 0,
          watchTime: 0,
        };
      }

      const views = (c.impressions || 0) + (c.views || 0);
      monthlyData[monthKey].views += views;
      monthlyData[monthKey].totalViews += views;
      monthlyData[monthKey].interactions += (c.likes || 0) + (c.comments || 0) + (c.shares || 0) + (c.saves || 0);
      monthlyData[monthKey].creators.add(c.creator_id);
      monthlyData[monthKey].budget += avgBudgetPerContent;
      monthlyData[monthKey].watchTime += c.watch_time || 0;
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(d => ({
        month: d.month,
        views: d.views,
        budget: d.budget,
        creators: d.creators.size,
        engagementRate: d.totalViews > 0 ? (d.interactions / d.totalViews) * 100 : 0,
        watchTime: d.watchTime / 60, // Convert to minutes for chart
      }));
  }, [content, kpis]);

  // Top 5 content by composite score
  const topContent: TopContentItem[] = useMemo(() => {
    if (content.length === 0) return [];

    // Normalize values for scoring
    const maxViews = Math.max(...content.map(c => (c.impressions || 0) + (c.views || 0)), 1);
    const maxER = Math.max(...content.map(c => c.engagement_rate || 0), 1);
    const maxWatchTime = Math.max(...content.map(c => c.watch_time || 0), 1);
    const maxSharesSaves = Math.max(...content.map(c => (c.shares || 0) + (c.saves || 0)), 1);

    return content
      .map(c => {
        const views = (c.impressions || 0) + (c.views || 0);
        const er = c.engagement_rate || 0;
        const wt = c.watch_time || 0;
        const sharesSaves = (c.shares || 0) + (c.saves || 0);

        const score =
          (views / maxViews) * 0.30 +
          (er / maxER) * 0.25 +
          (wt / maxWatchTime) * 0.25 +
          (sharesSaves / maxSharesSaves) * 0.20;

        const creator = creatorMap.get(c.creator_id);

        return {
          id: c.id,
          thumbnailUrl: c.thumbnail_url,
          contentType: c.content_type,
          platform: c.platform,
          views,
          engagementRate: er,
          url: c.url,
          creatorHandle: creator?.handle,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [content, creatorMap]);

  const metricLabels: Record<MetricKey, string> = {
    views: "Views",
    budget: "Budget",
    creators: "Creators",
    engagementRate: "Engagement Rate (%)",
    watchTime: "Watch Time (min)",
  };

  const formatChartValue = (value: number, metric: MetricKey): string => {
    switch (metric) {
      case "budget":
        return formatCurrency(value, kpis.currency);
      case "engagementRate":
        return `${value.toFixed(2)}%`;
      case "watchTime":
        return `${Math.round(value)}m`;
      default:
        return value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p>Loading influencer data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bar Chart */}
      <Card className="p-6 rounded-[35px] border-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold">Monthly Performance</h3>
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
              <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
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

      {/* Top 5 Content */}
      <TopContentGrid items={topContent} title="Top 5 Influencer Content" emptyMessage="No influencer content found" />

      {/* KPI Tiles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Creators"
            value={kpis.uniqueCreators.toLocaleString()}
            icon={Users}
            accentColor="green"
            tooltip="Number of unique creators in influencer campaigns"
          />
          <KPICard
            title="Content Pieces"
            value={kpis.contentPieces.toLocaleString()}
            icon={FileText}
            tooltip="Total content pieces created by influencers"
          />
          <KPICard
            title="Total Budget"
            value={formatCurrency(kpis.totalBudget, kpis.currency)}
            icon={DollarSign}
            accentColor="orange"
            tooltip="Total budget spent on influencer collaborations"
          />
          <KPICard
            title="Views"
            value={kpis.views.toLocaleString()}
            icon={Eye}
            tooltip="Total impressions and views from influencer content"
          />
          <KPICard
            title="Watch Time"
            value={secondsToWatchTime(kpis.watchTime)}
            icon={Clock}
            tooltip="Total watch time across all influencer content"
          />
          <KPICard
            title="TSWB"
            value={secondsToWatchTime(kpis.tswb)}
            icon={Award}
            accentColor="green"
            tooltip="Time Spent With Brand - total attention index"
          />
          <KPICard
            title="Engagement Rate"
            value={`${kpis.engagementRate.toFixed(2)}%`}
            icon={TrendingUp}
            tooltip="Average engagement rate across influencer content"
          />
          <KPICard
            title="TSWB Cost/Min"
            value={formatCurrency(kpis.tswbCostPerMinute, kpis.currency)}
            icon={Clock}
            accentColor="orange"
            tooltip="Cost per minute of audience attention"
          />
        </div>
      </div>
    </div>
  );
};

export default BrandInfluencersDashboard;
