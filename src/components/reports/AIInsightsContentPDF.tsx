import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { MetricTile } from "./MetricTile";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { LeaderboardTable, LeaderboardEntry, Benchmarks } from "./LeaderboardTable";
import { TopicBadge } from "./TopicBadge";
import { Users, FileText, Eye, DollarSign, Clock, Heart, TrendingUp, MessageSquare, Target, Rocket, Star } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

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
  relevance: number | "high" | "medium" | "low";
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

const getRelevanceAsNumber = (rel: string | number | undefined): number => {
  if (typeof rel === "number") return rel;
  switch (rel) {
    case "high": return 85;
    case "medium": return 55;
    case "low": return 25;
    default: return 50;
  }
};

const getRelevanceColor = (relevance: number) => {
  if (relevance >= 70) return "text-accent-green";
  if (relevance >= 40) return "text-accent-orange";
  return "text-muted-foreground";
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

interface AIInsightsContentPDFProps {
  insights: StructuredInsights;
  overviewParagraph?: string;
  innovationParagraph?: string;
  sentimentParagraph?: string;
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
    case "positive": return "positive";
    case "negative": return "negative";
    default: return "neutral";
  }
};

const getSentimentLabel = (sentiment: string): string => {
  switch (sentiment) {
    case "positive": return "POSITIVE";
    case "negative": return "NEGATIVE";
    default: return "NEUTRAL";
  }
};

/**
 * PDF-optimized version of AIInsightsContent
 * - Continuous layout (no forced page breaks)
 * - Compact typography and spacing
 * - No interactive elements
 */
