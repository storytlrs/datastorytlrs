import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, DEFAULT_CURRENCY, getCurrencySymbol } from "@/lib/currencyUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface CreatorsTabProps {
  reportId: string;
}

interface Creator {
  id: string;
  handle: string;
  posts_count: number | null;
  reels_count: number | null;
  stories_count: number | null;
  posts_cost: number | null;
  reels_cost: number | null;
  stories_cost: number | null;
  currency: string | null;
}

interface ContentItem {
  id: string;
  creator_id: string;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reposts: number | null;
  link_clicks: number | null;
  watch_time: number | null;
}

type MetricType = 
  | "views" 
  | "cpm" 
  | "cpc" 
  | "er" 
  | "content_pieces" 
  | "tswb_cost" 
  | "virality_rate" 
  | "utility_score" 
  | "tswb" 
  | "budget_spent";

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: "views", label: "Views" },
  { value: "tswb", label: "TSWB" },
  { value: "tswb_cost", label: "TSWB Cost" },
  { value: "budget_spent", label: "Budget" },
  { value: "cpm", label: "CPM" },
  { value: "cpc", label: "CPC" },
  { value: "er", label: "ER" },
  { value: "virality_rate", label: "Virality" },
  { value: "utility_score", label: "Utility" },
  { value: "content_pieces", label: "Content" },
];

export const CreatorsTab = ({ reportId }: CreatorsTabProps) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("views");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [creatorsRes, contentRes] = await Promise.all([
          supabase.from("creators").select("*").eq("report_id", reportId),
          supabase.from("content").select("*").eq("report_id", reportId),
        ]);

        if (creatorsRes.error) throw creatorsRes.error;
        if (contentRes.error) throw contentRes.error;

        setCreators(creatorsRes.data || []);
        setContent(contentRes.data || []);
      } catch (error) {
        console.error("Error fetching creators data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportId]);

  // Determine primary currency from creators
  const primaryCurrency = useMemo(() => {
    const currencies = creators.map(c => c.currency || DEFAULT_CURRENCY);
    if (currencies.length === 0) return DEFAULT_CURRENCY;
    const counts = currencies.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [creators]);

  // Calculate metrics per creator
  const chartData = useMemo(() => {
    return creators.map(creator => {
      const creatorContent = content.filter(c => c.creator_id === creator.id);
      
      // Views (impressions + views) - unified with Overview
      const views = creatorContent.reduce((sum, c) => 
        sum + (c.impressions || 0) + (c.views || 0), 0);
      
      // Interactions for ER
      const interactions = creatorContent.reduce((sum, c) => 
        sum + (c.likes || 0) + (c.comments || 0) + (c.shares || 0) + (c.saves || 0), 0);
      
      // Individual metrics for Virality and Utility
      const shares = creatorContent.reduce((sum, c) => sum + (c.shares || 0), 0);
      const saves = creatorContent.reduce((sum, c) => sum + (c.saves || 0), 0);
      const linkClicks = creatorContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
      
      // TSWB calculation unified with Overview
      const tswb = creatorContent.reduce((sum, c) => {
        const watchTime = c.watch_time || 0;
        const likes = c.likes || 0;
        const comments = c.comments || 0;
        const savesItem = c.saves || 0;
        const sharesItem = c.shares || 0;
        const reposts = c.reposts || 0;
        return sum + watchTime + (likes * 3) + (comments * 5) + ((savesItem + sharesItem + reposts) * 10);
      }, 0);
      
      // Budget (total cost)
      const budgetSpent = (creator.posts_cost || 0) * (creator.posts_count || 0) +
                          (creator.reels_cost || 0) * (creator.reels_count || 0) +
                          (creator.stories_cost || 0) * (creator.stories_count || 0);
      
      // Content pieces from actual content table
      const contentPieces = creatorContent.length;
      
      // Derived metrics
      const cpm = views > 0 ? (budgetSpent / views) * 1000 : 0;
      const cpc = linkClicks > 0 ? budgetSpent / linkClicks : 0;
      const er = views > 0 ? (interactions / views) * 100 : 0;
      
      // TSWB Cost per Minute (unified with Overview)
      const tswbMinutes = tswb / 60;
      const tswbCost = tswbMinutes > 0 ? budgetSpent / tswbMinutes : 0;
      
      // Virality Rate = (Shares / Views) × 100
      const viralityRate = views > 0 ? (shares / views) * 100 : 0;
      
      // Utility Score = (Saves / Views) × 100
      const utilityScore = views > 0 ? (saves / views) * 100 : 0;

      return {
        name: creator.handle,
        views,
        cpm,
        cpc,
        er,
        content_pieces: contentPieces,
        tswb_cost: tswbCost,
        virality_rate: viralityRate,
        utility_score: utilityScore,
        tswb,
        budget_spent: budgetSpent,
      };
    });
  }, [creators, content]);

  const formatValue = (value: number, metric: MetricType): string => {
    switch (metric) {
      case "views":
      case "tswb":
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toFixed(0);
      case "cpm":
      case "cpc":
      case "tswb_cost":
      case "budget_spent":
        return formatCurrency(value, primaryCurrency);
      case "er":
      case "virality_rate":
      case "utility_score":
        return `${value.toFixed(2)}%`;
      case "content_pieces":
        return value.toFixed(0);
      default:
        return value.toFixed(2);
    }
  };

  const getMetricLabel = (metric: MetricType): string => {
    const symbol = getCurrencySymbol(primaryCurrency);
    switch (metric) {
      case "views": return "Views";
      case "cpm": return `CPM (${symbol})`;
      case "cpc": return `CPC (${symbol})`;
      case "er": return "Engagement Rate (%)";
      case "content_pieces": return "Content Pieces";
      case "tswb_cost": return `TSWB Cost/Min (${symbol})`;
      case "virality_rate": return "Virality Rate (%)";
      case "utility_score": return "Utility Score (%)";
      case "tswb": return "TSWB (seconds)";
      case "budget_spent": return `Budget Spent (${symbol})`;
      default: return "";
    }
  };

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-10 w-full max-w-xl mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </Card>
    );
  }

  if (creators.length === 0) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <h2 className="text-2xl font-bold mb-2">Creator Performance</h2>
        <p className="text-muted-foreground">
          No creators found. Add creators in the Data tab to see performance comparisons.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Creator Performance</h2>
        <p className="text-muted-foreground">
          Compare creators across key metrics
        </p>
      </div>

      {/* Metric Toggle */}
      <div className="mb-6">
        <ToggleGroup 
          type="single" 
          value={selectedMetric} 
          onValueChange={(value) => value && setSelectedMetric(value as MetricType)}
          className="justify-start flex-wrap gap-2"
        >
          {METRIC_OPTIONS.map((option) => (
            <ToggleGroupItem 
              key={option.value} 
              value={option.value}
              className="rounded-[35px] border border-foreground bg-card text-foreground px-4 py-2 hover:border-foreground hover:bg-foreground hover:text-background data-[state=on]:bg-accent-orange data-[state=on]:text-foreground data-[state=on]:border-accent-orange"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.2}
          />
          <XAxis 
            dataKey="name" 
            stroke="hsl(var(--foreground))"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            stroke="hsl(var(--foreground))"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            tickFormatter={(value) => formatValue(value, selectedMetric)}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [formatValue(value, selectedMetric), getMetricLabel(selectedMetric)]}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar 
            dataKey={selectedMetric} 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill="hsl(var(--accent))" 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
