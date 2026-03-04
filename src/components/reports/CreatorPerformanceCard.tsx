import { Card } from "@/components/ui/card";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { TopicBadge } from "./TopicBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TranslatedText } from "@/components/ui/TranslatedText";

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

export interface CreatorPerformanceData {
  handle: string;
  avatar_url: string | null;
  platforms: string[];
  top_content: TopContent | null;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  relevance: number | "high" | "medium" | "low";
  key_insight?: string;
  positive_topics: string[];
  negative_topics?: string[];
  success_analysis?: string;
  top_comments?: string[];
}

interface CreatorPerformanceCardProps {
  creator: CreatorPerformanceData;
  canEdit?: boolean;
  variant?: 'default' | 'flat';
  brandName?: string;
  onSaveSuccessAnalysis?: (handle: string, contentId: string, analysis: string) => void;
  onSaveTopics?: (handle: string, positiveTopics: string[]) => void;
  onSaveContentSummary?: (handle: string, summary: string) => void;
}

const getRelevanceColor = (relevance: number) => {
  if (relevance >= 70) return "text-accent-green";
  if (relevance >= 40) return "text-accent-orange";
  return "text-muted-foreground";
};

const getRelevanceAsNumber = (rel: string | number | undefined): number => {
  if (typeof rel === "number") return rel;
  switch (rel) {
    case "high": return 85;
    case "medium": return 55;
    case "low": return 25;
    default: return 50;
  }
};

export const CreatorPerformanceCard = ({
  creator,
  canEdit = false,
  variant = 'default',
  brandName,
  onSaveSuccessAnalysis,
  onSaveTopics,
  onSaveContentSummary,
}: CreatorPerformanceCardProps) => {
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(creator.success_analysis || '');
  
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [editedTopics, setEditedTopics] = useState(creator.positive_topics.join(', '));
  
  const [isEditingContentSummary, setIsEditingContentSummary] = useState(false);
  const [editedContentSummary, setEditedContentSummary] = useState(creator.top_content?.content_summary || '');

  const relevanceNum = getRelevanceAsNumber(creator.relevance);

  const content = (
    <>
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
          {(creator.platforms || []).map((platform) => (
            <span
              key={platform}
              className={cn(
                "text-xs capitalize px-2 py-1 rounded-full",
                platform.toLowerCase() === "instagram" 
                  ? "bg-accent-purple text-accent-purple-foreground" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {platform}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Content Preview */}
        <div className="space-y-4">
          {creator.top_content && (
            <div className="w-[180px] flex-shrink-0">
              <ContentPreviewCard
                thumbnailUrl={creator.top_content.thumbnail_url}
                contentType={creator.top_content.content_type}
                platform={creator.top_content.platform}
                views={creator.top_content.views}
                engagementRate={creator.top_content.engagement_rate}
                url={creator.top_content.url}
              />
            </div>
          )}
        </div>

        {/* Middle: Success Analysis (2-3 paragraphs) */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Analýza výstupu:
              </span>
              {canEdit && !isEditingAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingAnalysis(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingAnalysis ? (
              <div className="space-y-2">
                <Textarea
                  value={editedAnalysis}
                  onChange={(e) => setEditedAnalysis(e.target.value)}
                  className="min-h-[120px] rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    onSaveSuccessAnalysis?.(creator.handle, creator.top_content?.id || '', editedAnalysis);
                    setIsEditingAnalysis(false);
                  }} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditedAnalysis(creator.success_analysis || '');
                    setIsEditingAnalysis(false);
                  }} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed max-h-[300px] overflow-y-auto space-y-3">
                {creator.success_analysis ? (
                  creator.success_analysis.split(/\n\n+/).map((paragraph, i) => (
                    <p key={i}><TranslatedText text={paragraph} /></p>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No analysis available</p>
                )}
              </div>
            )}
          </div>

          {/* Sentiment Breakdown */}
          {creator.sentiment_breakdown && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                Sentiment Breakdown:
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent-green font-medium">
                  {creator.sentiment_breakdown.positive ?? 0}% Positive
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground font-medium">
                  {creator.sentiment_breakdown.neutral ?? 0}% Neutral
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-accent-orange font-medium">
                  {creator.sentiment_breakdown.negative ?? 0}% Negative
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Top Comments, Positive Topics & Relevance */}
        <div className="space-y-4">
          {/* Top Comments */}
          {creator.top_comments && creator.top_comments.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                Nejčastější komentáře:
              </span>
              <ul className="space-y-1.5">
                {creator.top_comments.map((comment, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                    <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <TranslatedText text={comment} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Positive Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Positive Topics:
              </span>
              {canEdit && !isEditingTopics && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTopics(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingTopics ? (
              <div className="space-y-2">
                <Textarea
                  value={editedTopics}
                  onChange={(e) => setEditedTopics(e.target.value)}
                  placeholder="Topic 1, Topic 2..."
                  className="min-h-[60px] rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    const topics = editedTopics.split(',').map(t => t.trim()).filter(t => t);
                    onSaveTopics?.(creator.handle, topics);
                    setIsEditingTopics(false);
                  }} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditedTopics(creator.positive_topics.join(', '));
                    setIsEditingTopics(false);
                  }} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {creator.positive_topics.length > 0 ? (
                  creator.positive_topics.map((topic, i) => (
                    <TopicBadge key={i} topic={topic} variant="positive" />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">No positive topics</span>
                )}
              </div>
            )}
          </div>

          {/* Relevance */}
          <div>
            <span className="text-sm text-muted-foreground">Relevance: </span>
            <span className={`font-bold ${getRelevanceColor(relevanceNum)}`}>
              {relevanceNum}%
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (variant === 'flat') {
    return <div className="pdf-no-break">{content}</div>;
  }

  return (
    <Card className="p-6 rounded-[20px] border-foreground">
      {content}
    </Card>
  );
};
