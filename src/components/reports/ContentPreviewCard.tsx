import { Card } from "@/components/ui/card";
import { ExternalLink, Play } from "lucide-react";
import { StatusBadge, StatusType } from "./StatusBadge";
import { cn } from "@/lib/utils";

interface ContentPreviewCardProps {
  thumbnailUrl?: string | null;
  contentType: string;
  platform: string;
  views: number;
  engagementRate: number;
  url?: string | null;
  contentSummary?: string | null;
  sentiment?: string | null;
  sentimentSummary?: string | null;
  creatorHandle?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatPercent = (num: number): string => {
  return num.toFixed(2) + "%";
};

const getSentimentColor = (sentiment: string | null | undefined): string => {
  switch (sentiment) {
    case "positive":
      return "text-accent-green";
    case "negative":
      return "text-accent-orange";
    default:
      return "text-muted-foreground";
  }
};

const getSentimentLabel = (sentiment: string | null | undefined): string => {
  switch (sentiment) {
    case "positive":
      return "Pozitivní";
    case "negative":
      return "Negativní";
    default:
      return "Neutrální";
  }
};

export const ContentPreviewCard = ({
  thumbnailUrl,
  contentType,
  platform,
  views,
  engagementRate,
  url,
  contentSummary,
  sentiment,
  sentimentSummary,
  creatorHandle,
}: ContentPreviewCardProps) => {
  return (
    <Card className="rounded-[20px] border-foreground overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-muted overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Content thumbnail"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Platform & Type badge */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={cn(
            "px-2 py-1 backdrop-blur-sm rounded-full text-xs font-medium capitalize",
            platform.toLowerCase() === "instagram"
              ? "bg-accent-purple text-accent-purple-foreground"
              : "bg-background/80"
          )}>
            {platform}
          </span>
          <span className="px-2 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium capitalize">
            {contentType}
          </span>
        </div>
        {/* Creator handle */}
        {creatorHandle && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 bg-foreground/80 text-background backdrop-blur-sm rounded-full text-xs font-medium">
              @{creatorHandle}
            </span>
          </div>
        )}
      </div>

      {/* Content info */}
      <div className="p-4 space-y-3">
        {/* Metrics */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">Views</span>
            <p className="font-bold">{formatNumber(views)}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">ER</span>
            <p className="font-bold">{formatPercent(engagementRate)}</p>
          </div>
        </div>

        {/* Content Summary */}
        {contentSummary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contentSummary}
          </p>
        )}

        {/* Sentiment */}
        {sentiment && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sentiment:</span>
              <span className={`text-xs font-medium ${getSentimentColor(sentiment)}`}>
                {getSentimentLabel(sentiment)}
              </span>
            </div>
            {sentimentSummary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {sentimentSummary}
              </p>
            )}
          </div>
        )}

        {/* Link */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-cyan hover:text-accent-purple transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Zobrazit obsah
          </a>
        )}
      </div>
    </Card>
  );
};
