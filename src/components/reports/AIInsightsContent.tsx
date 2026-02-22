import { useState, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TranslatedText } from "@/components/ui/TranslatedText";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/translations";
import { MetricTile } from "./MetricTile";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { LeaderboardTable, LeaderboardEntry, Benchmarks } from "./LeaderboardTable";
import { CreatorPerformanceCard } from "./CreatorPerformanceCard";
import { TopicBadge } from "./TopicBadge";
import { ContentSelectorDialog, SelectedContentItem } from "./ContentSelectorDialog";
import { Users, FileText, Eye, DollarSign, Clock, Heart, TrendingUp, MessageSquare, Target, Rocket, Star, Pencil, Save, X, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

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
  relevance: number | "high" | "medium" | "low"; // Support both old string and new number format
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

// Helper function to convert old relevance values to percentage
const getRelevanceAsNumber = (rel: string | number | undefined): number => {
  if (typeof rel === "number") return rel;
  switch (rel) {
    case "high": return 85;
    case "medium": return 55;
    case "low": return 25;
    default: return 50;
  }
};

interface KPITargets {
  overview: {
    creators: number;
    content: number;
    views: number;
    avgCpm: number;
  };
  innovation: {
    tswbCost: number;
    interactions: number;
    engagementRate: number;
    viralityRate: number;
  };
}

interface StructuredInsights {
  executive_summary: string;
  campaign_context: {
    mainGoal: string;
    actions: string;
    highlights: string;
  };
  top_content: TopContent[];
  selected_top_content_ids?: string[];
  overview_metrics: {
    creators: number;
    content: number;
    views: number;
    avgCpm: number;
    currency: string;
  };
  innovation_metrics: {
    tswbCost: number;
    interactions: number;
    engagementRate: number;
    viralityRate: number;
    tswb: number;
    currency: string;
  };
  kpi_targets?: KPITargets;
  sentiment_analysis: {
    average: "positive" | "neutral" | "negative";
    summary: string;
  };
  top_sentiment_topics?: string[];
  leaderboard: LeaderboardEntry[];
  benchmarks: Benchmarks;
  creator_performance: CreatorPerformanceData[];
  recommendations: {
    works: string[];
    doesnt_work: string[];
    suggestions: string[];
  };
  overview_summary?: string;
  innovation_summary?: string;
}

interface AIInsightsContentProps {
  insights: StructuredInsights;
  overviewParagraph?: string;
  innovationParagraph?: string;
  sentimentParagraph?: string;
  canEdit?: boolean;
  reportId?: string;
  brandName?: string;
  onSaveInsights?: (updates: Partial<StructuredInsights>) => Promise<void>;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatPercent = (num: number): string => {
  return num.toFixed(2) + "%";
};

const getSentimentBadgeColor = (sentiment: string): "positive" | "negative" | "neutral" => {
  switch (sentiment) {
    case "positive":
      return "positive";
    case "negative":
      return "negative";
    default:
      return "neutral";
  }
};

const getSentimentLabel = (sentiment: string): string => {
  switch (sentiment) {
    case "positive":
      return "POSITIVE";
    case "negative":
      return "NEGATIVE";
    default:
      return "NEUTRAL";
  }
};

interface EditableSectionProps {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  canEdit?: boolean;
  placeholder?: string;
}

const EditableSection = ({
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  canEdit = false,
  placeholder = "Enter text...",
}: EditableSectionProps) => {
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] rounded-[15px] border-foreground"
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
    );
  }

  return (
    <div className="group relative">
      <p className="text-foreground leading-relaxed">{value ? <TranslatedText text={value} /> : placeholder}</p>
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartEdit}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        >
          <Pencil className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

interface EditableListSectionProps {
  items: string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (items: string[]) => void;
  onCancel: () => void;
  canEdit?: boolean;
  bulletColor?: string;
  placeholder?: string;
}

