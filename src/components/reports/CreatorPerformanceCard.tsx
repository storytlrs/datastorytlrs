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
  // New: array of top contents (1 or 2 depending on campaign size)
  top_contents?: TopContent[];
  // Legacy single top_content (backwards compat)
  top_content?: TopContent | null;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  relevance: number;
  paragraph1?: string;
  paragraph2?: string;
  paragraph3?: string;
  positive_topics: string[];
  top_comments?: string[];
  // Legacy fields (kept for backwards compat)
  key_insight?: string;
  negative_topics?: string[];
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

export const CreatorPerformanceCard = ({
  creator,
  canEdit = false,
  variant = 'default',
  brandName,
  onSaveKeyInsight,
  onSaveTopics,
  onSaveContentSummary,
}: CreatorPerformanceCardProps) => {
  // Normalise: prefer top_contents array, fall back to legacy top_content
  const topContents: TopContent[] = creator.top_contents && creator.top_contents.length > 0
    ? creator.top_contents
    : creator.top_content
      ? [creator.top_content]
      : [];

  const [isEditingParagraph1, setIsEditingParagraph1] = useState(false);
  const [isEditingParagraph2, setIsEditingParagraph2] = useState(false);
  const [isEditingParagraph3, setIsEditingParagraph3] = useState(false);
  const [editedParagraph1, setEditedParagraph1] = useState(creator.paragraph1 || creator.key_insight || '');
  const [editedParagraph2, setEditedParagraph2] = useState(creator.paragraph2 || '');
  const [editedParagraph3, setEditedParagraph3] = useState(creator.paragraph3 || '');

  const [isEditingPositiveTopics, setIsEditingPositiveTopics] = useState(false);
  const [editedPositiveTopics, setEditedPositiveTopics] = useState((creator.positive_topics || []).join(', '));

  const [isEditingTopComments, setIsEditingTopComments] = useState(false);
  const [editedTopComments, setEditedTopComments] = useState((creator.top_comments || []).join('\n'));

  const handleSaveParagraph = (idx: 1 | 2 | 3, value: string) => {
    if (onSaveKeyInsight) {
      // Reuse the key_insight callback to save structured paragraphs as JSON
      const paragraphs = {
        paragraph1: idx === 1 ? value : (creator.paragraph1 || ''),
        paragraph2: idx === 2 ? value : (creator.paragraph2 || ''),
        paragraph3: idx === 3 ? value : (creator.paragraph3 || ''),
      };
      onSaveKeyInsight(creator.handle, JSON.stringify(paragraphs));
    }
    if (idx === 1) { setEditedParagraph1(value); setIsEditingParagraph1(false); }
    if (idx === 2) { setEditedParagraph2(value); setIsEditingParagraph2(false); }
    if (idx === 3) { setEditedParagraph3(value); setIsEditingParagraph3(false); }
  };

  const handleSavePositiveTopics = () => {
    const topics = editedPositiveTopics.split(',').map(t => t.trim()).filter(t => t);
    onSaveTopics?.(creator.handle, topics, []);
    setIsEditingPositiveTopics(false);
  };

  const EditableParagraph = ({
    label,
    value,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    edited,
    setEdited,
  }: {
    label: string;
    value: string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (v: string) => void;
    onCancel: () => void;
    edited: string;
    setEdited: (v: string) => void;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0">
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
            className="min-h-[80px] rounded-[15px] border-foreground text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(edited)} className="rounded-[35px]">
              <Save className="w-3 h-3 mr-1" />Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} className="rounded-[35px] border-foreground">
              <X className="w-3 h-3 mr-1" />Cancel
            </Button>
          </div>
        </div>
      ) : value ? (
        <p className="text-sm leading-relaxed"><TranslatedText text={value} /></p>
      ) : (
        <p className="text-sm text-muted-foreground italic">–</p>
      )}
    </div>
  );

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

      {/* Top content cards */}
      {topContents.length > 0 && (
        <div className={cn("flex gap-4 mb-6", topContents.length === 1 ? "" : "")}>
          {topContents.map((tc, i) => (
            <div key={tc.id || i} className="w-[180px] flex-shrink-0">
              <ContentPreviewCard
                thumbnailUrl={tc.thumbnail_url}
                contentType={tc.content_type}
                platform={tc.platform}
                views={tc.views}
                engagementRate={tc.engagement_rate}
                url={tc.url}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Analysis paragraphs */}
        <div className="space-y-4">
          <EditableParagraph
            label="Nejúspěšnější metrika"
            value={editedParagraph1}
            isEditing={isEditingParagraph1}
            onEdit={() => setIsEditingParagraph1(true)}
            onSave={(v) => handleSaveParagraph(1, v)}
            onCancel={() => { setEditedParagraph1(creator.paragraph1 || ''); setIsEditingParagraph1(false); }}
            edited={editedParagraph1}
            setEdited={setEditedParagraph1}
          />

          <EditableParagraph
            label="Komentáře"
            value={editedParagraph2}
            isEditing={isEditingParagraph2}
            onEdit={() => setIsEditingParagraph2(true)}
            onSave={(v) => handleSaveParagraph(2, v)}
            onCancel={() => { setEditedParagraph2(creator.paragraph2 || ''); setIsEditingParagraph2(false); }}
            edited={editedParagraph2}
            setEdited={setEditedParagraph2}
          />

          {(editedParagraph3 || canEdit) && (
            <EditableParagraph
              label="Další highlight"
              value={editedParagraph3}
              isEditing={isEditingParagraph3}
              onEdit={() => setIsEditingParagraph3(true)}
              onSave={(v) => handleSaveParagraph(3, v)}
              onCancel={() => { setEditedParagraph3(creator.paragraph3 || ''); setIsEditingParagraph3(false); }}
              edited={editedParagraph3}
              setEdited={setEditedParagraph3}
            />
          )}
        </div>

        {/* Right: Comments + Topics + Sentiment + Relevance */}
        <div className="space-y-4">
          {/* Top Comments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nejčastější komentáře
              </span>
              {canEdit && !isEditingTopComments && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTopComments(true)} className="h-6 w-6 p-0">
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingTopComments ? (
              <div className="space-y-2">
                <Textarea
                  value={editedTopComments}
                  onChange={(e) => setEditedTopComments(e.target.value)}
                  placeholder="Každý komentář na nový řádek..."
                  className="min-h-[100px] rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    const comments = editedTopComments.split('\n').map(c => c.trim()).filter(c => c);
                    onSaveTopics?.(creator.handle, creator.positive_topics, comments as any);
                    setIsEditingTopComments(false);
                  }} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditedTopComments((creator.top_comments || []).join('\n')); setIsEditingTopComments(false); }} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />Cancel
                  </Button>
                </div>
              </div>
            ) : (creator.top_comments || []).length > 0 ? (
              <ul className="space-y-1">
                {(creator.top_comments || []).slice(0, 5).map((comment, i) => (
                  <li key={i} className="text-sm flex items-start gap-1">
                    <span className="text-muted-foreground">„</span>
                    <span>{comment}</span>
                    <span className="text-muted-foreground">"</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Žádné komentáře</p>
            )}
          </div>

          {/* Positive Topics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pozitivní témata
              </span>
              {canEdit && !isEditingPositiveTopics && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingPositiveTopics(true)} className="h-6 w-6 p-0">
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingPositiveTopics ? (
              <div className="space-y-2">
                <Input
                  value={editedPositiveTopics}
                  onChange={(e) => setEditedPositiveTopics(e.target.value)}
                  placeholder="Téma 1, Téma 2, Téma 3..."
                  className="rounded-[15px] border-foreground text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePositiveTopics} className="rounded-[35px]">
                    <Save className="w-3 h-3 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditedPositiveTopics((creator.positive_topics || []).join(', ')); setIsEditingPositiveTopics(false); }} className="rounded-[35px] border-foreground">
                    <X className="w-3 h-3 mr-1" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(creator.positive_topics || []).length > 0 ? (
                  creator.positive_topics.map((topic, i) => (
                    <TopicBadge key={i} topic={topic} variant="positive" />
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground italic">–</span>
                )}
              </div>
            )}
          </div>

          {/* Sentiment Breakdown */}
          {creator.sentiment_breakdown && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Sentiment
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent-green font-medium">
                  {creator.sentiment_breakdown.positive ?? 0}% Pozitivní
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground font-medium">
                  {creator.sentiment_breakdown.neutral ?? 0}% Neutrální
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-accent-orange font-medium">
                  {creator.sentiment_breakdown.negative ?? 0}% Negativní
                </span>
              </div>
            </div>
          )}

          {/* Relevance */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Relevance: </span>
            <span className={`font-bold ${getRelevanceColor(creator.relevance)}`}>
              {creator.relevance}%
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
