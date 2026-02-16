import { Card } from "@/components/ui/card";
import { ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopContentItem {
  id: string;
  thumbnailUrl: string | null;
  previewIframeUrl?: string | null;
  contentType: string;
  platform: string;
  views: number;
  engagementRate: number;
  url: string | null;
  creatorHandle?: string;
  score: number;
}

interface TopContentGridProps {
  items: TopContentItem[];
  title?: string;
  emptyMessage?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatPercent = (num: number): string => {
  return num.toFixed(2) + "%";
};

const getPlatformStyle = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "instagram":
      return "bg-accent-purple text-accent-purple-foreground";
    case "tiktok":
      return "bg-foreground text-background";
    case "youtube":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-background/80 text-foreground";
  }
};

export const TopContentGrid = ({ items, title = "Top 5 Content", emptyMessage = "No content available" }: TopContentGridProps) => {
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground border border-dashed border-border rounded-[35px]">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.slice(0, 5).map((item, index) => (
          <Card key={item.id} className="rounded-[20px] border-foreground overflow-hidden hover:shadow-lg transition-shadow relative">
            {/* Rank badge */}
            <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-accent-green text-accent-green-foreground flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>

            {/* Thumbnail or Preview */}
            <div className="relative aspect-[9/16] bg-muted overflow-hidden">
              {item.previewIframeUrl ? (
                <img
                  src={item.previewIframeUrl}
                  alt="Ad preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.querySelector(".fallback-icon")?.classList.remove("hidden");
                  }}
                />
              ) : item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt="Content thumbnail"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.querySelector(".fallback-icon")?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={cn("fallback-icon w-full h-full flex items-center justify-center absolute inset-0", (item.previewIframeUrl || item.thumbnailUrl) ? "hidden" : "")}>
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
              
              {/* Platform & Type badge */}
              <div className="absolute top-2 left-2 flex gap-1">
                <span className={cn(
                  "px-2 py-0.5 backdrop-blur-sm rounded-full text-[10px] font-medium capitalize",
                  getPlatformStyle(item.platform)
                )}>
                  {item.platform}
                </span>
              </div>

              {/* Creator handle */}
              {item.creatorHandle && (
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-0.5 bg-foreground/80 text-background backdrop-blur-sm rounded-full text-[10px] font-medium">
                    @{item.creatorHandle}
                  </span>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="p-3 space-y-2">
              {/* Metrics */}
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Views</span>
                  <p className="font-bold">{formatNumber(item.views)}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">ER</span>
                  <p className="font-bold">{formatPercent(item.engagementRate)}</p>
                </div>
              </div>

              {/* Link */}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-accent-cyan hover:text-accent-purple transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
