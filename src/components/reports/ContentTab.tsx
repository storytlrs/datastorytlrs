import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, MessageCircle, Share2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  creators: { handle: string } | null;
}

export const ContentTab = ({ reportId }: ContentTabProps) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, [reportId]);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content")
      .select("id, platform, content_type, thumbnail_url, views, impressions, likes, comments, shares, saves, creators(handle)")
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

  const getERColor = (er: number) => {
    if (er > 6) return "bg-accent-green text-accent-green-foreground";
    if (er > 4) return "bg-accent text-accent-foreground";
    return "bg-accent-orange text-accent-orange-foreground";
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

      {content.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No content yet. Add content in the Data tab.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => {
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
                      <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-card text-card-foreground border border-foreground capitalize">
                      {item.platform}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.creators?.handle || "Unknown"}</span>
                    <Badge className={getERColor(er)}>
                      {er.toFixed(1)}% ER
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(item.views || item.impressions)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Heart className="w-4 h-4" />
                      <span>{formatNumber(item.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      <span>{formatNumber(item.comments)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Share2 className="w-4 h-4" />
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
