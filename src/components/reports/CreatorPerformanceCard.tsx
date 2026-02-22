import { Card } from "@/components/ui/card";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { TopicBadge } from "./TopicBadge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
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
  relevance: number; // 0-100 percentage
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

interface CreatorPerformanceCardProps {
  creator: CreatorPerformanceData;
  canEdit?: boolean;
  variant?: 'default' | 'flat';
  brandName?: string;
  onSaveKeyInsight?: (handle: string, insight: string) => void;
  onSaveTopics?: (handle: string, positiveTopics: string[], negativeTopics: string[]) => void;
  onSaveContentSummary?: (handle: string, summary: string) => void;
}

const getRelevanceColor = (relevance: number) => {
  if (relevance >= 70) return "text-accent-green";
  if (relevance >= 40) return "text-accent-orange";
  return "text-muted-foreground";
};

const getRelevanceExplanation = (
  creator: CreatorPerformanceData,
  brandName?: string
): string => {
  const { relevance, positive_topics, negative_topics, top_content } = creator;
  const brand = brandName || "značce";

  const hasPositive = positive_topics.length > 0;
  const hasNegative = negative_topics.length > 0;
  const hasContentContext = !!top_content?.content_summary;

  if (relevance >= 70) {
    const topicsPart = hasPositive
      ? ` Obsah přirozeně rezonuje s tématy jako ${positive_topics.slice(0, 3).join(", ")}, což je v souladu s komunikací ${brand}.`
      : "";
    const contentPart = hasContentContext
      ? ` Shrnutí obsahu ukazuje na silnou tematickou blízkost ke značce.`
      : "";
    const negativePart = hasNegative
      ? ` Drobná rizika se objevují u témat: ${negative_topics.slice(0, 2).join(", ")}.`
      : "";
    return `Vysoká relevance značí, že tvůrce komunikuje témata blízká ${brand} a jeho obsah organicky zapadá do brandové komunikace.${topicsPart}${contentPart}${negativePart}`;
  }

  if (relevance >= 40) {
    const topicsPart = hasPositive
      ? ` Některá témata (${positive_topics.slice(0, 2).join(", ")}) jsou relevantní, ale nejsou dominantní v obsahu tvůrce.`
      : " Tematický překryv s brandem je omezený.";
    const negativePart = hasNegative
      ? ` Negativně vnímané oblasti (${negative_topics.slice(0, 2).join(", ")}) mohou snižovat celkový fit.`
      : "";
    return `Střední relevance naznačuje částečný překryv mezi obsahem tvůrce a komunikací ${brand}.${topicsPart}${negativePart}`;
  }

  const reason = hasNegative
    ? ` Převažují témata, která nejsou v souladu se značkou (${negative_topics.slice(0, 2).join(", ")}).`
    : " Obsah tvůrce se tematicky míjí s hodnotami a komunikací značky.";
  return `Nízká relevance ukazuje na malou shodu mezi obsahem tvůrce a brandem ${brand}.${reason}`;
};

