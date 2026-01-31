import { Card } from "@/components/ui/card";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { TopicBadge } from "./TopicBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";

interface TopContent {
  id: string;
  thumbnail_url: string | null;
  content_type: string;
  platform: string;
  views: number;
  engagement_rate: number;
  url: string | null;
  content_summary: string | null;
  creator_handle: string;
}

interface CreatorPerformanceData {
  handle: string;
  avatar_url: string | null;
  platforms: string[];
  top_content: TopContent | null;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  relevance: "high" | "medium" | "low";
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

interface CreatorPerformanceCardProps {
  creator: CreatorPerformanceData;
  canEdit?: boolean;
  onSaveKeyInsight?: (handle: string, insight: string) => void;
}

const getRelevanceColor = (relevance: "high" | "medium" | "low") => {
  switch (relevance) {
    case "high":
      return "text-accent-green";
    case "medium":
      return "text-accent-orange";
    case "low":
      return "text-muted-foreground";
  }
};

const getRelevanceLabel = (relevance: "high" | "medium" | "low") => {
  switch (relevance) {
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    case "low":
      return "LOW";
  }
};

export const CreatorPerformanceCard = ({
  creator,
  canEdit = false,
  onSaveKeyInsight,
}: CreatorPerformanceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInsight, setEditedInsight] = useState(creator.key_insight);

  const handleSave = () => {
    onSaveKeyInsight?.(creator.handle, editedInsight);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInsight(creator.key_insight);
    setIsEditing(false);
  };

  return (
    <Card className="p-6 rounded-[20px] border-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.handle}
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
              {creator.handle.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold">@{creator.handle}</h3>
          </div>
        </div>
        <div className="flex gap-1">
          {creator.platforms.map((platform) => (
            <span
              key={platform}
              className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded-full"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Top Post & Sentiment Breakdown */}
        <div className="space-y-4">
          {creator.top_content && (
            <div className="max-w-[200px]">
              <ContentPreviewCard
                thumbnailUrl={creator.top_content.thumbnail_url}
                contentType={creator.top_content.content_type}
                platform={creator.top_content.platform}
                views={creator.top_content.views}
                engagementRate={creator.top_content.engagement_rate}
                url={creator.top_content.url}
                contentSummary={creator.top_content.content_summary}
              />
            </div>
          )}

          {/* Sentiment Breakdown */}
          <div>
            <span className="text-sm font-medium text-muted-foreground mb-2 block">
              Sentiment Breakdown:
            </span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-accent-green font-medium">
                {creator.sentiment_breakdown.positive}% Positive
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground font-medium">
                {creator.sentiment_breakdown.neutral}% Neutral
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-accent-orange font-medium">
                {creator.sentiment_breakdown.negative}% Negative
              </span>
            </div>
          </div>

          {/* Relevance */}
          <div>
            <span className="text-sm text-muted-foreground">Relevance: </span>
            <span className={`font-bold ${getRelevanceColor(creator.relevance)}`}>
              {getRelevanceLabel(creator.relevance)}
            </span>
          </div>
        </div>

        {/* Right: Key Insight & Topics */}
        <div className="space-y-4">
          {/* Key Insight */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Key Insight:</span>
              {canEdit && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedInsight}
                  onChange={(e) => setEditedInsight(e.target.value)}
                  className="min-h-[80px] rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{creator.key_insight || "No insight available"}</p>
            )}
          </div>

          {/* Positive Topics */}
          {creator.positive_topics.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground block mb-2">
                Positive Topics:
              </span>
              <div className="flex flex-wrap gap-2">
                {creator.positive_topics.map((topic, i) => (
                  <TopicBadge key={i} topic={topic} variant="positive" />
                ))}
              </div>
            </div>
          )}

          {/* Negative Topics */}
          {creator.negative_topics.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground block mb-2">
                Negative Topics:
              </span>
              <div className="flex flex-wrap gap-2">
                {creator.negative_topics.map((topic, i) => (
                  <TopicBadge key={i} topic={topic} variant="negative" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
