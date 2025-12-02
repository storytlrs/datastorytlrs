import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, Eye, Users, Heart, MessageCircle, Share2, Bookmark, Link, MousePointer, Clock, DollarSign, BarChart3 } from "lucide-react";
import { KPICard } from "@/components/reports/KPICard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { secondsToWatchTime } from "@/lib/watchTimeUtils";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

interface SpaceOverviewTabProps {
  spaceId: string;
}

interface Content {
  id: string;
  report_id: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  link_clicks: number | null;
  sticker_clicks: number | null;
  watch_time: number | null;
  published_date: string | null;
}

interface Creator {
  id: string;
  report_id: string;
  posts_count: number | null;
  reels_count: number | null;
  stories_count: number | null;
  posts_cost: number | null;
  reels_cost: number | null;
  stories_cost: number | null;
  currency: string | null;
}

interface Report {
  id: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
}

type MetricKey = "views" | "reach" | "engagement" | "cpm" | "cpc" | "content" | "budget";

const SpaceOverviewTab = ({ spaceId }: SpaceOverviewTabProps) => {
  const [content, setContent] = useState<Content[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters - default to last 12 months
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>(() => ({
    start: subMonths(new Date(), 12),
    end: new Date(),
  }));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("views");

  useEffect(() => {
    fetchData();
  }, [spaceId]);

  const fetchData = async () => {
    try {
      // Fetch reports for this space
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("id, type, start_date, end_date")
        .eq("space_id", spaceId);

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      const reportIds = reportsData?.map(r => r.id) || [];
      
      if (reportIds.length === 0) {
        setContent([]);
        setCreators([]);
        setLoading(false);
        return;
      }

      // Fetch content and creators for all reports
      const [contentRes, creatorsRes] = await Promise.all([
        supabase
          .from("content")
          .select("id, report_id, reach, impressions, views, likes, comments, shares, saves, link_clicks, sticker_clicks, watch_time, published_date")
          .in("report_id", reportIds),
        supabase
          .from("creators")
          .select("id, report_id, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost, currency")
          .in("report_id", reportIds),
      ]);

      if (contentRes.error) throw contentRes.error;
      if (creatorsRes.error) throw creatorsRes.error;

      setContent(contentRes.data || []);
      setCreators(creatorsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch space overview data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter reports by type
  const filteredReportIds = useMemo(() => {
    return reports
      .filter(r => typeFilter === "all" || r.type === typeFilter)
      .filter(r => {
        if (dateRange.start && r.start_date && new Date(r.start_date) < dateRange.start) return false;
        if (dateRange.end && r.end_date && new Date(r.end_date) > dateRange.end) return false;
        return true;
      })
      .map(r => r.id);
  }, [reports, typeFilter, dateRange]);

  // Filter content and creators by filtered reports
  const filteredContent = useMemo(() => {
    return content.filter(c => filteredReportIds.includes(c.report_id));
  }, [content, filteredReportIds]);

  const filteredCreators = useMemo(() => {
    return creators.filter(c => filteredReportIds.includes(c.report_id));
  }, [creators, filteredReportIds]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalReach = filteredContent.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalImpressions = filteredContent.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalViews = filteredContent.reduce((sum, c) => sum + (c.views || 0), 0);
    const impressionsViews = totalImpressions + totalViews;
    const totalWatchTime = filteredContent.reduce((sum, c) => sum + (c.watch_time || 0), 0);
    
    const totalLikes = filteredContent.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = filteredContent.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = filteredContent.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = filteredContent.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
    const totalLinkClicks = filteredContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
    const totalStickerClicks = filteredContent.reduce((sum, c) => sum + (c.sticker_clicks || 0), 0);
    
    const engagementRate = impressionsViews > 0 ? (totalInteractions / impressionsViews) * 100 : 0;
    const viralityRate = impressionsViews > 0 ? (totalShares / impressionsViews) * 100 : 0;
    const utilityScore = impressionsViews > 0 ? (totalSaves / impressionsViews) * 100 : 0;
    
    const contentPieces = filteredContent.length;
    const totalBudget = filteredCreators.reduce((sum, c) => {
      const postsCost = (c.posts_count || 0) * (c.posts_cost || 0);
      const reelsCost = (c.reels_count || 0) * (c.reels_cost || 0);
      const storiesCost = (c.stories_count || 0) * (c.stories_cost || 0);
      return sum + postsCost + reelsCost + storiesCost;
    }, 0);
    
    const watchTimeMinutes = totalWatchTime / 60;
    const watchTimeCostPerMinute = watchTimeMinutes > 0 ? totalBudget / watchTimeMinutes : 0;
    const cpm = impressionsViews > 0 ? (totalBudget / impressionsViews) * 1000 : 0;
    const cpc = totalLinkClicks > 0 ? totalBudget / totalLinkClicks : 0;
    
    // Determine currency
    const currencies = filteredCreators.map(c => c.currency || "CZK");
    const currencyCounts = currencies.reduce((acc, cur) => ({ ...acc, [cur]: (acc[cur] || 0) + 1 }), {} as Record<string, number>);
    const dominantCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "CZK";

    return {
      reach: totalReach,
      impressionsViews,
      watchTime: totalWatchTime,
      interactions: totalInteractions,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      engagementRate,
      viralityRate,
      utilityScore,
      linkClicks: totalLinkClicks,
      stickerClicks: totalStickerClicks,
      contentPieces,
      budget: totalBudget,
      watchTimeCostPerMinute,
      cpm,
      cpc,
      currency: dominantCurrency,
    };
  }, [filteredContent, filteredCreators]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const monthlyData: Record<string, { 
      monthKey: string; 
      month: string; 
      views: number; 
      reach: number; 
      interactions: number; 
      budget: number; 
      content: number;
      linkClicks: number;
    }> = {};
    
    filteredContent.forEach(c => {
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
          budget: 0, 
          content: 0,
          linkClicks: 0,
        };
      }
      
      monthlyData[monthKey].views += (c.impressions || 0) + (c.views || 0);
      monthlyData[monthKey].reach += c.reach || 0;
      monthlyData[monthKey].interactions += (c.likes || 0) + (c.comments || 0) + (c.shares || 0) + (c.saves || 0);
      monthlyData[monthKey].content += 1;
      monthlyData[monthKey].linkClicks += c.link_clicks || 0;
    });

    // Calculate average budget per content piece for distribution
    const avgBudgetPerContent = kpis.contentPieces > 0 ? kpis.budget / kpis.contentPieces : 0;

    // Sort by monthKey (yyyy-MM) for chronological order, then add calculated metrics
    return Object.values(monthlyData)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(d => {
        const monthBudget = d.content * avgBudgetPerContent;
        return {
          month: d.month,
          views: d.views,
          reach: d.reach,
          interactions: d.interactions,
          content: d.content,
          budget: monthBudget,
          engagement: d.views > 0 ? (d.interactions / d.views) * 100 : 0,
          cpm: d.views > 0 ? (monthBudget / d.views) * 1000 : 0,
          cpc: d.linkClicks > 0 ? monthBudget / d.linkClicks : 0,
        };
      });
  }, [filteredContent, kpis]);

  const metricLabels: Record<MetricKey, string> = {
    views: "Impressions/Views",
    reach: "Reach",
    engagement: "Engagement Rate (%)",
    cpm: "CPM",
    cpc: "CPC",
    content: "Content Pieces",
    budget: "Budget Spent",
  };

  // Format chart values based on metric type
  const formatChartValue = (value: number, metric: MetricKey): string => {
    const locale = kpis.currency === "CZK" ? "cs-CZ" : "en-US";
    switch (metric) {
      case "budget":
      case "cpm":
      case "cpc":
        return formatCurrency(value, kpis.currency);
      case "engagement":
        return `${value.toFixed(2)}%`;
      case "views":
      case "reach":
      case "content":
        return value.toLocaleString(locale, { maximumFractionDigits: 0 });
      default:
        return value.toLocaleString(locale, { maximumFractionDigits: 2 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p>Loading overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                dateRange.start
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.start ? format(dateRange.start, "PPP") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.start || undefined}
              onSelect={(date) => setDateRange(prev => ({ ...prev, start: date || null }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                dateRange.end
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.end ? format(dateRange.end, "PPP") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange.end || undefined}
              onSelect={(date) => setDateRange(prev => ({ ...prev, end: date || null }))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className={cn(
            "w-[200px] rounded-[35px]",
            typeFilter !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="Report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="influencer">Influencer campaign</SelectItem>
            <SelectItem value="ads">Ads campaign</SelectItem>
            <SelectItem value="always_on">Always-on content</SelectItem>
          </SelectContent>
        </Select>

        {(dateRange.start || dateRange.end || typeFilter !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setDateRange({ start: null, end: null });
              setTypeFilter("all");
            }}
            className="rounded-[35px]"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* KPI Sections */}
      <div className="space-y-8">
        {/* Awareness */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Awareness</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard title="Reach" value={kpis.reach.toLocaleString()} icon={Users} accentColor="blue" />
            <KPICard title="Impressions/Views" value={kpis.impressionsViews.toLocaleString()} icon={Eye} accentColor="blue" />
            <KPICard title="Watch Time" value={secondsToWatchTime(kpis.watchTime)} icon={Clock} accentColor="blue" />
          </div>
        </div>

        {/* Engagement */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Engagement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <KPICard title="Interactions" value={kpis.interactions.toLocaleString()} icon={Heart} accentColor="green" />
            <KPICard title="Likes" value={kpis.likes.toLocaleString()} icon={Heart} />
            <KPICard title="Comments" value={kpis.comments.toLocaleString()} icon={MessageCircle} />
            <KPICard title="Shares" value={kpis.shares.toLocaleString()} icon={Share2} />
            <KPICard title="Saves" value={kpis.saves.toLocaleString()} icon={Bookmark} />
            <KPICard title="Engagement Rate" value={`${kpis.engagementRate.toFixed(2)}%`} accentColor="green" />
            <KPICard title="Virality Rate" value={`${kpis.viralityRate.toFixed(4)}%`} />
            <KPICard title="Utility Score" value={`${kpis.utilityScore.toFixed(4)}%`} />
            <KPICard title="Link Clicks" value={kpis.linkClicks.toLocaleString()} icon={Link} />
            <KPICard title="Sticker Clicks" value={kpis.stickerClicks.toLocaleString()} icon={MousePointer} />
          </div>
        </div>

        {/* Effectiveness */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Effectiveness</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard title="Content Pieces" value={kpis.contentPieces.toLocaleString()} icon={BarChart3} accentColor="orange" />
            <KPICard title="Budget Spent" value={formatCurrency(kpis.budget, kpis.currency)} icon={DollarSign} accentColor="orange" />
            <KPICard title="Watch Time Cost/Min" value={formatCurrency(kpis.watchTimeCostPerMinute, kpis.currency)} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(kpis.cpm, kpis.currency)} accentColor="orange" />
            <KPICard title="CPC" value={formatCurrency(kpis.cpc, kpis.currency)} accentColor="orange" />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default SpaceOverviewTab;
