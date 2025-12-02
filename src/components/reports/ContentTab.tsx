import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageCircle, Share2, ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

interface ContentTabProps {
  reportId: string;
}

interface ContentItem {
  id: string;
  platform: string;
  content_type: string;
  thumbnail_url: string | null;
  views: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  published_date: string | null;
  creators: { id: string; handle: string } | null;
}

export const ContentTab = ({ reportId }: ContentTabProps) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  useEffect(() => {
    fetchContent();
  }, [reportId]);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content")
      .select("id, platform, content_type, thumbnail_url, views, impressions, likes, comments, shares, saves, published_date, creators(id, handle)")
      .eq("report_id", reportId)
      .order("published_date", { ascending: false });

    if (!error) {
      setContent(data || []);
    }
    setLoading(false);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calculateER = (item: ContentItem) => {
    const interactions = (item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.saves || 0);
    const reach = (item.impressions || 0) + (item.views || 0);
    if (reach === 0) return 0;
    return ((interactions / reach) * 100);
  };

  // Get unique creators and platforms for filters
  const uniqueCreators = useMemo(() => {
    const creators = content
      .filter(item => item.creators)
      .map(item => ({ id: item.creators!.id, handle: item.creators!.handle }));
    return Array.from(new Map(creators.map(c => [c.id, c])).values());
  }, [content]);

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(content.map(item => item.platform)));
  }, [content]);

  // Filter content
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      // Date filter
      if (dateRange?.from && item.published_date) {
        const pubDate = new Date(item.published_date);
        if (pubDate < dateRange.from) return false;
        if (dateRange.to && pubDate > dateRange.to) return false;
      }
      
      // Creator filter
      if (selectedCreator !== "all" && item.creators?.id !== selectedCreator) {
        return false;
      }
      
      // Platform filter
      if (selectedPlatform !== "all" && item.platform !== selectedPlatform) {
        return false;
      }
      
      return true;
    });
  }, [content, dateRange, selectedCreator, selectedPlatform]);

  // Calculate ER percentiles for coloring
  const { p10, p90 } = useMemo(() => {
    const erValues = filteredContent.map(item => calculateER(item)).sort((a, b) => a - b);
    if (erValues.length === 0) return { p10: 0, p90: 0 };
    const p10Index = Math.floor(erValues.length * 0.1);
    const p90Index = Math.floor(erValues.length * 0.9);
    return {
      p10: erValues[p10Index] || 0,
      p90: erValues[p90Index] || erValues[erValues.length - 1]
    };
  }, [filteredContent]);

  const getERColor = (er: number) => {
    if (er >= p90) return "bg-accent-green text-accent-green-foreground";
    if (er <= p10) return "bg-accent-orange text-accent-orange-foreground";
    return "bg-accent-blue text-white";
  };

  const hasActiveFilters = dateRange || selectedCreator !== "all" || selectedPlatform !== "all";

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedCreator("all");
    setSelectedPlatform("all");
  };

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <p className="text-muted-foreground">Loading content...</p>
      </Card>
    );
  }

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Content Performance</h2>
        <p className="text-muted-foreground">
          Post previews and performance metrics across all platforms
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Creator Filter */}
        <Select value={selectedCreator} onValueChange={setSelectedCreator}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All creators" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All creators</SelectItem>
            {uniqueCreators.map((creator) => (
              <SelectItem key={creator.id} value={creator.id}>
                {creator.handle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform Filter */}
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {uniquePlatforms.map((platform) => (
              <SelectItem key={platform} value={platform} className="capitalize">
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {filteredContent.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {content.length === 0 
            ? "No content yet. Add content in the Data tab."
            : "No content matches your filters."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredContent.map((item) => {
            const er = calculateER(item);
            return (
              <Card 
                key={item.id} 
                className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[9/16] bg-muted">
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={`${item.platform} ${item.content_type}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-card text-card-foreground border border-foreground capitalize text-[10px] px-1.5 py-0.5">
                      {item.platform}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-xs truncate">{item.creators?.handle || "Unknown"}</span>
                    <Badge className={cn("text-[10px] px-1.5 py-0.5", getERColor(er))}>
                      {er.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{formatNumber(item.views || item.impressions)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      <span>{formatNumber(item.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="w-3 h-3" />
                      <span>{formatNumber(item.comments)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Share2 className="w-3 h-3" />
                      <span>{formatNumber(item.shares)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
};
