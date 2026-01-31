import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MetricTile } from "./MetricTile";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { LeaderboardTable, LeaderboardEntry, Benchmarks } from "./LeaderboardTable";
import { CreatorPerformanceCard } from "./CreatorPerformanceCard";
import { TopicBadge } from "./TopicBadge";
import { ContentSelectorDialog } from "./ContentSelectorDialog";
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
  relevance: "high" | "medium" | "low";
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

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
}

interface AIInsightsContentProps {
  insights: StructuredInsights;
  overviewParagraph?: string;
  innovationParagraph?: string;
  sentimentParagraph?: string;
  canEdit?: boolean;
  reportId?: string;
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
      <p className="text-foreground leading-relaxed">{value || placeholder}</p>
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

export const AIInsightsContent = ({
  insights,
  overviewParagraph,
  innovationParagraph,
  sentimentParagraph,
  canEdit = false,
  reportId,
  onSaveInsights,
}: AIInsightsContentProps) => {
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
  const [sentimentSummary, setSentimentSummary] = useState(sentimentParagraph || insights.sentiment_analysis.summary);

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
      }
      await onSaveInsights(updates);
    }
  };

  const handleContentSelection = (ids: string[]) => {
    setSelectedTopContentIds(ids);
    if (onSaveInsights) {
      onSaveInsights({ selected_top_content_ids: ids });
    }
  };

  // Filter top content based on selection
  const topContentArray = insights.top_content || [];
  const displayedTopContent = selectedTopContentIds.length > 0
    ? topContentArray.filter((c) => selectedTopContentIds.includes(c.id))
    : topContentArray.slice(0, 5);

  // KPI Targets
  const kpiTargets = insights.kpi_targets;

  return (
    <div className="space-y-8">
      {/* Executive Summary Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
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

      {/* Top 5 Content Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
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

      {/* Campaign Overview Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Základní přehled kampaně
        </h2>
        {overviewParagraph && (
          <p className="mb-4 text-foreground leading-relaxed">{overviewParagraph}</p>
        )}
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

      {/* Innovation Metrics Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Inovativní a kvalitativní metriky
        </h2>
        {innovationParagraph && (
          <p className="mb-4 text-foreground leading-relaxed">{innovationParagraph}</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            title="TSWB Cost"
            value={formatCurrency(insights.innovation_metrics.tswbCost, insights.innovation_metrics.currency)}
            icon={Clock}
            accentColor="green"
            target={kpiTargets?.innovation.tswbCost ? formatCurrency(kpiTargets.innovation.tswbCost, insights.innovation_metrics.currency) : undefined}
          />
          <MetricTile
            title="Interactions"
            value={formatNumber(insights.innovation_metrics.interactions)}
            icon={Heart}
            accentColor="green"
            target={kpiTargets?.innovation.interactions ? formatNumber(kpiTargets.innovation.interactions) : undefined}
          />
          <MetricTile
            title="Engagement Rate"
            value={formatPercent(insights.innovation_metrics.engagementRate)}
            icon={TrendingUp}
            accentColor="green"
            target={kpiTargets?.innovation.engagementRate ? formatPercent(kpiTargets.innovation.engagementRate) : undefined}
          />
          <MetricTile
            title="Virality Rate"
            value={formatPercent(insights.innovation_metrics.viralityRate)}
            icon={MessageSquare}
            accentColor="green"
            target={kpiTargets?.innovation.viralityRate ? formatPercent(kpiTargets.innovation.viralityRate) : undefined}
          />
        </div>
      </Card>

      {/* Campaign Sentiment Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Sentiment kampaně
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

        {insights.top_sentiment_topics && insights.top_sentiment_topics.length > 0 && (
          <div>
            <span className="text-sm font-medium text-muted-foreground block mb-2">
              Top Topics:
            </span>
            <div className="flex flex-wrap gap-2">
              {insights.top_sentiment_topics.map((topic, i) => (
                <TopicBadge key={i} topic={topic} variant="default" />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Creators Leaderboard Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
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

      {/* Content Performance Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Content Performance
        </h2>
        {insights.creator_performance && insights.creator_performance.length > 0 ? (
          <div className="space-y-6">
            {insights.creator_performance.map((creator) => (
              <CreatorPerformanceCard
                key={creator.handle}
                creator={creator}
                canEdit={canEdit}
                onSaveKeyInsight={(handle, insight) => {
                  if (onSaveInsights) {
                    const updatedPerformance = (insights.creator_performance || []).map((c) =>
                      c.handle === handle ? { ...c, key_insight: insight } : c
                    );
                    onSaveInsights({ creator_performance: updatedPerformance });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No creator performance data available</p>
        )}
      </Card>

      {/* Summary & Takeaways Block */}
      <Card className="p-6 rounded-[20px] border-foreground">
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Summary & Takeaways
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 rounded-[20px] border-accent-green">
            <h3 className="font-bold text-accent-green mb-3">✓ What Works</h3>
            <ul className="space-y-2">
              {(insights.recommendations?.works || []).map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-green">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-orange">
            <h3 className="font-bold text-accent-orange mb-3">✗ What Doesn't Work</h3>
            <ul className="space-y-2">
              {(insights.recommendations?.doesnt_work || []).map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-orange">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-blue">
            <h3 className="font-bold text-accent-blue mb-3">→ Recommendations</h3>
            <ul className="space-y-2">
              {(insights.recommendations?.suggestions || []).map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-blue">•</span>
                  {item}
                </li>
              ))}
            </ul>
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
};
