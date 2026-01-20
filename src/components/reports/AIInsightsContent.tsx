import { Card } from "@/components/ui/card";
import { MetricTile } from "./MetricTile";
import { ContentPreviewCard } from "./ContentPreviewCard";
import { LeaderboardTable, LeaderboardEntry, Benchmarks } from "./LeaderboardTable";
import { Users, FileText, Eye, DollarSign, Clock, Heart, TrendingUp, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { secondsToReadableTime } from "@/lib/watchTimeUtils";
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

interface CreatorPerformance {
  handle: string;
  avatar_url: string | null;
  platform: string;
  top_content: TopContent | null;
  sentiment: string | null;
  sentiment_summary: string | null;
}

interface StructuredInsights {
  executive_summary: string;
  campaign_context: {
    mainGoal: string;
    actions: string;
    highlights: string;
  };
  top_content: TopContent[];
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
  sentiment_analysis: {
    average: "positive" | "neutral" | "negative";
    summary: string;
  };
  leaderboard: LeaderboardEntry[];
  benchmarks: Benchmarks;
  creator_performance: CreatorPerformance[];
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
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatPercent = (num: number): string => {
  return num.toFixed(2) + "%";
};

const getSentimentColor = (sentiment: string): string => {
  switch (sentiment) {
    case "positive":
      return "text-accent-green";
    case "negative":
      return "text-accent-orange";
    default:
      return "text-muted-foreground";
  }
};

const getSentimentLabel = (sentiment: string): string => {
  switch (sentiment) {
    case "positive":
      return "Pozitivní";
    case "negative":
      return "Negativní";
    default:
      return "Neutrální";
  }
};

const MarkdownContent = ({ content }: { content: string }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => (
        <p className="mb-3 text-foreground leading-relaxed">{children}</p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold text-foreground">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic text-accent-orange">{children}</em>
      ),
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-3 space-y-1 text-foreground">{children}</ul>
      ),
      li: ({ children }) => (
        <li className="text-foreground">{children}</li>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

export const AIInsightsContent = ({
  insights,
  overviewParagraph,
  innovationParagraph,
  sentimentParagraph,
}: AIInsightsContentProps) => {
  return (
    <div className="space-y-8">
      {/* Executive Summary */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Executive Summary
        </h2>
        <Card className="p-6 rounded-[20px] border-foreground">
          <MarkdownContent content={insights.executive_summary} />
          
          {/* Campaign Context */}
          <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-[15px]">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Hlavní cíl:</span>
              <p className="text-foreground">{insights.campaign_context.mainGoal}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Co jsme udělali:</span>
              <p className="text-foreground">{insights.campaign_context.actions}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Co se povedlo:</span>
              <p className="text-foreground">{insights.campaign_context.highlights}</p>
            </div>
          </div>

          {/* Top 5 Content */}
          {insights.top_content.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">TOP 5 Content</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {insights.top_content.slice(0, 5).map((content) => (
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
            </div>
          )}
        </Card>
      </section>

      {/* Campaign Overview */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Základní přehled kampaně
        </h2>
        {overviewParagraph && (
          <div className="mb-4">
            <MarkdownContent content={overviewParagraph} />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            title="Creators"
            value={insights.overview_metrics.creators}
            icon={Users}
            accentColor="blue"
          />
          <MetricTile
            title="Content"
            value={insights.overview_metrics.content}
            icon={FileText}
            accentColor="blue"
          />
          <MetricTile
            title="Views"
            value={formatNumber(insights.overview_metrics.views)}
            icon={Eye}
            accentColor="blue"
          />
          <MetricTile
            title="Avg CPM"
            value={formatCurrency(insights.overview_metrics.avgCpm, insights.overview_metrics.currency)}
            icon={DollarSign}
            accentColor="blue"
          />
        </div>
      </section>

      {/* Innovation Metrics */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Inovativní a kvalitativní metriky
        </h2>
        {innovationParagraph && (
          <div className="mb-4">
            <MarkdownContent content={innovationParagraph} />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            title="TSWB Cost"
            value={formatCurrency(insights.innovation_metrics.tswbCost, insights.innovation_metrics.currency)}
            icon={Clock}
            accentColor="green"
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
          />
          <MetricTile
            title="Virality Rate"
            value={formatPercent(insights.innovation_metrics.viralityRate)}
            icon={MessageSquare}
            accentColor="green"
          />
        </div>
      </section>

      {/* Campaign Sentiment */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Sentiment kampaně
        </h2>
        {sentimentParagraph && (
          <div className="mb-4">
            <MarkdownContent content={sentimentParagraph} />
          </div>
        )}
        <Card className="p-6 rounded-[20px] border-foreground">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Průměrný sentiment:</span>
            <span className={`text-2xl font-bold ${getSentimentColor(insights.sentiment_analysis.average)}`}>
              {getSentimentLabel(insights.sentiment_analysis.average)}
            </span>
          </div>
          {insights.sentiment_analysis.summary && (
            <p className="mt-4 text-muted-foreground">
              {insights.sentiment_analysis.summary}
            </p>
          )}
        </Card>
      </section>

      {/* Influencer Leaderboard */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Influencer Leaderboard
        </h2>
        <LeaderboardTable
          entries={insights.leaderboard}
          benchmarks={insights.benchmarks}
        />
      </section>

      {/* Content Performance */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Content Performance
        </h2>
        <div className="space-y-6">
          {insights.creator_performance.map((creator) => (
            <Card key={creator.handle} className="p-6 rounded-[20px] border-foreground">
              <div className="flex items-center gap-3 mb-4">
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
                  <span className="text-xs text-muted-foreground capitalize">{creator.platform}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Top Content */}
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

                {/* Sentiment */}
                <div className="space-y-3">
                  {creator.sentiment && (
                    <div>
                      <span className="text-sm text-muted-foreground">Sentiment:</span>
                      <span className={`ml-2 font-medium ${getSentimentColor(creator.sentiment)}`}>
                        {getSentimentLabel(creator.sentiment)}
                      </span>
                    </div>
                  )}
                  {creator.sentiment_summary && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Klíčová témata:</span>
                      <p className="text-sm">{creator.sentiment_summary}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">
          Shrnutí a doporučení
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 rounded-[20px] border-accent-green">
            <h3 className="font-bold text-accent-green mb-3">✓ Co funguje</h3>
            <ul className="space-y-2">
              {insights.recommendations.works.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-green">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-orange">
            <h3 className="font-bold text-accent-orange mb-3">✗ Co nefunguje</h3>
            <ul className="space-y-2">
              {insights.recommendations.doesnt_work.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-orange">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6 rounded-[20px] border-accent-blue">
            <h3 className="font-bold text-accent-blue mb-3">→ Doporučení</h3>
            <ul className="space-y-2">
              {insights.recommendations.suggestions.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-accent-blue">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
};
