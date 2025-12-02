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
  link_clicks: number | null;
  watch_time: number | null;
}

type MetricType = "impressions_views" | "cpm" | "cpc" | "er" | "content_pieces" | "watch_time_cpm";

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: "impressions_views", label: "Impr/Views" },
  { value: "cpm", label: "CPM" },
  { value: "cpc", label: "CPC" },
  { value: "er", label: "ER" },
  { value: "content_pieces", label: "Content" },
  { value: "watch_time_cpm", label: "WT CPM" },
];

export const CreatorsTab = ({ reportId }: CreatorsTabProps) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("impressions_views");

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
      
      // Aggregate content metrics
      const impressionsViews = creatorContent.reduce((sum, c) => 
        sum + (c.impressions || 0) + (c.views || 0), 0);
      const interactions = creatorContent.reduce((sum, c) => 
        sum + (c.likes || 0) + (c.comments || 0) + (c.shares || 0) + (c.saves || 0), 0);
      const linkClicks = creatorContent.reduce((sum, c) => sum + (c.link_clicks || 0), 0);
      const watchTimeSeconds = creatorContent.reduce((sum, c) => sum + (c.watch_time || 0), 0);
      
      // Creator costs
      const totalCost = (creator.posts_cost || 0) * (creator.posts_count || 0) +
                        (creator.reels_cost || 0) * (creator.reels_count || 0) +
                        (creator.stories_cost || 0) * (creator.stories_count || 0);
      
      // Content pieces from actual content table
      const contentPieces = creatorContent.length;
      
      // Calculate metrics
      const cpm = impressionsViews > 0 ? (totalCost / impressionsViews) * 1000 : 0;
      const cpc = linkClicks > 0 ? totalCost / linkClicks : 0;
      const er = impressionsViews > 0 ? (interactions / impressionsViews) * 100 : 0;
      const watchTimeMinutes = watchTimeSeconds / 60;
      const watchTimeCpm = watchTimeMinutes > 0 ? totalCost / watchTimeMinutes : 0;

      return {
        name: creator.handle,
        impressions_views: impressionsViews,
        cpm,
        cpc,
        er,
        content_pieces: contentPieces,
        watch_time_cpm: watchTimeCpm,
      };
    });
  }, [creators, content]);

  const formatValue = (value: number, metric: MetricType): string => {
    switch (metric) {
      case "impressions_views":
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toFixed(0);
      case "cpm":
      case "cpc":
      case "watch_time_cpm":
        return formatCurrency(value, primaryCurrency);
      case "er":
        return `${value.toFixed(2)}%`;
      case "content_pieces":
        return value.toFixed(0);
      default:
        return value.toFixed(2);
    }
  };

  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case "impressions_views": return "Impressions / Views";
      case "cpm": return `CPM (${getCurrencySymbol(primaryCurrency)})`;
      case "cpc": return `CPC (${getCurrencySymbol(primaryCurrency)})`;
      case "er": return "Engagement Rate (%)";
      case "content_pieces": return "Content Pieces";
      case "watch_time_cpm": return `Watch Time Cost/Min (${getCurrencySymbol(primaryCurrency)})`;
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
            label={{ 
              value: getMetricLabel(selectedMetric), 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'hsl(var(--foreground))' }
            }}
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