const EditableListSection = ({
  items,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  canEdit = false,
  bulletColor = "text-foreground",
  placeholder = "Enter items (one per line)...",
}: EditableListSectionProps) => {
  const [editValue, setEditValue] = useState(items.join('\n'));

  const handleSave = () => {
    const newItems = editValue.split('\n').filter(line => line.trim());
    onSave(newItems);
  };

  const handleCancel = () => {
    setEditValue(items.join('\n'));
    onCancel();
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] rounded-[15px] border-foreground text-sm"
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
    );
  }

  return (
    <div className="group relative">
      <ul className="space-y-2">
        {(items || []).map((item, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-2">
            <span className={bulletColor}>•</span>
            <TranslatedText text={item} />
          </li>
        ))}
        {(!items || items.length === 0) && (
          <li className="text-sm text-muted-foreground italic">{placeholder}</li>
        )}
      </ul>
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartEdit}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
        >
          <Pencil className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

export const AIInsightsContent = forwardRef<HTMLDivElement, AIInsightsContentProps>(({
  insights,
  overviewParagraph,
  innovationParagraph,
  sentimentParagraph,
  canEdit = false,
  reportId,
  brandName,
  onSaveInsights,
}, ref) => {
  const t = useT();
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [selectedTopContentIds, setSelectedTopContentIds] = useState<string[]>(
    insights.selected_top_content_ids || (insights.top_content || []).map((c) => c.id)
  );
  const [isContentSelectorOpen, setIsContentSelectorOpen] = useState(false);

  // Local state for editable fields
  const [executiveSummary, setExecutiveSummary] = useState(insights.executive_summary);
  const [mainGoal, setMainGoal] = useState(insights.campaign_context.mainGoal);
  const [actions, setActions] = useState(insights.campaign_context.actions);
  const [highlights, setHighlights] = useState(insights.campaign_context.highlights);
  const [worksItems, setWorksItems] = useState(insights.recommendations?.works || []);
  const [doesntWorkItems, setDoesntWorkItems] = useState(insights.recommendations?.doesnt_work || []);
  const [suggestionsItems, setSuggestionsItems] = useState(insights.recommendations?.suggestions || []);
  const [sentimentSummary, setSentimentSummary] = useState(sentimentParagraph || insights.sentiment_analysis.summary);
  
  // Overview and Innovation summary states
  const [overviewSummary, setOverviewSummary] = useState(
    insights.overview_summary || overviewParagraph || ''
  );
  const [innovationSummary, setInnovationSummary] = useState(
    insights.innovation_summary || innovationParagraph || ''
  );
  
  // Sentiment topics editing state
  const [isEditingSentimentTopics, setIsEditingSentimentTopics] = useState(false);
  const [editedSentimentTopics, setEditedSentimentTopics] = useState(
    insights.top_sentiment_topics?.join(', ') || ''
  );

  const startEditing = (section: string) => {
    setEditingSections((prev) => new Set([...prev, section]));
  };

  const stopEditing = (section: string) => {
    setEditingSections((prev) => {
      const next = new Set(prev);
      next.delete(section);
      return next;
    });
  };

  const handleSaveSection = async (section: string, value: string) => {
    switch (section) {
      case "executive_summary":
        setExecutiveSummary(value);
        break;
      case "mainGoal":
        setMainGoal(value);
        break;
      case "actions":
        setActions(value);
        break;
      case "highlights":
        setHighlights(value);
        break;
      case "sentiment_summary":
        setSentimentSummary(value);
        break;
      case "overview_summary":
        setOverviewSummary(value);
        break;
      case "innovation_summary":
        setInnovationSummary(value);
        break;
    }
    stopEditing(section);
    
    // Save to parent if available
    if (onSaveInsights) {
      const updates: Partial<StructuredInsights> = {};
      if (section === "executive_summary") {
        updates.executive_summary = value;
      } else if (["mainGoal", "actions", "highlights"].includes(section)) {
        updates.campaign_context = {
          mainGoal: section === "mainGoal" ? value : mainGoal,
          actions: section === "actions" ? value : actions,
          highlights: section === "highlights" ? value : highlights,
        };
      } else if (section === "sentiment_summary") {
        updates.sentiment_analysis = {
          ...insights.sentiment_analysis,
          summary: value,
        };
      } else if (section === "overview_summary") {
        updates.overview_summary = value;
      } else if (section === "innovation_summary") {
        updates.innovation_summary = value;
      }
      await onSaveInsights(updates);
    }
  };

  const handleSaveListSection = async (section: string, items: string[]) => {
    switch (section) {
      case "recommendations_works":
        setWorksItems(items);
        break;
      case "recommendations_doesnt_work":
        setDoesntWorkItems(items);
        break;
      case "recommendations_suggestions":
        setSuggestionsItems(items);
        break;
    }
    stopEditing(section);
    
    if (onSaveInsights) {
      const updates: Partial<StructuredInsights> = {
        recommendations: {
          works: section === "recommendations_works" ? items : worksItems,
          doesnt_work: section === "recommendations_doesnt_work" ? items : doesntWorkItems,
          suggestions: section === "recommendations_suggestions" ? items : suggestionsItems,
        },
      };
      await onSaveInsights(updates);
    }
  };

  const handleContentSelection = (ids: string[], items: SelectedContentItem[]) => {
    setSelectedTopContentIds(ids);
    if (onSaveInsights) {
      // Update both the selected IDs and the top_content array with full data
      const existingContent = insights.top_content || [];
      // Merge: keep existing items not in new selection, add all new selected items
      const existingMap = new Map(existingContent.map(c => [c.id, c]));
      items.forEach(item => existingMap.set(item.id, item));
      const mergedContent = Array.from(existingMap.values());
      onSaveInsights({ selected_top_content_ids: ids, top_content: mergedContent });
    }
  };

  const handleSaveSentimentTopics = async () => {
    const topics = editedSentimentTopics
      .split(',')
      .map(t => t.trim())
      .filter(t => t);
    
    if (onSaveInsights) {
      await onSaveInsights({ top_sentiment_topics: topics });
    }
    setIsEditingSentimentTopics(false);
  };

  const handleCancelSentimentTopics = () => {
    setEditedSentimentTopics(insights.top_sentiment_topics?.join(', ') || '');
    setIsEditingSentimentTopics(false);
  };

  // Filter top content based on selection
  const topContentArray = insights.top_content || [];
  const displayedTopContent = selectedTopContentIds.length > 0
    ? topContentArray.filter((c) => selectedTopContentIds.includes(c.id))
    : topContentArray.slice(0, 5);

  // KPI Targets
  const kpiTargets = insights.kpi_targets;

  return (
    <div ref={ref} className="space-y-8 pdf-export-container" style={{ backgroundColor: '#E9E9E9' }}>
      {/* Executive Summary Block - Page 1 */}
      <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          Executive Summary
        </h2>
        
        <div className="mb-6">
          <EditableSection
            value={executiveSummary}
            isEditing={editingSections.has("executive_summary")}
            onStartEdit={() => startEditing("executive_summary")}
            onSave={(v) => handleSaveSection("executive_summary", v)}
            onCancel={() => stopEditing("executive_summary")}
            canEdit={canEdit}
            placeholder="Enter executive summary..."
          />
        </div>

        {/* Campaign Context Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-accent-orange" />
              <span className="font-bold text-sm uppercase">Main Goal</span>
            </div>
            <EditableSection
              value={mainGoal}
              isEditing={editingSections.has("mainGoal")}
              onStartEdit={() => startEditing("mainGoal")}
              onSave={(v) => handleSaveSection("mainGoal", v)}
              onCancel={() => stopEditing("mainGoal")}
              canEdit={canEdit}
              placeholder="Enter main goal..."
            />
          </Card>

          <Card className="p-4 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-5 h-5 text-accent-blue" />
              <span className="font-bold text-sm uppercase">What We Did</span>
            </div>
            <EditableSection
              value={actions}
              isEditing={editingSections.has("actions")}
              onStartEdit={() => startEditing("actions")}
              onSave={(v) => handleSaveSection("actions", v)}
              onCancel={() => stopEditing("actions")}
              canEdit={canEdit}
              placeholder="Enter actions..."
            />
          </Card>

          <Card className="p-4 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-accent-green" />
              <span className="font-bold text-sm uppercase">Highlights</span>
            </div>
            <EditableSection
              value={highlights}
              isEditing={editingSections.has("highlights")}
              onStartEdit={() => startEditing("highlights")}
              onSave={(v) => handleSaveSection("highlights", v)}
              onCancel={() => stopEditing("highlights")}
              canEdit={canEdit}
              placeholder="Enter highlights..."
            />
          </Card>
        </div>
      </Card>

      {/* Top 5 Content Block - Page 2 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top 5 Content</h2>
          {canEdit && reportId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsContentSelectorOpen(true)}
              className="rounded-[35px] border-foreground"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Select Content
            </Button>
          )}
        </div>
        
        {displayedTopContent.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {displayedTopContent.map((content) => (
              <ContentPreviewCard
                key={content.id}
                thumbnailUrl={content.thumbnail_url}
                contentType={content.content_type}
                platform={content.platform}
                views={content.views}
                engagementRate={content.engagement_rate}
                url={content.url}
                creatorHandle={content.creator_handle}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No content available</p>
        )}
      </Card>

      {/* Campaign Overview Block - Page 3 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          {t("Základní přehled kampaně")}
        </h2>
        <div className="mb-4">
          <EditableSection
            value={overviewSummary}
            isEditing={editingSections.has("overview_summary")}
            onStartEdit={() => startEditing("overview_summary")}
            onSave={(v) => handleSaveSection("overview_summary", v)}
            onCancel={() => stopEditing("overview_summary")}
            canEdit={canEdit}
            placeholder={t("AI shrnutí základních metrik kampaně...")}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            title="Creators"
            value={insights.overview_metrics.creators}
            icon={Users}
            accentColor="blue"
            target={kpiTargets?.overview.creators}
          />
          <MetricTile
            title="Content"
            value={insights.overview_metrics.content}
            icon={FileText}
            accentColor="blue"
            target={kpiTargets?.overview.content}
          />
          <MetricTile
            title="Views"
            value={formatNumber(insights.overview_metrics.views)}
            icon={Eye}
            accentColor="blue"
            target={kpiTargets?.overview.views ? formatNumber(kpiTargets.overview.views) : undefined}
          />
          <MetricTile
            title="Avg CPM"
            value={formatCurrency(insights.overview_metrics.avgCpm, insights.overview_metrics.currency)}
            icon={DollarSign}
            accentColor="blue"
            target={kpiTargets?.overview.avgCpm ? formatCurrency(kpiTargets.overview.avgCpm, insights.overview_metrics.currency) : undefined}
          />
        </div>
      </Card>

      {/* Innovation Metrics Block - Page 4 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          {t("Inovativní a kvalitativní metriky")}
        </h2>
        <div className="mb-4">
          <EditableSection
            value={innovationSummary}
            isEditing={editingSections.has("innovation_summary")}
            onStartEdit={() => startEditing("innovation_summary")}
            onSave={(v) => handleSaveSection("innovation_summary", v)}
            onCancel={() => stopEditing("innovation_summary")}
            canEdit={canEdit}
            placeholder={t("AI shrnutí inovativních a kvalitativních metrik...")}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            title="TSWB Cost"
            value={formatCurrency(insights.innovation_metrics.tswbCost, insights.innovation_metrics.currency)}
            icon={Clock}
            accentColor="green"
            benchmark={insights.benchmarks?.tswbCost !== undefined ? formatCurrency(insights.benchmarks.tswbCost, insights.innovation_metrics.currency) : undefined}
          />
          <MetricTile
            title="Interactions"
            value={formatNumber(insights.innovation_metrics.interactions)}
            icon={Heart}
            accentColor="green"
            benchmark={insights.benchmarks?.interactions !== undefined ? formatNumber(insights.benchmarks.interactions) : undefined}
          />
          <MetricTile
            title="Engagement Rate"
            value={formatPercent(insights.innovation_metrics.engagementRate)}
            icon={TrendingUp}
            accentColor="green"
            benchmark={insights.benchmarks?.engagementRate !== undefined ? formatPercent(insights.benchmarks.engagementRate) : undefined}
          />
          <MetricTile
            title="Virality Rate"
            value={formatPercent(insights.innovation_metrics.viralityRate)}
            icon={MessageSquare}
            accentColor="green"
            benchmark={insights.benchmarks?.viralityRate !== undefined ? formatPercent(insights.benchmarks.viralityRate) : undefined}
          />
        </div>
      </Card>

      {/* Campaign Sentiment Block - Page 5 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          {t("Sentiment kampaně")}
        </h2>
        
        <div className="mb-4">
          <EditableSection
            value={sentimentSummary}
            isEditing={editingSections.has("sentiment_summary")}
            onStartEdit={() => startEditing("sentiment_summary")}
            onSave={(v) => handleSaveSection("sentiment_summary", v)}
            onCancel={() => stopEditing("sentiment_summary")}
            canEdit={canEdit}
            placeholder="Enter sentiment analysis summary..."
          />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <span className="text-muted-foreground">Average Sentiment:</span>
          <TopicBadge
            topic={getSentimentLabel(insights.sentiment_analysis.average)}
            variant={getSentimentBadgeColor(insights.sentiment_analysis.average)}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Top Topics:
            </span>
            {canEdit && !isEditingSentimentTopics && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingSentimentTopics(true)}
                className="h-6 w-6 p-0"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          {isEditingSentimentTopics ? (
            <div className="space-y-2">
              <Input
                value={editedSentimentTopics}
                onChange={(e) => setEditedSentimentTopics(e.target.value)}
                placeholder="Enter topics separated by commas..."
                className="rounded-[15px] border-foreground"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveSentimentTopics} className="rounded-[35px]">
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelSentimentTopics} className="rounded-[35px] border-foreground">
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {insights.top_sentiment_topics && insights.top_sentiment_topics.length > 0 ? (
                insights.top_sentiment_topics.map((topic, i) => (
                  <TopicBadge key={i} topic={topic} variant="default" />
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">No topics defined</span>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Creators Leaderboard Block - Page 6 */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          Creators Leaderboard
        </h2>
        {insights.leaderboard && insights.leaderboard.length > 0 ? (
          <LeaderboardTable
            entries={insights.leaderboard}
            benchmarks={insights.benchmarks || { engagementRate: 0, viralityRate: 0, tswbCost: 0 }}
          />
        ) : (
          <p className="text-muted-foreground text-center py-8">No leaderboard data available</p>
        )}
      </Card>

      {/* Content Performance - Each creator on separate page (Page 7+) */}
      {insights.creator_performance && insights.creator_performance.length > 0 ? (
        insights.creator_performance.map((creator) => {
          // Transform old data structure to new format with defensive defaults
          const transformedCreator = {
            handle: creator.handle || "",
            avatar_url: creator.avatar_url || null,
            platforms: creator.platforms || [],
            top_content: creator.top_content || null,
            sentiment_breakdown: creator.sentiment_breakdown || {
              positive: 0,
              neutral: 0,
              negative: 0,
            },
            relevance: getRelevanceAsNumber(creator.relevance),
            key_insight: creator.key_insight || "",
            positive_topics: creator.positive_topics || [],
            negative_topics: creator.negative_topics || [],
          };

          return (
            <Card key={creator.handle} className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
              <CreatorPerformanceCard
                creator={transformedCreator}
                canEdit={canEdit}
                variant="flat"
                brandName={brandName}
                onSaveKeyInsight={(handle, insight) => {
                  if (onSaveInsights) {
                    const updatedPerformance = (insights.creator_performance || []).map((c) =>
                      c.handle === handle ? { ...c, key_insight: insight } : c
                    );
                    onSaveInsights({ creator_performance: updatedPerformance });
                  }
                }}
                onSaveTopics={(handle, positiveTopics, negativeTopics) => {
                  if (onSaveInsights) {
                    const updatedPerformance = (insights.creator_performance || []).map((c) =>
                      c.handle === handle ? { ...c, positive_topics: positiveTopics, negative_topics: negativeTopics } : c
                    );
                    onSaveInsights({ creator_performance: updatedPerformance });
                  }
                }}
                onSaveContentSummary={(handle, summary) => {
                  if (onSaveInsights) {
                    const updatedPerformance = (insights.creator_performance || []).map((c) =>
                      c.handle === handle
                        ? { ...c, top_content: { ...c.top_content, content_summary: summary } }
                        : c
                    );
                    onSaveInsights({ creator_performance: updatedPerformance });
                  }
                }}
              />
            </Card>
          );
        })
      ) : (
        <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
          <h2 className="text-xl font-bold mb-4">Content Performance</h2>
          <p className="text-muted-foreground text-center py-8">No creator performance data available</p>
        </Card>
      )}

      {/* Summary & Takeaways Block - Last Page */}
      <Card className="p-6 rounded-[20px] border-foreground pdf-page-break" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-xl font-bold mb-4">
          Summary & Takeaways
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 rounded-[20px] border-accent-green">
            <h3 className="font-bold text-accent-green mb-3">✓ What Works</h3>
            <EditableListSection
              items={worksItems}
              isEditing={editingSections.has("recommendations_works")}
              onStartEdit={() => startEditing("recommendations_works")}
              onSave={(items) => handleSaveListSection("recommendations_works", items)}
              onCancel={() => stopEditing("recommendations_works")}
              canEdit={canEdit}
              bulletColor="text-accent-green"
              placeholder="Add what works..."
            />
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-orange">
            <h3 className="font-bold text-accent-orange mb-3">✗ What Doesn't Work</h3>
            <EditableListSection
              items={doesntWorkItems}
              isEditing={editingSections.has("recommendations_doesnt_work")}
              onStartEdit={() => startEditing("recommendations_doesnt_work")}
              onSave={(items) => handleSaveListSection("recommendations_doesnt_work", items)}
              onCancel={() => stopEditing("recommendations_doesnt_work")}
              canEdit={canEdit}
              bulletColor="text-accent-orange"
              placeholder="Add what doesn't work..."
            />
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-blue">
            <h3 className="font-bold text-accent-blue mb-3">→ Recommendations</h3>
            <EditableListSection
              items={suggestionsItems}
              isEditing={editingSections.has("recommendations_suggestions")}
              onStartEdit={() => startEditing("recommendations_suggestions")}
              onSave={(items) => handleSaveListSection("recommendations_suggestions", items)}
              onCancel={() => stopEditing("recommendations_suggestions")}
              canEdit={canEdit}
              bulletColor="text-accent-blue"
              placeholder="Add recommendations..."
            />
          </Card>
        </div>
      </Card>

      {/* Content Selector Dialog */}
      {reportId && (
        <ContentSelectorDialog
          open={isContentSelectorOpen}
          onOpenChange={setIsContentSelectorOpen}
          reportId={reportId}
          selectedIds={selectedTopContentIds}
          onSelect={handleContentSelection}
          maxSelections={5}
        />
      )}
    </div>
  );
});

AIInsightsContent.displayName = "AIInsightsContent";
