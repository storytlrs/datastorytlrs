import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageCircle, Share2, ImageIcon, X, ArrowUpDown, Loader2, RefreshCw } from "lucide-react";
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
  url: string | null;
  views: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  published_date: string | null;
  creator_id: string;
  creators: { id: string; handle: string } | null;
}

export const ContentTab = ({ reportId }: ContentTabProps) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [fetchedPreviews, setFetchedPreviews] = useState<Record<string, string | null>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Use refs to track loading state without causing re-renders
  const loadingPreviewsRef = useRef<Set<string>>(new Set());
  const fetchedPreviewsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchContent();
  }, [reportId]);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content")
      .select("id, platform, content_type, thumbnail_url, url, views, impressions, likes, comments, shares, saves, published_date, creator_id, creators(id, handle)")
      .eq("report_id", reportId)
      .order("published_date", { ascending: false });

    if (!error) {
      setContent(data || []);
    }
    setLoading(false);
  };

  // Fetch previews for content items that need them
  useEffect(() => {
    const itemsNeedingPreview = content.filter(item => 
      !item.thumbnail_url && 
      item.url && 
      !fetchedPreviewsRef.current.has(item.id) &&
      !loadingPreviewsRef.current.has(item.id)
    );

    itemsNeedingPreview.forEach(item => {
      fetchUrlPreview(item.id, item.url!);
    });
  }, [content]);

  const fetchUrlPreview = async (contentId: string, url: string) => {
    // Mark as loading using ref (no re-render)
    loadingPreviewsRef.current.add(contentId);
    
    // Trigger a minimal state update to show loading spinner
    setFetchedPreviews(prev => ({ ...prev }));

    try {
      const response = await supabase.functions.invoke('fetch-url-preview', {
        body: { url }
      });

      fetchedPreviewsRef.current.add(contentId);
      loadingPreviewsRef.current.delete(contentId);

      // Handle both successful and failed responses gracefully
      const data = response?.data;
      const thumbnailUrl = data?.success && data?.thumbnail_url ? data.thumbnail_url : null;
      
      if (thumbnailUrl) {
        setFetchedPreviews(prev => ({ ...prev, [contentId]: thumbnailUrl }));
        
        // Cache the thumbnail in the database (fire and forget, ignore errors)
        supabase
          .from("content")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("id", contentId)
          .then(() => {});
      } else {
        setFetchedPreviews(prev => ({ ...prev, [contentId]: null }));
      }
    } catch (err) {
      // Silently handle errors - just mark as failed
      console.log('Preview fetch failed for:', url);
      fetchedPreviewsRef.current.add(contentId);
      loadingPreviewsRef.current.delete(contentId);
      setFetchedPreviews(prev => ({ ...prev, [contentId]: null }));
    }
  };

  const retryPreview = (contentId: string, url: string) => {
    // Clear the failed state and re-fetch
    fetchedPreviewsRef.current.delete(contentId);
    setFetchedPreviews(prev => {
      const updated = { ...prev };
      delete updated[contentId];
      return updated;
    });
    fetchUrlPreview(contentId, url);
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

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filtered = content.filter(item => {
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

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "er":
          return calculateER(b) - calculateER(a);
        case "views":
          return ((b.views || 0) + (b.impressions || 0)) - ((a.views || 0) + (a.impressions || 0));
        case "likes":
          return (b.likes || 0) - (a.likes || 0);
        case "comments":
          return (b.comments || 0) - (a.comments || 0);
        case "shares":
          return (b.shares || 0) - (a.shares || 0);
        case "date":
        default:
          return new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime();
      }
    });
  }, [content, dateRange, selectedCreator, selectedPlatform, sortBy]);

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

  // Proxy Instagram CDN URLs through edge function to avoid CORS/referrer issues
  const getProxiedUrl = (url: string): string => {
    if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Get the preview image for a content item
  const getPreviewImage = (item: ContentItem): { src: string | null; isLoading: boolean; canRetry: boolean; isFailed: boolean } => {
    // Check if currently refreshing
    if (refreshingItems.has(item.id)) {
      return { src: null, isLoading: true, canRetry: false, isFailed: false };
    }

    // Check if we have a freshly fetched preview (takes priority - means user clicked refresh)
    if (fetchedPreviews[item.id]) {
      return { src: getProxiedUrl(fetchedPreviews[item.id]!), isLoading: false, canRetry: false, isFailed: false };
    }

    // Check if the stored thumbnail failed to load
    if (item.thumbnail_url && failedImages.has(item.id)) {
      return { src: null, isLoading: false, canRetry: !!item.url, isFailed: true };
    }

    // Use thumbnail from database
    if (item.thumbnail_url) {
      return { src: getProxiedUrl(item.thumbnail_url), isLoading: false, canRetry: false, isFailed: false };
    }

    // Check if currently loading
    if (loadingPreviewsRef.current.has(item.id)) {
      return { src: null, isLoading: true, canRetry: false, isFailed: false };
    }

    // No image available - but has URL, so can retry
    return { src: null, isLoading: false, canRetry: !!item.url, isFailed: false };
  };

  const handleImageError = (contentId: string) => {
    setFailedImages(prev => new Set(prev).add(contentId));
  };

  const [refreshingItems, setRefreshingItems] = useState<Set<string>>(new Set());

  const refreshThumbnail = async (item: ContentItem) => {
    if (!item.url) return;
    
    // Mark as refreshing
    setRefreshingItems(prev => new Set(prev).add(item.id));
    
    // Remove from failed set
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
    
    try {
      // Force fetch new preview from edge function
      console.log('Fetching preview for:', item.url);
      const response = await supabase.functions.invoke('fetch-url-preview', {
        body: { url: item.url }
      });

      console.log('Edge function response:', response);
      const data = response?.data;
      const thumbnailUrl = data?.success && data?.thumbnail_url ? data.thumbnail_url : null;
      console.log('Thumbnail URL:', thumbnailUrl);
      
      if (thumbnailUrl) {
        // Update the database with new URL
        const updateResult = await supabase
          .from("content")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("id", item.id);
        
        console.log('Database update result:', updateResult);
        
        // Update local state directly with new URL
        setContent(prev => prev.map(c => 
          c.id === item.id ? { ...c, thumbnail_url: thumbnailUrl } : c
        ));
        
        // Also store in fetchedPreviews as backup
        setFetchedPreviews(prev => ({ ...prev, [item.id]: thumbnailUrl }));
      } else {
        console.log('No thumbnail URL received');
        // Mark as failed
        setFailedImages(prev => new Set(prev).add(item.id));
      }
    } catch (err) {
      console.error('Refresh failed for:', item.url, err);
      setFailedImages(prev => new Set(prev).add(item.id));
    } finally {
      setRefreshingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
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
                "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                dateRange
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
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
          <SelectTrigger className={cn(
            "w-[180px] rounded-[35px]",
            selectedCreator !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
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
          <SelectTrigger className={cn(
            "w-[180px] rounded-[35px]",
            selectedPlatform !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
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

        {/* Sort By */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className={cn(
            "w-[180px] rounded-[35px]",
            sortBy !== "date"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (newest)</SelectItem>
            <SelectItem value="er">Engagement Rate</SelectItem>
            <SelectItem value="views">Views/Impressions</SelectItem>
            <SelectItem value="likes">Likes</SelectItem>
            <SelectItem value="comments">Comments</SelectItem>
            <SelectItem value="shares">Shares</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-[35px]">
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
            const preview = getPreviewImage(item);
            
            return (
              <Card 
                key={item.id} 
                className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[9/12.8] bg-muted">
                  {preview.isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                  ) : preview.src ? (
                    <img
                      src={preview.src}
                      alt={`${item.platform} ${item.content_type}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      {item.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={() => refreshThumbnail(item)}
                          disabled={refreshingItems.has(item.id)}
                        >
                          {refreshingItems.has(item.id) ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          Obnovit
                        </Button>
                      )}
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
