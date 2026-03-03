import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "./KPICard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
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
  Wallet,
  MousePointer,
  BarChart3,
  CalendarIcon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { secondsToReadableTime } from "@/lib/watchTimeUtils";
import { formatCurrency as formatCurrencyUtil, DEFAULT_CURRENCY } from "@/lib/currencyUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendDataPoint {
  date: string;
  value: number;
}

interface KPI {
  reach: number;
  impressionsViews: number;
  watchTimeSeconds: number;
}

interface EngagementKPI {
  interactions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  engagementRate: number;
  viralityRate: number;
  utilityScore: number;
  linkClicks: number;
  stickerClicks: number;
  tswb: number;
}

interface EffectivenessKPI {
  contentPieces: number;
  creatorsCount: number;
  budgetSpent: number;
  tswbCostPerMinute: number;
  cpm: number;
  cpc: number;
}

interface Benchmarks {
  reach: number;
  views: number;
  watchTimeSeconds: number;
  interactions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reposts: number;
  linkClicks: number;
  stickerClicks: number;
  tswb: number;
  engagementRate: number;
  viralityRate: number;
  utilityScore: number;
  creatorsCount: number;
  contentPieces: number;
  budgetSpent: number;
  tswbCostPerMinute: number;
  cpm: number;
  cpc: number;
}

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
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter";
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
  reposts: number | null;
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

const OVERVIEW_TREND_METRICS = [
  { value: "reach", label: "Reach" },
  { value: "views", label: "Views" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "shares", label: "Shares" },
  { value: "saves", label: "Saves" },
  { value: "watch_time", label: "Watch Time (s)" },
];