export const AIInsightsContentPDF = forwardRef<HTMLDivElement, AIInsightsContentPDFProps>(({
  insights,
  overviewParagraph,
  innovationParagraph,
  sentimentParagraph,
}, ref) => {
  const selectedTopContentIds = insights.selected_top_content_ids || [];
  const topContentArray = insights.top_content || [];
  const displayedTopContent = selectedTopContentIds.length > 0
    ? topContentArray.filter((c) => selectedTopContentIds.includes(c.id))
    : topContentArray.slice(0, 5);

  const kpiTargets = insights.kpi_targets;
  const overviewSummary = insights.overview_summary || overviewParagraph || '';
  const innovationSummary = insights.innovation_summary || innovationParagraph || '';
  const sentimentSummary = sentimentParagraph || insights.sentiment_analysis?.summary || '';

  return (
    <div ref={ref} className="pdf-continuous space-y-4">
      {/* Executive Summary */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-3">Executive Summary</h2>
        <p className="text-sm leading-relaxed mb-4">{insights.executive_summary}</p>
        
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-accent-orange" />
              <span className="font-bold text-xs uppercase">Main Goal</span>
            </div>
            <p className="text-xs">{insights.campaign_context.mainGoal}</p>
          </Card>

          <Card className="p-3 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-4 h-4 text-accent-blue" />
              <span className="font-bold text-xs uppercase">What We Did</span>
            </div>
            <p className="text-xs">{insights.campaign_context.actions}</p>
          </Card>

          <Card className="p-3 rounded-[15px] border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-accent-green" />
              <span className="font-bold text-xs uppercase">Highlights</span>
            </div>
            <p className="text-xs">{insights.campaign_context.highlights}</p>
          </Card>
        </div>
      </Card>

      {/* Top 5 Content */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-3">Top 5 Content</h2>
        {displayedTopContent.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {displayedTopContent.map((content) => (
              <ContentPreviewCard
                key={content.id}
                thumbnailUrl={content.thumbnail_url}
                contentType={content.content_type}
                platform={content.platform}
                views={content.views}
                engagementRate={content.engagement_rate}
                url={null}
                creatorHandle={content.creator_handle}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No content available</p>
        )}
      </Card>

      {/* Campaign Overview */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-2">Základní přehled kampaně</h2>
        {overviewSummary && (
          <p className="text-xs leading-relaxed mb-3">{overviewSummary}</p>
        )}
        <div className="grid grid-cols-4 gap-3">
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

      {/* Innovation Metrics */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-2">Inovativní a kvalitativní metriky</h2>
        {innovationSummary && (
          <p className="text-xs leading-relaxed mb-3">{innovationSummary}</p>
        )}
        <div className="grid grid-cols-4 gap-3">
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

      {/* Sentiment */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-2">Sentiment kampaně</h2>
        {sentimentSummary && (
          <p className="text-xs leading-relaxed mb-3">{sentimentSummary}</p>
        )}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-muted-foreground">Average Sentiment:</span>
          <TopicBadge
            topic={getSentimentLabel(insights.sentiment_analysis.average)}
            variant={getSentimentBadgeColor(insights.sentiment_analysis.average)}
          />
        </div>
        {insights.top_sentiment_topics && insights.top_sentiment_topics.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Top Topics:</span>
            <div className="flex flex-wrap gap-1">
              {insights.top_sentiment_topics.map((topic, i) => (
                <TopicBadge key={i} topic={topic} variant="default" />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Leaderboard */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-3">Creators Leaderboard</h2>
        {insights.leaderboard && insights.leaderboard.length > 0 ? (
          <LeaderboardTable
            entries={insights.leaderboard}
            benchmarks={insights.benchmarks || { engagementRate: 0, viralityRate: 0, tswbCost: 0 }}
          />
        ) : (
          <p className="text-muted-foreground text-center py-4">No leaderboard data available</p>
        )}
      </Card>

      {/* Creator Performance - all in continuous flow */}
      {insights.creator_performance && insights.creator_performance.length > 0 && (
        insights.creator_performance.map((creator) => {
          const relevanceNum = getRelevanceAsNumber(creator.relevance);
          
          return (
            <Card key={creator.handle} className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
              <h2 className="text-lg font-bold mb-3">Content Performance: @{creator.handle}</h2>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.handle}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                      {creator.handle.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm">@{creator.handle}</h3>
                  </div>
                </div>
                <div className="flex gap-1">
                  {(creator.platforms || []).map((platform) => (
                    <span
                      key={platform}
                      className={cn(
                        "text-xs capitalize px-2 py-0.5 rounded-full",
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

              {/* Content: 2-column layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Top Post & Sentiment */}
                <div className="space-y-3">
                  {creator.top_content && (
                    <div className="w-[140px]">
                      <ContentPreviewCard
                        thumbnailUrl={creator.top_content.thumbnail_url}
                        contentType={creator.top_content.content_type}
                        platform={creator.top_content.platform}
                        views={creator.top_content.views}
                        engagementRate={creator.top_content.engagement_rate}
                        url={null}
                        contentSummary={creator.top_content.content_summary}
                      />
                    </div>
                  )}

                  {creator.sentiment_breakdown && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground mb-1 block">
                        Sentiment Breakdown:
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-accent-green font-medium">
                          {creator.sentiment_breakdown.positive ?? 0}% Pos
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground font-medium">
                          {creator.sentiment_breakdown.neutral ?? 0}% Neut
                        </span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-accent-orange font-medium">
                          {creator.sentiment_breakdown.negative ?? 0}% Neg
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs text-muted-foreground">Relevance: </span>
                    <span className={`font-bold text-sm ${getRelevanceColor(relevanceNum)}`}>
                      {relevanceNum}%
                    </span>
                  </div>
                </div>

                {/* Right: Key Insight & Topics */}
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground mb-1 block">Key Insight:</span>
                    <p className="text-xs leading-relaxed">{creator.key_insight || "No insight available"}</p>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-muted-foreground mb-1 block">Positive Topics:</span>
                    <div className="flex flex-wrap gap-1">
                      {creator.positive_topics && creator.positive_topics.length > 0 ? (
                        creator.positive_topics.map((topic, i) => (
                          <TopicBadge key={i} topic={topic} variant="positive" />
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-muted-foreground mb-1 block">Negative Topics:</span>
                    <div className="flex flex-wrap gap-1">
                      {creator.negative_topics && creator.negative_topics.length > 0 ? (
                        creator.negative_topics.map((topic, i) => (
                          <TopicBadge key={i} topic={topic} variant="negative" />
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}

      {/* Summary & Takeaways */}
      <Card className="p-4 rounded-[20px] border-foreground" style={{ backgroundColor: '#E9E9E9' }}>
        <h2 className="text-lg font-bold mb-3">Summary & Takeaways</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 rounded-[15px] border-accent-green">
            <h3 className="font-bold text-accent-green mb-2 text-sm">✓ What Works</h3>
            <ul className="space-y-1">
              {(insights.recommendations?.works || []).map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className="text-accent-green">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-3 rounded-[15px] border-accent-orange">
            <h3 className="font-bold text-accent-orange mb-2 text-sm">✗ What Doesn't Work</h3>
            <ul className="space-y-1">
              {(insights.recommendations?.doesnt_work || []).map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className="text-accent-orange">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-3 rounded-[15px] border-accent-blue">
            <h3 className="font-bold text-accent-blue mb-2 text-sm">→ Recommendations</h3>
            <ul className="space-y-1">
              {(insights.recommendations?.suggestions || []).map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className="text-accent-blue">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Card>
    </div>
  );
});

AIInsightsContentPDF.displayName = "AIInsightsContentPDF";