export const CreatorPerformanceCard = ({
  creator,
  canEdit = false,
  variant = 'default',
  brandName,
  onSaveKeyInsight,
  onSaveTopics,
  onSaveContentSummary,
}: CreatorPerformanceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInsight, setEditedInsight] = useState(creator.key_insight);
  
  // Topics editing state
  const [isEditingPositiveTopics, setIsEditingPositiveTopics] = useState(false);
  const [isEditingNegativeTopics, setIsEditingNegativeTopics] = useState(false);
  const [editedPositiveTopics, setEditedPositiveTopics] = useState(creator.positive_topics.join(', '));
  const [editedNegativeTopics, setEditedNegativeTopics] = useState(creator.negative_topics.join(', '));
  
  // Content summary editing state
  const [isEditingContentSummary, setIsEditingContentSummary] = useState(false);
  const [editedContentSummary, setEditedContentSummary] = useState(creator.top_content?.content_summary || '');

  const handleSave = () => {
    onSaveKeyInsight?.(creator.handle, editedInsight);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedInsight(creator.key_insight);
    setIsEditing(false);
  };

  const handleSavePositiveTopics = () => {
    const topics = editedPositiveTopics.split(',').map(t => t.trim()).filter(t => t);
    onSaveTopics?.(creator.handle, topics, creator.negative_topics);
    setIsEditingPositiveTopics(false);
  };

  const handleCancelPositiveTopics = () => {
    setEditedPositiveTopics(creator.positive_topics.join(', '));
    setIsEditingPositiveTopics(false);
  };

  const handleSaveNegativeTopics = () => {
    const topics = editedNegativeTopics.split(',').map(t => t.trim()).filter(t => t);
    onSaveTopics?.(creator.handle, creator.positive_topics, topics);
    setIsEditingNegativeTopics(false);
  };

  const handleCancelNegativeTopics = () => {
    setEditedNegativeTopics(creator.negative_topics.join(', '));
    setIsEditingNegativeTopics(false);
  };

  const handleSaveContentSummary = () => {
    onSaveContentSummary?.(creator.handle, editedContentSummary);
    setIsEditingContentSummary(false);
  };

  const handleCancelContentSummary = () => {
    setEditedContentSummary(creator.top_content?.content_summary || '');
    setIsEditingContentSummary(false);
  };

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
        {/* Left: Content Preview only */}
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

        {/* Middle: Content Summary + Sentiment Breakdown */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Content Summary:
              </span>
              {canEdit && !isEditingContentSummary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingContentSummary(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingContentSummary ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContentSummary}
                  onChange={(e) => setEditedContentSummary(e.target.value)}
                  className="min-h-[80px] rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveContentSummary} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelContentSummary} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed max-h-[300px] overflow-y-auto">
                {creator.top_content?.content_summary ? <TranslatedText text={creator.top_content.content_summary} /> : <span className="text-muted-foreground italic">No content summary</span>}
              </p>
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

        {/* Right: Key Insight & Topics & Relevance */}
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
              <p className="text-sm">{creator.key_insight ? <TranslatedText text={creator.key_insight} /> : "No insight available"}</p>
            )}
          </div>

          {/* Positive Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Positive Topics:
              </span>
              {canEdit && !isEditingPositiveTopics && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingPositiveTopics(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingPositiveTopics ? (
              <div className="space-y-2">
                <Input
                  value={editedPositiveTopics}
                  onChange={(e) => setEditedPositiveTopics(e.target.value)}
                  placeholder="Topic 1, Topic 2, Topic 3..."
                  className="rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePositiveTopics} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelPositiveTopics} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
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

          {/* Negative Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Negative Topics:
              </span>
              {canEdit && !isEditingNegativeTopics && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingNegativeTopics(true)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingNegativeTopics ? (
              <div className="space-y-2">
                <Input
                  value={editedNegativeTopics}
                  onChange={(e) => setEditedNegativeTopics(e.target.value)}
                  placeholder="Topic 1, Topic 2, Topic 3..."
                  className="rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNegativeTopics} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelNegativeTopics} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {creator.negative_topics.length > 0 ? (
                  creator.negative_topics.map((topic, i) => (
                    <TopicBadge key={i} topic={topic} variant="negative" />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">No negative topics</span>
                )}
              </div>
            )}
          </div>

          {/* Relevance */}
          <div>
            <span className="text-sm text-muted-foreground">Relevance: </span>
            <span className={`font-bold ${getRelevanceColor(creator.relevance)}`}>
              {creator.relevance}%
            </span>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              <TranslatedText text={getRelevanceExplanation(creator, brandName)} />
            </p>
          </div>
        </div>
      </div>
    </>
  );

  // Flat variant - without Card wrapper (for PDF export)
  if (variant === 'flat') {
    return <div className="pdf-no-break">{content}</div>;
  }

  // Default variant - with Card wrapper
  return (
    <Card className="p-6 rounded-[20px] border-foreground">
      {content}
    </Card>
  );
};