const TREND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export const OverviewTab = ({ reportId }: OverviewTabProps) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [spaceContent, setSpaceContent] = useState<Content[]>([]);
  const [spaceCreators, setSpaceCreators] = useState<Creator[]>([]);
  const [spaceReportCount, setSpaceReportCount] = useState(0);

  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [trendMetric, setTrendMetric] = useState("reach");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: reportData } = await supabase
        .from("reports")
        .select("space_id, type")
        .eq("id", reportId)
        .single();
      
      const currentSpaceId = reportData?.space_id;
      const currentReportType = reportData?.type;
      
      const { data: spaceReports } = await supabase
        .from("reports")
        .select("id")
        .eq("space_id", currentSpaceId)
        .eq("type", currentReportType);
      
      const allReportIds = spaceReports?.map(r => r.id) || [];
      setSpaceReportCount(allReportIds.length);
      
      const [creatorsRes, contentRes, spaceCreatorsRes, spaceContentRes] = await Promise.all([
        supabase.from("creators").select("id, handle, currency, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost").eq("report_id", reportId),
        supabase.from("content").select("id, creator_id, platform, reach, impressions, views, watch_time, likes, comments, shares, saves, link_clicks, sticker_clicks, published_date, reposts").eq("report_id", reportId),
        supabase.from("creators").select("id, handle, currency, posts_count, reels_count, stories_count, posts_cost, reels_cost, stories_cost").in("report_id", allReportIds),
        supabase.from("content").select("id, creator_id, platform, reach, impressions, views, watch_time, likes, comments, shares, saves, link_clicks, sticker_clicks, published_date, reposts").in("report_id", allReportIds),
      ]);
      
      setCreators(creatorsRes.data || []);
      setContent(contentRes.data || []);
      setSpaceCreators(spaceCreatorsRes.data || []);
      setSpaceContent(spaceContentRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [reportId]);

  const availablePlatforms = useMemo(() => {
    const platforms = [...new Set(content.map((c) => c.platform))];
    return platforms.sort();
  }, [content]);

  const sortedCreators = useMemo(() => {
    return [...creators].sort((a, b) => 
      a.handle.toLowerCase().localeCompare(b.handle.toLowerCase())
    );
  }, [creators]);

  const filteredContent = useMemo(() => {
    return content.filter((item) => {
      if (selectedCreator !== "all" && item.creator_id !== selectedCreator) return false;
      if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;
      if (dateRange.start && item.published_date && new Date(item.published_date) < dateRange.start) return false;
      if (dateRange.end && item.published_date && new Date(item.published_date) > dateRange.end) return false;
      return true;
    });
  }, [content, selectedCreator, selectedPlatform, dateRange]);

  const relevantCreators = useMemo(() => {
    return selectedCreator === "all" ? creators : creators.filter((c) => c.id === selectedCreator);
  }, [creators, selectedCreator]);

  const reportCurrency = useMemo(() => {
    if (creators.length === 0) return DEFAULT_CURRENCY;
    const currencyCounts = creators.reduce((acc, c) => {
      const curr = c.currency || DEFAULT_CURRENCY;
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0][0];
  }, [creators]);

  const formatCurrency = (num: number): string => formatCurrencyUtil(num, reportCurrency);

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

  const engagementKPIs = useMemo(() => {
    const totalLikes = filteredContent.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = filteredContent.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = filteredContent.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = filteredContent.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalReposts = filteredContent.reduce((sum, c) => sum + (c.reposts || 0), 0);
    const totalLinkClicks = filteredContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
    const totalStickerClicks = filteredContent.reduce((sum, c) => sum + (c.sticker_clicks || 0), 0);

    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
    const totalExposure = awarenessKPIs.impressionsViews;

    const engagementRate = totalExposure > 0 ? (totalInteractions / totalExposure) * 100 : 0;
    const viralityRate = totalExposure > 0 ? (totalShares / totalExposure) * 100 : 0;
    const utilityScore = totalExposure > 0 ? (totalSaves / totalExposure) * 100 : 0;

    const totalTSWB = filteredContent.reduce((sum, c) => {
      const watchTime = c.watch_time || 0;
      const likes = c.likes || 0;
      const comments = c.comments || 0;
      const saves = c.saves || 0;
      const shares = c.shares || 0;
      const reposts = c.reposts || 0;
      return sum + watchTime + (likes * 3) + (comments * 5) + ((saves + shares + reposts) * 10);
    }, 0);

    return {
      interactions: totalInteractions,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      reposts: totalReposts,
      engagementRate,
      viralityRate,
      utilityScore,
      linkClicks: totalLinkClicks,
      stickerClicks: totalStickerClicks,
      tswb: totalTSWB,
    };
  }, [filteredContent, awarenessKPIs]);

  const effectivenessKPIs = useMemo(() => {
    const contentPieces = filteredContent.length;
    const creatorsCount = relevantCreators.length;

    const budgetSpent = relevantCreators.reduce((sum, c) => {
      return (
        sum +
        (c.posts_count || 0) * (c.posts_cost || 0) +
        (c.reels_count || 0) * (c.reels_cost || 0) +
        (c.stories_count || 0) * (c.stories_cost || 0)
      );
    }, 0);

    const tswbMinutes = engagementKPIs.tswb / 60;
    const tswbCostPerMinute = tswbMinutes > 0 ? budgetSpent / tswbMinutes : 0;
    const cpm = awarenessKPIs.impressionsViews > 0 ? (budgetSpent / awarenessKPIs.impressionsViews) * 1000 : 0;
    const cpc = engagementKPIs.linkClicks > 0 ? budgetSpent / engagementKPIs.linkClicks : 0;

    return {
      contentPieces,
      creatorsCount,
      budgetSpent,
      tswbCostPerMinute,
      cpm,
      cpc,
    };
  }, [relevantCreators, awarenessKPIs, engagementKPIs, filteredContent]);

  const trendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredContent.forEach((item) => {
      const date = item.published_date;
      if (!date) return;
      const key = date.substring(0, 10);
      const val = (item as any)[trendMetric] || 0;
      grouped[key] = (grouped[key] || 0) + val;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [filteredContent, trendMetric]);

  const benchmarks = useMemo(() => {
    if (spaceReportCount === 0) return null;

    const totalReach = spaceContent.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalViews = spaceContent.reduce((sum, c) => sum + (c.impressions || 0) + (c.views || 0), 0);
    const totalWatchTimeSeconds = spaceContent.reduce((sum, c) => sum + (c.watch_time || 0), 0);

    const totalLikes = spaceContent.reduce((sum, c) => sum + (c.likes || 0), 0);
    const totalComments = spaceContent.reduce((sum, c) => sum + (c.comments || 0), 0);
    const totalShares = spaceContent.reduce((sum, c) => sum + (c.shares || 0), 0);
    const totalSaves = spaceContent.reduce((sum, c) => sum + (c.saves || 0), 0);
    const totalReposts = spaceContent.reduce((sum, c) => sum + (c.reposts || 0), 0);
    const totalLinkClicks = spaceContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
    const totalStickerClicks = spaceContent.reduce((sum, c) => sum + (c.sticker_clicks || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;

    const totalTSWB = spaceContent.reduce((sum, c) => {
      const watchTime = c.watch_time || 0;
      const likes = c.likes || 0;
      const comments = c.comments || 0;
      const saves = c.saves || 0;
      const shares = c.shares || 0;
      const reposts = c.reposts || 0;
      return sum + watchTime + (likes * 3) + (comments * 5) + ((saves + shares + reposts) * 10);
    }, 0);

    const engagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;
    const viralityRate = totalViews > 0 ? (totalShares / totalViews) * 100 : 0;
    const utilityScore = totalViews > 0 ? (totalSaves / totalViews) * 100 : 0;

    const totalBudget = spaceCreators.reduce((sum, c) => {
      return sum + 
        (c.posts_count || 0) * (c.posts_cost || 0) +
        (c.reels_count || 0) * (c.reels_cost || 0) +
        (c.stories_count || 0) * (c.stories_cost || 0);
    }, 0);

    const tswbMinutes = totalTSWB / 60;
    const tswbCostPerMinute = tswbMinutes > 0 ? totalBudget / tswbMinutes : 0;
    const cpm = totalViews > 0 ? (totalBudget / totalViews) * 1000 : 0;
    const cpc = totalLinkClicks > 0 ? totalBudget / totalLinkClicks : 0;

    return {
      reach: totalReach / spaceReportCount,
      views: totalViews / spaceReportCount,
      watchTimeSeconds: totalWatchTimeSeconds / spaceReportCount,
      interactions: totalInteractions / spaceReportCount,
      likes: totalLikes / spaceReportCount,
      comments: totalComments / spaceReportCount,
      shares: totalShares / spaceReportCount,
      saves: totalSaves / spaceReportCount,
      reposts: totalReposts / spaceReportCount,
      linkClicks: totalLinkClicks / spaceReportCount,
      stickerClicks: totalStickerClicks / spaceReportCount,
      tswb: totalTSWB / spaceReportCount,
      engagementRate,
      viralityRate,
      utilityScore,
      creatorsCount: spaceCreators.length / spaceReportCount,
      contentPieces: spaceContent.length / spaceReportCount,
      budgetSpent: totalBudget / spaceReportCount,
      tswbCostPerMinute,
      cpm,
      cpc,
    };
  }, [spaceContent, spaceCreators, spaceReportCount]);

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    setSelectedCreator("all");
    setSelectedPlatform("all");
  };

  const hasFilters = dateRange.start || dateRange.end || selectedCreator !== "all" || selectedPlatform !== "all";

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
      <div className="flex flex-wrap gap-4 items-center">
        <DateRangeFilter
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <Select value={selectedCreator} onValueChange={setSelectedCreator}>
          <SelectTrigger className={cn(
            "w-[180px] rounded-[35px]",
            selectedCreator !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="All creators" />
          </SelectTrigger>
          <SelectContent className="rounded-[20px]">
            <SelectItem value="all">All creators</SelectItem>
            {sortedCreators.map((creator) => (
              <SelectItem key={creator.id} value={creator.id}>
                {creator.handle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className={cn(
            "w-[180px] rounded-[35px]",
            selectedPlatform !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent className="rounded-[20px]">
            <SelectItem value="all">All platforms</SelectItem>
            {availablePlatforms.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="rounded-[35px]">
            <X className="w-4 h-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Základní metriky */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="font-bold text-lg uppercase tracking-wide">Základní metriky</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Influencers" value={effectivenessKPIs.creatorsCount.toString()} icon={Users} accentColor="blue" />
          <KPICard title="Content Pieces" value={effectivenessKPIs.contentPieces.toString()} icon={FileText} accentColor="blue" />
          <KPICard title="Total Views" value={formatNumber(awarenessKPIs.impressionsViews)} icon={Eye} accentColor="blue" />
          <KPICard title="Avg CPM" value={formatCurrency(effectivenessKPIs.cpm)} icon={Wallet} accentColor="blue" tooltip="CPM (Cost per Mille) = (Budget Spent / Views) × 1000." />
        </div>
      </div>

      {/* Inovativní a kvalitativní metriky */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-bold text-lg uppercase tracking-wide">Inovativní a kvalitativní metriky</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="TSWB" value={secondsToReadableTime(engagementKPIs.tswb)} icon={Clock} accentColor="green" tooltip="TSWB (Time Spent With Brand) = Watch Time + (Likes × 3) + (Comments × 5) + ((Saves + Shares + Reposts) × 10)." />
          <KPICard title="Interactions" value={formatNumber(engagementKPIs.interactions)} icon={TrendingUp} accentColor="green" />
          <KPICard title="Engagement Rate" value={formatPercent(engagementKPIs.engagementRate)} icon={Zap} accentColor="green" tooltip="Engagement Rate = (Interactions / Views) × 100." />
          <KPICard title="Virality Avg" value={formatPercent(engagementKPIs.viralityRate, 3)} icon={Share2} accentColor="green" tooltip="Virality Rate = (Shares / Views) × 100." />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Likes" value={formatNumber(engagementKPIs.likes)} icon={Heart} accentColor="green" />
          <KPICard title="Comments" value={formatNumber(engagementKPIs.comments)} icon={MessageCircle} accentColor="green" />
          <KPICard title="Shares" value={formatNumber(engagementKPIs.shares)} icon={Share2} accentColor="green" />
          <KPICard title="Saves" value={formatNumber(engagementKPIs.saves)} icon={Bookmark} accentColor="green" />
        </div>
      </div>
      {/* Trend Chart - temporarily hidden */}
    </div>
  );
};
