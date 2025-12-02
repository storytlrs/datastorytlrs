import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "./KPICard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { 
  Users, 
  Eye, 
  Clock, 
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  TrendingUp,
  Zap,
  Award,
  Link,
  Target,
  FileText,
  DollarSign,
  MousePointer,
  BarChart3,
  CalendarIcon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { secondsToWatchTime } from "@/lib/watchTimeUtils";
import { formatCurrency as formatCurrencyUtil, DEFAULT_CURRENCY } from "@/lib/currencyUtils";

interface OverviewTabProps {
  reportId: string;
}

interface Creator {
  id: string;
  handle: string;
  currency: string | null;
  posts_count: number | null;
  reels_count: number | null;
  stories_count: number | null;
  posts_cost: number | null;
  reels_cost: number | null;
  stories_cost: number | null;
}

interface Content {
  id: string;
  creator_id: string;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  watch_time: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  link_clicks: number | null;
  sticker_clicks: number | null;
  published_date: string | null;
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

export const OverviewTab = ({ reportId }: OverviewTabProps) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [selectedCreator, setSelectedCreator] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [creatorsRes, contentRes] = await Promise.all([
        supabase.from("creators").select("id, handle, currency, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost").eq("report_id", reportId),
        supabase.from("content").select("id, creator_id, reach, impressions, views, watch_time, likes, comments, shares, saves, link_clicks, sticker_clicks, published_date").eq("report_id", reportId),
      ]);
      setCreators(creatorsRes.data || []);
      setContent(contentRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [reportId]);

