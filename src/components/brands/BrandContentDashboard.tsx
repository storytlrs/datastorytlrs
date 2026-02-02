import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Eye, TrendingUp, Zap, Loader2 } from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { TopContentGrid, TopContentItem } from "./TopContentGrid";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

interface BrandContentDashboardProps {
  spaceId: string;
  filters: OverviewFilters;
}

interface Content {
  id: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  published_date: string | null;
  platform: string;
  content_type: string;
  thumbnail_url: string | null;
  url: string | null;
  engagement_rate: number | null;
}

type MetricKey = "views" | "reach" | "engagementRate" | "contentPieces";

const BrandContentDashboard = ({ spaceId, filters }: BrandContentDashboardProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("views");

  useEffect(() => {
    fetchData();
  }, [spaceId, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // For now, fetch content from always_on reports
      // Later this will be replaced with brand_content table with automatic imports
      let reportsQuery = supabase
        .from("reports")
        .select("id")
        .eq("space_id", spaceId)
        .eq("type", "always_on");

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
        setLoading(false);
        return;
      }

      let contentQuery = supabase
        .from("content")
        .select("id, reach, impressions, views, likes, comments, shares, saves, published_date, platform, content_type, thumbnail_url, url, engagement_rate")
        .in("report_id", reportIds);

      if (filters.platform !== "all") {
        contentQuery = contentQuery.eq("platform", filters.platform as "instagram" | "tiktok" | "youtube" | "facebook" | "twitter");
      }

      const { data: contentData, error: contentError } = await contentQuery;
      if (contentError) throw contentError;

      setContent(contentData || []);
    } catch (error) {
      console.error("Failed to fetch content data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalReach = content.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalViews = content.reduce((sum, c) => sum + (c.impressions || 0) + (c.views || 0), 0);
    const totalLikes = content.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = content.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = content.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = content.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;

    const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    const viralityRate = totalViews > 0 ? (totalShares / totalViews) * 100 : 0;
    const contentPieces = content.length;
    const avgViewsPerContent = contentPieces > 0 ? totalViews / contentPieces : 0;

    return {
      reach: totalReach,
      views: totalViews,
      engagementRate,
      viralityRate,
      contentPieces,
      avgViewsPerContent,
    };
  }, [content]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const monthlyData: Record<string, {
      monthKey: string;
      month: string;
      views: number;
      reach: number;
      interactions: number;
      totalViews: number;
      contentCount: number;
    }> = {};

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
          reach: 0,
          interactions: 0,
          totalViews: 0,
          contentCount: 0,
        };
      }

      const views = (c.impressions || 0) + (c.views || 0);
      monthlyData[monthKey].views += views;
      monthlyData[monthKey].totalViews += views;
      monthlyData[monthKey].reach += c.reach || 0;
      monthlyData[monthKey].interactions += (c.likes || 0) + (c.comments || 0) + (c.shares || 0) + (c.saves || 0);
      monthlyData[monthKey].contentCount += 1;
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(d => ({
        month: d.month,
        views: d.views,
        reach: d.reach,
        engagementRate: d.totalViews > 0 ? (d.interactions / d.totalViews) * 100 : 0,
        contentPieces: d.contentCount,
      }));
  }, [content]);

  // Top 5 content by composite score
  const topContent: TopContentItem[] = useMemo(() => {
    if (content.length === 0) return [];

    const maxViews = Math.max(...content.map(c => (c.impressions || 0) + (c.views || 0)), 1);
    const maxER = Math.max(...content.map(c => c.engagement_rate || 0), 1);
    const maxSharesSaves = Math.max(...content.map(c => (c.shares || 0) + (c.saves || 0)), 1);

    return content
      .map(c => {
        const views = (c.impressions || 0) + (c.views || 0);
        const er = c.engagement_rate || 0;
        const sharesSaves = (c.shares || 0) + (c.saves || 0);

        const score =
          (views / maxViews) * 0.40 +
          (er / maxER) * 0.30 +
          (sharesSaves / maxSharesSaves) * 0.30;

        return {
          id: c.id,
          thumbnailUrl: c.thumbnail_url,
          contentType: c.content_type,
          platform: c.platform,
          views,
          engagementRate: er,
          url: c.url,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [content]);

  const metricLabels: Record<MetricKey, string> = {
    views: "Views",
    reach: "Reach",
    engagementRate: "Engagement Rate (%)",
    contentPieces: "Content Pieces",
  };

  const formatChartValue = (value: number, metric: MetricKey): string => {
    switch (metric) {
      case "engagementRate":
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString("cs-CZ", { maximumFractionDigits: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <p>Loading content data...</p>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="space-y-8">
        <Card className="p-12 rounded-[35px] border-foreground border-dashed">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Content Data Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Content data will appear here once you have Always-on content reports with data, 
              or when automatic content import is configured.
            </p>
          </div>
        </Card>
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
      <TopContentGrid items={topContent} title="Top 5 Content" emptyMessage="No content found" />

      {/* KPI Tiles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard
            title="Reach"
            value={kpis.reach.toLocaleString()}
            icon={Users}
            accentColor="blue"
            tooltip="Total unique users who saw the content"
          />
          <KPICard
            title="Views"
            value={kpis.views.toLocaleString()}
            icon={Eye}
            tooltip="Total impressions and views"
          />
          <KPICard
            title="Engagement Rate"
            value={`${kpis.engagementRate.toFixed(2)}%`}
            icon={TrendingUp}
            accentColor="green"
            tooltip="(interactions / views) × 100"
          />
          <KPICard
            title="Content Pieces"
            value={kpis.contentPieces.toLocaleString()}
            icon={FileText}
            tooltip="Total number of content pieces"
          />
          <KPICard
            title="Avg Views/Content"
            value={Math.round(kpis.avgViewsPerContent).toLocaleString()}
            icon={Eye}
            tooltip="Average views per content piece"
          />
          <KPICard
            title="Virality Rate"
            value={`${kpis.viralityRate.toFixed(4)}%`}
            icon={Zap}
            tooltip="(shares / views) × 100"
          />
        </div>
      </div>
    </div>
  );
};

export default BrandContentDashboard;