  // Filter content by date range and creator
  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (selectedCreator !== "all" && item.creator_id !== selectedCreator) return false;
      if (dateRange.start && item.published_date && new Date(item.published_date) < dateRange.start) return false;
      if (dateRange.end && item.published_date && new Date(item.published_date) > dateRange.end) return false;
      return true;
    });
  }, [content, selectedCreator, dateRange]);

  // Filter creators if specific one selected
  const relevantCreators = useMemo(() => {
    return selectedCreator === "all" ? creators : creators.filter((c) => c.id === selectedCreator);
  }, [creators, selectedCreator]);

  // Determine report currency from creators (most common currency)
  const reportCurrency = useMemo(() => {
    if (creators.length === 0) return DEFAULT_CURRENCY;
    const currencyCounts = creators.reduce((acc, c) => {
      const curr = c.currency || DEFAULT_CURRENCY;
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0];
  }, [creators]);

  // Format currency using the report's currency
  const formatCurrency = (num: number): string => formatCurrencyUtil(num, reportCurrency);

  // Awareness KPIs
  const awarenessKPIs = useMemo(() => {
    const totalReach = filteredContent.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalImpressions = filteredContent.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalViews = filteredContent.reduce((sum, c) => sum + (c.views || 0), 0);
    const totalWatchTimeSeconds = filteredContent.reduce((sum, c) => sum + (c.watch_time || 0), 0);

    return {
      reach: totalReach,
      impressionsViews: totalImpressions + totalViews,
      watchTimeSeconds: totalWatchTimeSeconds,
    };
  }, [filteredContent]);

  // Engagement KPIs
  const engagementKPIs = useMemo(() => {
    const totalLikes = filteredContent.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = filteredContent.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = filteredContent.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = filteredContent.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalLinkClicks = filteredContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
    const totalStickerClicks = filteredContent.reduce((sum, c) => sum + (c.sticker_clicks || 0), 0);

    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
    const totalExposure = awarenessKPIs.impressionsViews;

    const engagementRate = totalExposure > 0 ? (totalInteractions / totalExposure) * 100 : 0;
    const viralityRate = totalExposure > 0 ? (totalShares / totalExposure) * 100 : 0;
    const utilityScore = totalExposure > 0 ? (totalSaves / totalExposure) * 100 : 0;

    return {
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
    };
  }, [filteredContent, awarenessKPIs]);

  // Effectiveness KPIs
  const effectivenessKPIs = useMemo(() => {
    // Content pieces from actual content table
    const contentPieces = filteredContent.length;

    const budgetSpent = relevantCreators.reduce((sum, c) => {
      return (
        sum +
        (c.posts_count || 0) * (c.posts_cost || 0) +
        (c.reels_count || 0) * (c.reels_cost || 0) +
        (c.stories_count || 0) * (c.stories_cost || 0)
      );
    }, 0);

    const watchTimeMinutes = awarenessKPIs.watchTimeSeconds / 60;
    const watchTimeCostPerMinute = watchTimeMinutes > 0 ? budgetSpent / watchTimeMinutes : 0;

    // CPM: (budget / (impressions + views)) × 1000
    const cpm = awarenessKPIs.impressionsViews > 0 ? (budgetSpent / awarenessKPIs.impressionsViews) * 1000 : 0;

    const cpc = engagementKPIs.linkClicks > 0 ? budgetSpent / engagementKPIs.linkClicks : 0;

    return {
      contentPieces,
      budgetSpent,
      watchTimeCostPerMinute,
      cpm,
      cpc,
    };
  }, [relevantCreators, awarenessKPIs, engagementKPIs, filteredContent]);

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    setSelectedCreator("all");
  };

  const hasFilters = dateRange.start || dateRange.end || selectedCreator !== "all";

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </Card>
    );
  }

  if (content.length === 0) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <p className="text-muted-foreground text-center">
          No content data available. Import data in the Data tab to see KPIs.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Start Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Start Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal rounded-[35px]",
                  !dateRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.start ? format(dateRange.start, "MMM d, yyyy") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[20px]" align="start">
              <Calendar
                mode="single"
                selected={dateRange.start || undefined}
                onSelect={(date) => setDateRange((prev) => ({ ...prev, start: date || null }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">End Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal rounded-[35px]",
                  !dateRange.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.end ? format(dateRange.end, "MMM d, yyyy") : "Select"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[20px]" align="start">
              <Calendar
                mode="single"
                selected={dateRange.end || undefined}
                onSelect={(date) => setDateRange((prev) => ({ ...prev, end: date || null }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Creator Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Creator</label>
          <Select value={selectedCreator} onValueChange={setSelectedCreator}>
            <SelectTrigger className="w-[180px] rounded-[35px]">
              <SelectValue placeholder="All creators" />
            </SelectTrigger>
            <SelectContent className="rounded-[20px]">
              <SelectItem value="all">All creators</SelectItem>
              {creators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id}>
                  {creator.handle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="rounded-[35px]">
            <X className="w-4 h-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Awareness Section */}
      <KPISection title="Awareness" icon={Eye}>
        <KPICard title="Reach" value={formatNumber(awarenessKPIs.reach)} icon={Users} accentColor="default" />
        <KPICard title="Impressions / Views" value={formatNumber(awarenessKPIs.impressionsViews)} icon={Eye} accentColor="blue" />
        <KPICard title="Watch Time" value={awarenessKPIs.watchTimeSeconds > 0 ? secondsToWatchTime(awarenessKPIs.watchTimeSeconds) : "-"} icon={Clock} accentColor="default" />
      </KPISection>

      {/* Engagement Section */}
      <KPISection title="Engagement" icon={MessageCircle}>
        <KPICard title="Interactions" value={formatNumber(engagementKPIs.interactions)} icon={TrendingUp} accentColor="green" />
        <KPICard title="Likes" value={formatNumber(engagementKPIs.likes)} icon={Heart} accentColor="default" />
        <KPICard title="Comments" value={formatNumber(engagementKPIs.comments)} icon={MessageCircle} accentColor="default" />
        <KPICard title="Shares" value={formatNumber(engagementKPIs.shares)} icon={Share2} accentColor="default" />
        <KPICard title="Saves" value={formatNumber(engagementKPIs.saves)} icon={Bookmark} accentColor="default" />
        <KPICard title="Engagement Rate" value={formatPercent(engagementKPIs.engagementRate)} icon={TrendingUp} accentColor="green" />
        <KPICard title="Virality Rate" value={formatPercent(engagementKPIs.viralityRate, 3)} icon={Zap} accentColor="orange" />
        <KPICard title="Utility Score" value={formatPercent(engagementKPIs.utilityScore, 3)} icon={Award} accentColor="blue" />
        <KPICard title="Link Clicks" value={formatNumber(engagementKPIs.linkClicks)} icon={Link} accentColor="default" />
        <KPICard title="Sticker Clicks" value={formatNumber(engagementKPIs.stickerClicks)} icon={Target} accentColor="default" />
      </KPISection>

      {/* Effectiveness Section */}
      <KPISection title="Effectiveness" icon={BarChart3}>
        <KPICard title="Content Pieces" value={effectivenessKPIs.contentPieces.toString()} icon={FileText} accentColor="default" />
        <KPICard title="Budget Spent" value={formatCurrency(effectivenessKPIs.budgetSpent)} icon={DollarSign} accentColor="orange" />
        <KPICard title="Watch Time Cost per Minute" value={formatCurrency(effectivenessKPIs.watchTimeCostPerMinute)} icon={Clock} accentColor="default" />
        <KPICard title="CPM" value={formatCurrency(effectivenessKPIs.cpm)} icon={DollarSign} accentColor="orange" />
        <KPICard title="CPC" value={formatCurrency(effectivenessKPIs.cpc)} icon={MousePointer} accentColor="default" />
      </KPISection>
    </div>
  );
};
