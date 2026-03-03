import { useState, useEffect, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TranslatedText } from "@/components/ui/TranslatedText";
import { MetricTile } from "./MetricTile";
import { SnapshotTrendChart } from "./SnapshotTrendChart";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrencySimple, formatCurrency } from "@/lib/currencyUtils";
import { supabase } from "@/integrations/supabase/client";
import {
  Target,
  Rocket,
  Star,
  Wallet,
  Users,
  Pencil,
  Save,
  X,
  BarChart3,
  MessageCircle,
  Mail,
  Clock,
  Eye,
  TrendingUp,
  MousePointer,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Zap,
  CheckCircle,
  ArrowRight,
  Play,
} from "lucide-react";

// ── Types ──

export interface QuarterlyStructuredInsights {
  executive_summary: {
    intro?: string;
    media_insight: string;
    top_result: string;
    recommendation: string;
  };
  goal_fulfillment: {
    goals_set: string[];
    results: string[];
  };
  key_metrics: {
    spend: number;
    reach: number;
    frequency: number;
    currency: string;
  };
  detail_metrics: {
    cpm: number;
    cpe: number;
    cpv: number;
    currency: string;
  };
  metrics_over_time: string;
  metric_commentary?: {
    facebook_key?: string;
    facebook_detail?: string;
    instagram_key?: string;
    instagram_detail?: string;
    tiktok_key?: string;
    tiktok_detail?: string;
  };
  media_plan_comparison?: {
    budget?: { planned: number; actual: number };
    impressions?: { planned: number; actual: number };
    reach?: { planned: number; actual: number };
    cpm?: { planned: number; actual: number };
    frequency?: { planned: number; actual: number };
  } | null;
  community_management: {
    answered_comments: number | null;
    answered_dms: number | null;
    response_rate_24h: number | null;
  };
  brand_awareness: string;
  facebook_metrics: { spend: number; reach: number; frequency: number };
  facebook_detail_metrics: { cpm: number; cpe: number; cpv: number };
  facebook_metrics_over_time: string;
  facebook_top_posts_analysis?: string;
  facebook_improve_posts_analysis?: string;
  facebook_top_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  facebook_improve_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  instagram_metrics: { spend: number; reach: number; frequency: number };
  instagram_detail_metrics: { cpm: number; cpe: number; cpv: number };
  instagram_metrics_over_time: string;
  instagram_top_posts_analysis?: string;
  instagram_improve_posts_analysis?: string;
  instagram_top_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  instagram_improve_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  tiktok_metrics: { spend: number; reach: number; frequency: number };
  tiktok_detail_metrics: { cpm: number; cpe: number; cpv: number };
  tiktok_metrics_over_time: string;
  tiktok_top_posts_analysis?: string;
  tiktok_improve_posts_analysis?: string;
  tiktok_top_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  tiktok_improve_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
    reason?: string;
    highlight_metric?: string;
    highlight_value?: number;
  }[];
  followers: {
    facebook: number | null;
    instagram: number | null;
    tiktok: number | null;
  };
  summary_success: {
    what_worked: string[];
    top_results: string[];
  };
  summary_events: {
    what_happened: string[];
    what_we_solved: string[];
    threats_opportunities: string[];
  };
  learnings: {
    improving: string[];
    focus_areas: string[];
    changes: string[];
  };
}

interface QuarterlyAdsInsightsContentProps {
  insights: QuarterlyStructuredInsights;
  canEdit?: boolean;
  onSaveInsights?: (updates: Partial<QuarterlyStructuredInsights>) => Promise<void>;
  hasMetaPlatform?: boolean;
  hasTiktokPlatform?: boolean;
  reportId?: string;
}

// ── Helpers ──

const formatNumber = (num: number): string => {
  if (num == null) return "-";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

const formatPercent = (num: number): string => {
  if (num == null) return "-";
  return num.toFixed(2) + "%";
};

// ── Reusable sub-components ──

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
  value, isEditing, onStartEdit, onSave, onCancel, canEdit = false, placeholder = "Enter text...",
}: EditableSectionProps) => {
  const [editValue, setEditValue] = useState(value);
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder={placeholder} className="min-h-[100px] rounded-[15px] border-foreground" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(editValue)} className="rounded-[35px]"><Save className="w-3 h-3 mr-1" /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditValue(value); onCancel(); }} className="rounded-[35px] border-foreground"><X className="w-3 h-3 mr-1" /> Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group relative">
      <p className="text-foreground leading-relaxed whitespace-pre-line">{value ? <TranslatedText text={value} /> : <span className="text-muted-foreground italic">{placeholder}</span>}</p>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onStartEdit} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0">
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
  items, isEditing, onStartEdit, onSave, onCancel, canEdit = false, bulletColor = "text-foreground", placeholder = "Enter items (one per line)...",
}: EditableListSectionProps) => {
  const [editValue, setEditValue] = useState(items.join("\n"));
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder={placeholder} className="min-h-[100px] rounded-[15px] border-foreground text-sm" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(editValue.split("\n").filter((l) => l.trim()))} className="rounded-[35px]"><Save className="w-3 h-3 mr-1" /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditValue(items.join("\n")); onCancel(); }} className="rounded-[35px] border-foreground"><X className="w-3 h-3 mr-1" /> Cancel</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="group relative">
      <ul className="space-y-2">
        {(items || []).map((item, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-2"><span className={bulletColor}>•</span><TranslatedText text={item} /></li>
        ))}
        {(!items || items.length === 0) && <li className="text-sm text-muted-foreground italic">{placeholder}</li>}
      </ul>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onStartEdit} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"><Pencil className="w-3 h-3" /></Button>
      )}
    </div>
  );
};

const EditableNumberField = ({
  value, label, canEdit, onSave,
}: { value: number | null; label: string; canEdit: boolean; onSave: (v: number | null) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-24 h-8 rounded-[10px] border-foreground text-sm" />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { onSave(editValue ? Number(editValue) : null); setIsEditing(false); }}><Save className="w-3 h-3" /></Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditValue(value?.toString() || ""); setIsEditing(false); }}><X className="w-3 h-3" /></Button>
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-2">
      <span className="text-2xl font-bold text-foreground">{value != null ? formatNumber(value) : "-"}</span>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"><Pencil className="w-3 h-3" /></Button>
      )}
    </div>
  );
};

const MetricCommentary = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <div className="mb-4 p-3 bg-muted/40 rounded-[12px]">
      <p className="text-sm text-foreground leading-relaxed"><TranslatedText text={text} /></p>
    </div>
  );
};

const PostCard = ({ post }: { post: { name: string; spend: number; impressions: number; clicks: number; ctr: number; thumbnail_url?: string; reason?: string; highlight_metric?: string; highlight_value?: number } }) => (
  <Card className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow">
    <div className="relative aspect-[9/12.8] bg-muted overflow-hidden">
      {post.thumbnail_url ? (
        <img src={post.thumbnail_url} alt={post.name} className="w-full h-full object-cover" referrerPolicy="no-referrer"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.placeholder')?.classList.remove('hidden'); }}
        />
      ) : null}
      <div className={`w-full h-full flex flex-col items-center justify-center gap-2 placeholder ${post.thumbnail_url ? "hidden absolute inset-0" : ""}`}>
        <Eye className="w-8 h-8 text-muted-foreground/30" />
      </div>
    </div>
    <div className="p-3 space-y-2">
      <span className="font-medium text-xs truncate block">{post.name}</span>
      {post.reason && (
        <p className="text-[10px] text-muted-foreground italic leading-tight">{post.reason}</p>
      )}
      {post.highlight_metric && post.highlight_value != null && (
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
          <Wallet className="w-3 h-3" />
          <span>{post.highlight_metric}: {formatCurrencySimple(post.highlight_value, "CZK")}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground"><Wallet className="w-3 h-3" /><span>{formatCurrencySimple(post.spend || 0, "CZK")}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><Eye className="w-3 h-3" /><span>{formatNumber(post.impressions)}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><MousePointer className="w-3 h-3" /><span>{formatNumber(post.clicks)}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="w-3 h-3" /><span>{post.ctr?.toFixed(2) || 0}%</span></div>
      </div>
    </div>
  </Card>
);

// Platform icons
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#E4405F"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
);
const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
);

// ── Platform section component ──

interface PlatformSectionProps {
  icon: React.ReactNode;
  platformName: string;
  metrics: { spend: number; reach: number; frequency: number };
  detailMetrics: { cpm: number; cpe: number; cpv: number };
  metricsOverTime: string;
  metricCommentaryKey?: string;
  metricCommentaryDetail?: string;
  topPostsAnalysis?: string;
  improvePostsAnalysis?: string;
  topPosts: { name: string; spend: number; impressions: number; clicks: number; ctr: number; thumbnail_url?: string; reason?: string; highlight_metric?: string; highlight_value?: number }[];
  improvePosts: { name: string; spend: number; impressions: number; clicks: number; ctr: number; thumbnail_url?: string; reason?: string; highlight_metric?: string; highlight_value?: number }[];
  cur: string;
  canEdit: boolean;
  editingSections: Set<string>;
  startEditing: (s: string) => void;
  stopEditing: (s: string) => void;
  onSaveSection: (section: string, value: string) => void;
  sectionPrefix: string;
  getSpendPlan?: any;
  getReachPlan?: any;
  getFrequencyPlan?: any;
  chartSpaceId?: string | null;
  chartCampaignIds?: string[];
  chartEntityTypes?: string[];
}

const PlatformSection = ({
  icon, platformName, metrics, detailMetrics, metricsOverTime,
  metricCommentaryKey, metricCommentaryDetail,
  topPostsAnalysis, improvePostsAnalysis,
  topPosts, improvePosts, cur, canEdit, editingSections, startEditing, stopEditing, onSaveSection, sectionPrefix,
  getSpendPlan, getReachPlan, getFrequencyPlan,
  chartSpaceId, chartCampaignIds, chartEntityTypes,
}: PlatformSectionProps) => {
  const hasData = metrics.spend > 0 || metrics.reach > 0 || topPosts.length > 0;
  if (!hasData) return null;

  const postGrid = (posts: typeof topPosts) => (
    <div className={`grid gap-10 ${
      posts.length === 1 ? "grid-cols-1 max-w-[250px] mx-auto" :
      posts.length === 2 ? "grid-cols-2 max-w-[520px] mx-auto" :
      posts.length === 3 ? "grid-cols-3 max-w-[780px] mx-auto" :
      posts.length === 4 ? "grid-cols-2 md:grid-cols-4" :
      "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    }`}>
      {posts.map((post, i) => <PostCard key={i} post={post} />)}
    </div>
  );

  return (
    <>
      {/* Metrics over time */}
      <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h2 className="text-xl font-bold">Vývoj metrik v čase – {platformName}</h2>
        </div>
        <EditableSection
          value={metricsOverTime}
          isEditing={editingSections.has(`${sectionPrefix}_metrics_over_time`)}
          onStartEdit={() => startEditing(`${sectionPrefix}_metrics_over_time`)}
          onSave={(v) => onSaveSection(`${sectionPrefix}_metrics_over_time`, v)}
          onCancel={() => stopEditing(`${sectionPrefix}_metrics_over_time`)}
          canEdit={canEdit}
          placeholder={`AI popis vývoje metrik – ${platformName}...`}
        />
        {chartSpaceId && chartCampaignIds && chartCampaignIds.length > 0 && (
          <div className="mt-6">
            <SnapshotTrendChart
              spaceId={chartSpaceId}
              campaignIds={chartCampaignIds}
              entityTypes={chartEntityTypes}
            />
          </div>
        )}
      </Card>

      {/* Key metrics */}
      <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h2 className="text-xl font-bold">Klíčové metriky – {platformName}</h2>
        </div>
        <MetricCommentary text={metricCommentaryKey} />
        <div className="grid grid-cols-3 gap-4">
          <MetricTile title="Spend" value={formatCurrency(metrics.spend, cur)} icon={Wallet} accentColor="orange" planComparison={getSpendPlan} />
          <MetricTile title="Reach" value={formatNumber(metrics.reach)} icon={Users} accentColor="blue" planComparison={getReachPlan} />
          <MetricTile title="Frequency" value={metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" planComparison={getFrequencyPlan} />
        </div>
      </Card>

      {/* Detail metrics */}
      <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h2 className="text-xl font-bold">Detailní metriky – {platformName}</h2>
        </div>
        <MetricCommentary text={metricCommentaryDetail} />
        <div className="grid grid-cols-3 gap-4">
          <MetricTile title="CPM" value={formatCurrency(detailMetrics.cpm, cur)} icon={Wallet} accentColor="orange" />
          <MetricTile title="CPE" value={formatCurrency(detailMetrics.cpe, cur)} icon={Wallet} accentColor="orange" />
          <MetricTile title="CPV" value={formatCurrency(detailMetrics.cpv, cur)} icon={Wallet} accentColor="orange" />
        </div>
      </Card>

      {/* TOP posts */}
      {(topPosts.length > 0 || topPostsAnalysis) && (
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold">TOP příspěvky – {platformName}</h2>
          </div>
          {(topPostsAnalysis || canEdit) && (
            <div className="mb-5 p-4 bg-background/60 rounded-[15px] border border-border/50">
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">AI analýza</p>
                  <EditableSection
                    value={topPostsAnalysis || ""}
                    isEditing={editingSections.has(`${sectionPrefix}_top_posts_analysis`)}
                    onStartEdit={() => startEditing(`${sectionPrefix}_top_posts_analysis`)}
                    onSave={(v) => onSaveSection(`${sectionPrefix}_top_posts_analysis`, v)}
                    onCancel={() => stopEditing(`${sectionPrefix}_top_posts_analysis`)}
                    canEdit={canEdit}
                    placeholder={`AI analýza: Co nám tento kvartál fungovalo na ${platformName}...`}
                  />
                </div>
              </div>
            </div>
          )}
          {topPosts.length > 0 && <div>{postGrid(topPosts)}</div>}
        </Card>
      )}

      {/* Improve posts */}
      {(improvePosts.length > 0 || improvePostsAnalysis) && (
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-xl font-bold">Příspěvky, na kterých pracovat – {platformName}</h2>
          </div>
          {(improvePostsAnalysis || canEdit) && (
            <div className="mb-5 p-4 bg-background/60 rounded-[15px] border border-border/50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">AI analýza</p>
                  <EditableSection
                    value={improvePostsAnalysis || ""}
                    isEditing={editingSections.has(`${sectionPrefix}_improve_posts_analysis`)}
                    onStartEdit={() => startEditing(`${sectionPrefix}_improve_posts_analysis`)}
                    onSave={(v) => onSaveSection(`${sectionPrefix}_improve_posts_analysis`, v)}
                    onCancel={() => stopEditing(`${sectionPrefix}_improve_posts_analysis`)}
                    canEdit={canEdit}
                    placeholder={`AI analýza: Co nám tento kvartál nefungovalo na ${platformName}...`}
                  />
                </div>
              </div>
            </div>
          )}
          {improvePosts.length > 0 && <div>{postGrid(improvePosts)}</div>}
        </Card>
      )}
    </>
  );
};

// ── Main Component ──

export const QuarterlyAdsInsightsContent = forwardRef<HTMLDivElement, QuarterlyAdsInsightsContentProps>(
  ({ insights: raw, canEdit = false, onSaveInsights, hasMetaPlatform, hasTiktokPlatform, reportId }, ref) => {
    const executiveSummary: Partial<QuarterlyStructuredInsights["executive_summary"]> = raw.executive_summary || {};
    const legacyIntroSource = [
      executiveSummary.media_insight,
      executiveSummary.top_result,
      executiveSummary.recommendation,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    const legacyIntro = legacyIntroSource
      ? legacyIntroSource
          .split(/(?<=[.!?])\s+/)
          .filter((sentence: string) => sentence.trim())
          .slice(0, 3)
          .join(" ")
      : "";

    const insights: QuarterlyStructuredInsights = {
      executive_summary: {
        intro:
          typeof executiveSummary.intro === "string" && executiveSummary.intro.trim().length > 0
            ? executiveSummary.intro
            : legacyIntro,
        media_insight: executiveSummary.media_insight || "",
        top_result: executiveSummary.top_result || "",
        recommendation: executiveSummary.recommendation || "",
      },
      goal_fulfillment: {
        goals_set: Array.isArray(raw.goal_fulfillment?.goals_set)
          ? raw.goal_fulfillment.goals_set
          : typeof raw.goal_fulfillment?.goals_set === "string" && raw.goal_fulfillment.goals_set
            ? (raw.goal_fulfillment.goals_set as string).split(/(?<=[.!?])\s+/).filter((s: string) => s.trim())
            : [],
        results: Array.isArray(raw.goal_fulfillment?.results)
          ? raw.goal_fulfillment.results
          : typeof raw.goal_fulfillment?.results === "string" && raw.goal_fulfillment.results
            ? (raw.goal_fulfillment.results as string).split(/(?<=[.!?])\s+/).filter((s: string) => s.trim())
            : [],
      },
      key_metrics: { spend: 0, reach: 0, frequency: 0, currency: "CZK", ...raw.key_metrics },
      detail_metrics: { cpm: 0, cpe: 0, cpv: 0, currency: "CZK", ...raw.detail_metrics },
      metrics_over_time: raw.metrics_over_time || "",
      metric_commentary: raw.metric_commentary || {},
      media_plan_comparison: raw.media_plan_comparison || null,
      community_management: { answered_comments: null, answered_dms: null, response_rate_24h: null, ...raw.community_management },
      brand_awareness: raw.brand_awareness || "",
      facebook_metrics: { spend: 0, reach: 0, frequency: 0, ...raw.facebook_metrics },
      facebook_detail_metrics: { cpm: 0, cpe: 0, cpv: 0, ...raw.facebook_detail_metrics },
      facebook_metrics_over_time: raw.facebook_metrics_over_time || "",
      facebook_top_posts_analysis: raw.facebook_top_posts_analysis || "",
      facebook_improve_posts_analysis: raw.facebook_improve_posts_analysis || "",
      facebook_top_posts: raw.facebook_top_posts || [],
      facebook_improve_posts: raw.facebook_improve_posts || [],
      instagram_metrics: { spend: 0, reach: 0, frequency: 0, ...raw.instagram_metrics },
      instagram_detail_metrics: { cpm: 0, cpe: 0, cpv: 0, ...raw.instagram_detail_metrics },
      instagram_metrics_over_time: raw.instagram_metrics_over_time || "",
      instagram_top_posts_analysis: raw.instagram_top_posts_analysis || "",
      instagram_improve_posts_analysis: raw.instagram_improve_posts_analysis || "",
      instagram_top_posts: raw.instagram_top_posts || [],
      instagram_improve_posts: raw.instagram_improve_posts || [],
      tiktok_metrics: { spend: 0, reach: 0, frequency: 0, ...raw.tiktok_metrics },
      tiktok_detail_metrics: { cpm: 0, cpe: 0, cpv: 0, ...raw.tiktok_detail_metrics },
      tiktok_metrics_over_time: raw.tiktok_metrics_over_time || "",
      tiktok_top_posts_analysis: raw.tiktok_top_posts_analysis || "",
      tiktok_improve_posts_analysis: raw.tiktok_improve_posts_analysis || "",
      tiktok_top_posts: raw.tiktok_top_posts || [],
      tiktok_improve_posts: raw.tiktok_improve_posts || [],
      followers: { facebook: null, instagram: null, tiktok: null, ...raw.followers },
      summary_success: { what_worked: [], top_results: [], ...raw.summary_success },
      summary_events: { what_happened: [], what_we_solved: [], threats_opportunities: [], ...raw.summary_events },
      learnings: { improving: [], focus_areas: [], changes: [], ...raw.learnings },
    };

    const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

    // Fetch linked campaign IDs and spaceId for the trend chart
    const [chartSpaceId, setChartSpaceId] = useState<string | null>(null);
    const [chartCampaignIds, setChartCampaignIds] = useState<string[]>([]);
    const [chartEntityTypes, setChartEntityTypes] = useState<string[]>([]);

    useEffect(() => {
      if (!reportId) return;
      const fetchChartData = async () => {
        const { data: report } = await supabase
          .from("reports")
          .select("space_id")
          .eq("id", reportId)
          .single();
        if (!report) return;
        setChartSpaceId(report.space_id);

        const entityTypes: string[] = [];
        const campaignTextIds: string[] = [];

        const { data: metaLinks } = await supabase
          .from("report_campaigns")
          .select("brand_campaign_id")
          .eq("report_id", reportId);
        if (metaLinks && metaLinks.length > 0) {
          const ids = metaLinks.map(l => l.brand_campaign_id);
          const { data: campaigns } = await supabase
            .from("brand_campaigns" as any)
            .select("campaign_id")
            .in("id", ids);
          if (campaigns) {
            campaignTextIds.push(...campaigns.map((c: any) => c.campaign_id));
          }
          entityTypes.push("meta_campaign");
        }

        const { data: tiktokLinks } = await supabase
          .from("report_tiktok_campaigns")
          .select("tiktok_campaign_id")
          .eq("report_id", reportId);
        if (tiktokLinks && tiktokLinks.length > 0) {
          const ids = tiktokLinks.map(l => l.tiktok_campaign_id);
          const { data: campaigns } = await supabase
            .from("tiktok_campaigns" as any)
            .select("campaign_id")
            .in("id", ids);
          if (campaigns) {
            campaignTextIds.push(...campaigns.map((c: any) => c.campaign_id));
          }
          entityTypes.push("tiktok_campaign");
        }

        setChartCampaignIds([...new Set(campaignTextIds)]);
        setChartEntityTypes(entityTypes);
      };
      fetchChartData();
    }, [reportId]);

    // Text states
    const [introSummary, setIntroSummary] = useState(insights.executive_summary.intro || "");
    const [mediaInsight, setMediaInsight] = useState(insights.executive_summary.media_insight);
    const [topResult, setTopResult] = useState(insights.executive_summary.top_result);
    const [recommendation, setRecommendation] = useState(insights.executive_summary.recommendation);
    const [goalsSet, setGoalsSet] = useState<string[]>(insights.goal_fulfillment.goals_set);
    const [results, setResults] = useState<string[]>(insights.goal_fulfillment.results);
    const [metricsOverTime, setMetricsOverTime] = useState(insights.metrics_over_time);
    const [brandAwareness, setBrandAwareness] = useState(insights.brand_awareness);
    const [fbMetricsOverTime, setFbMetricsOverTime] = useState(insights.facebook_metrics_over_time);
    const [igMetricsOverTime, setIgMetricsOverTime] = useState(insights.instagram_metrics_over_time);
    const [tkMetricsOverTime, setTkMetricsOverTime] = useState(insights.tiktok_metrics_over_time);

    // List states
    const [whatWorked, setWhatWorked] = useState(insights.summary_success.what_worked);
    const [topResults, setTopResults] = useState(insights.summary_success.top_results);
    const [whatHappened, setWhatHappened] = useState(insights.summary_events.what_happened);
    const [whatWeSolved, setWhatWeSolved] = useState(insights.summary_events.what_we_solved);
    const [threatsOpps, setThreatsOpps] = useState(insights.summary_events.threats_opportunities);
    const [improving, setImproving] = useState(insights.learnings.improving);
    const [focusAreas, setFocusAreas] = useState(insights.learnings.focus_areas);
    const [changes, setChanges] = useState(insights.learnings.changes);

    const startEditing = (s: string) => setEditingSections((prev) => new Set([...prev, s]));
    const stopEditing = (s: string) => setEditingSections((prev) => { const next = new Set(prev); next.delete(s); return next; });

    const handleSaveSection = async (section: string, value: string) => {
      const setters: Record<string, (v: string) => void> = {
        intro: setIntroSummary, media_insight: setMediaInsight, top_result: setTopResult, recommendation: setRecommendation,
        metrics_over_time: setMetricsOverTime, brand_awareness: setBrandAwareness,
        facebook_metrics_over_time: setFbMetricsOverTime,
        instagram_metrics_over_time: setIgMetricsOverTime,
        tiktok_metrics_over_time: setTkMetricsOverTime,
      };
      setters[section]?.(value);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<QuarterlyStructuredInsights> = {};
        if (["intro", "media_insight", "top_result", "recommendation"].includes(section)) {
          updates.executive_summary = {
            intro: section === "intro" ? value : introSummary,
            media_insight: section === "media_insight" ? value : mediaInsight,
            top_result: section === "top_result" ? value : topResult,
            recommendation: section === "recommendation" ? value : recommendation,
          };
        } else if (section === "metrics_over_time") updates.metrics_over_time = value;
        else if (section === "brand_awareness") updates.brand_awareness = value;
        else if (section === "facebook_metrics_over_time") updates.facebook_metrics_over_time = value;
        else if (section === "instagram_metrics_over_time") updates.instagram_metrics_over_time = value;
        else if (section === "tiktok_metrics_over_time") updates.tiktok_metrics_over_time = value;
        // Handle platform analysis sections
        else if (section.endsWith("_top_posts_analysis") || section.endsWith("_improve_posts_analysis")) {
          (updates as any)[section] = value;
        }
        await onSaveInsights(updates);
      }
    };

    const handleSaveListSection = async (section: string, items: string[]) => {
      const setters: Record<string, (v: string[]) => void> = {
        what_worked: setWhatWorked, top_results: setTopResults,
        what_happened: setWhatHappened, what_we_solved: setWhatWeSolved, threats_opportunities: setThreatsOpps,
        improving: setImproving, focus_areas: setFocusAreas, changes: setChanges,
        goals_set: setGoalsSet, results: setResults,
      };
      setters[section]?.(items);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<QuarterlyStructuredInsights> = {};
        if (["goals_set", "results"].includes(section)) {
          updates.goal_fulfillment = {
            goals_set: section === "goals_set" ? items : goalsSet,
            results: section === "results" ? items : results,
          };
        } else if (["what_worked", "top_results"].includes(section)) {
          updates.summary_success = {
            what_worked: section === "what_worked" ? items : whatWorked,
            top_results: section === "top_results" ? items : topResults,
          };
        } else if (["what_happened", "what_we_solved", "threats_opportunities"].includes(section)) {
          updates.summary_events = {
            what_happened: section === "what_happened" ? items : whatHappened,
            what_we_solved: section === "what_we_solved" ? items : whatWeSolved,
            threats_opportunities: section === "threats_opportunities" ? items : threatsOpps,
          };
        } else if (["improving", "focus_areas", "changes"].includes(section)) {
          updates.learnings = {
            improving: section === "improving" ? items : improving,
            focus_areas: section === "focus_areas" ? items : focusAreas,
            changes: section === "changes" ? items : changes,
          };
        }
        await onSaveInsights(updates);
      }
    };

    const handleSaveCommunityField = async (field: string, value: number | null) => {
      const updated = { ...insights.community_management, [field]: value };
      if (onSaveInsights) await onSaveInsights({ community_management: updated });
    };

    const handleSaveFollowersField = async (platform: string, value: number | null) => {
      const updated = { ...insights.followers, [platform]: value };
      if (onSaveInsights) await onSaveInsights({ followers: updated });
    };

    const cur = insights.key_metrics.currency || "CZK";
    const hasFacebook = hasMetaPlatform ?? (insights.facebook_metrics.spend > 0 || insights.facebook_metrics.reach > 0 || (insights.facebook_top_posts || []).length > 0);
    const hasInstagram = hasMetaPlatform ?? (insights.instagram_metrics.spend > 0 || insights.instagram_metrics.reach > 0 || (insights.instagram_top_posts || []).length > 0);
    const hasTiktokData = hasTiktokPlatform ?? (insights.tiktok_metrics.spend > 0 || insights.tiktok_metrics.reach > 0 || (insights.tiktok_top_posts || []).length > 0);

    // Media plan comparison helpers
    const mp = insights.media_plan_comparison;
    const totalSpend = insights.facebook_metrics.spend + insights.instagram_metrics.spend + insights.tiktok_metrics.spend;
    const fbSpendRatio = totalSpend > 0 ? insights.facebook_metrics.spend / totalSpend : (hasFacebook ? 0.33 : 0);
    const igSpendRatio = totalSpend > 0 ? insights.instagram_metrics.spend / totalSpend : (hasInstagram ? 0.33 : 0);
    const tkSpendRatio = totalSpend > 0 ? insights.tiktok_metrics.spend / totalSpend : (hasTiktokData ? 0.33 : 0);

    const totalReach = insights.facebook_metrics.reach + insights.instagram_metrics.reach + insights.tiktok_metrics.reach;
    const fbReachRatio = totalReach > 0 ? insights.facebook_metrics.reach / totalReach : fbSpendRatio;
    const igReachRatio = totalReach > 0 ? insights.instagram_metrics.reach / totalReach : igSpendRatio;
    const tkReachRatio = totalReach > 0 ? insights.tiktok_metrics.reach / totalReach : tkSpendRatio;

    const getSpendPlan = (ratio: number) => mp?.budget && mp.budget.planned > 0 ? {
      planned: mp.budget.planned * ratio,
      actual: mp.budget.actual * ratio,
      plannedLabel: formatCurrencySimple(mp.budget.planned * ratio, cur),
    } : undefined;

    const getReachPlan = (ratio: number) => mp?.reach && mp.reach.planned > 0 ? {
      planned: mp.reach.planned * ratio,
      actual: mp.reach.actual * ratio,
      plannedLabel: formatNumber(Math.round(mp.reach.planned * ratio)),
    } : undefined;

    const getFrequencyPlan = () => mp?.frequency && mp.frequency.planned > 0 ? {
      planned: mp.frequency.planned,
      actual: mp.frequency.actual,
      plannedLabel: mp.frequency.planned.toFixed(2),
    } : undefined;

    return (
      <div ref={ref} className="space-y-8" style={{ backgroundColor: "#E9E9E9" }}>
        {/* 1. Executive Summary */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
          {(introSummary || canEdit) && (
            <div className="mb-5">
              <EditableSection value={introSummary} isEditing={editingSections.has("intro")} onStartEdit={() => startEditing("intro")} onSave={(v) => handleSaveSection("intro", v)} onCancel={() => stopEditing("intro")} canEdit={canEdit} placeholder="Úvodní shrnutí kvartálu..." />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Eye className="w-5 h-5 text-accent-blue" /><span className="font-bold text-sm uppercase">Media poznatek</span></div>
              <EditableSection value={mediaInsight} isEditing={editingSections.has("media_insight")} onStartEdit={() => startEditing("media_insight")} onSave={(v) => handleSaveSection("media_insight", v)} onCancel={() => stopEditing("media_insight")} canEdit={canEdit} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Star className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">TOP výsledek</span></div>
              <EditableSection value={topResult} isEditing={editingSections.has("top_result")} onStartEdit={() => startEditing("top_result")} onSave={(v) => handleSaveSection("top_result", v)} onCancel={() => stopEditing("top_result")} canEdit={canEdit} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Doporučení pro zlepšení</span></div>
              <EditableSection value={recommendation} isEditing={editingSections.has("recommendation")} onStartEdit={() => startEditing("recommendation")} onSave={(v) => handleSaveSection("recommendation", v)} onCancel={() => stopEditing("recommendation")} canEdit={canEdit} />
            </Card>
          </div>
        </Card>

        {/* 2. Plnění cílů */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Plnění cílů</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Stanovené cíle / Nové zavedení / Změna</span></div>
              <EditableListSection items={goalsSet} isEditing={editingSections.has("goals_set")} onStartEdit={() => startEditing("goals_set")} onSave={(items) => handleSaveListSection("goals_set", items)} onCancel={() => stopEditing("goals_set")} canEdit={canEdit} bulletColor="text-accent-orange" placeholder="Stanovené cíle za kvartál..." />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">Plnění cílů / Výsledky změny</span></div>
              <EditableListSection items={results} isEditing={editingSections.has("results")} onStartEdit={() => startEditing("results")} onSave={(items) => handleSaveListSection("results", items)} onCancel={() => stopEditing("results")} canEdit={canEdit} bulletColor="text-accent-green" placeholder="Výsledky a plnění..." />
            </Card>
          </div>
        </Card>

        {/* 3. Celkové klíčové metriky */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Klíčové metriky
            <span className="flex items-center gap-1 ml-2">
              {hasFacebook && <FacebookIcon />}
              {hasInstagram && <InstagramIcon />}
              {hasTiktokData && <TiktokIcon />}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricTile title="Spend" value={formatCurrency(insights.key_metrics.spend, cur)} icon={Wallet} accentColor="orange" />
            <MetricTile title="Reach" value={formatNumber(insights.key_metrics.reach)} icon={Users} accentColor="blue" />
            <MetricTile title="Frequency" value={insights.key_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
          </div>
        </Card>

        {/* 4. Celkové detailní metriky */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Detailní metriky
            <span className="flex items-center gap-1 ml-2">
              {hasFacebook && <FacebookIcon />}
              {hasInstagram && <InstagramIcon />}
              {hasTiktokData && <TiktokIcon />}
            </span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricTile title="CPM" value={formatCurrency(insights.detail_metrics.cpm, cur)} icon={Wallet} accentColor="orange" />
            <MetricTile title="CPE" value={formatCurrency(insights.detail_metrics.cpe, cur)} icon={Wallet} accentColor="orange" />
            <MetricTile title="CPV" value={formatCurrency(insights.detail_metrics.cpv, cur)} icon={Wallet} accentColor="orange" />
          </div>
        </Card>

        {/* 5. Celkový vývoj metrik v čase */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Vývoj metrik v čase</h2>
          <EditableSection
            value={metricsOverTime}
            isEditing={editingSections.has("metrics_over_time")}
            onStartEdit={() => startEditing("metrics_over_time")}
            onSave={(v) => handleSaveSection("metrics_over_time", v)}
            onCancel={() => stopEditing("metrics_over_time")}
            canEdit={canEdit}
            placeholder="AI popis vývoje metrik v průběhu kvartálu..."
          />
        </Card>

        {/* 6. Community Management */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Community Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><MessageCircle className="w-5 h-5 text-accent-blue" /><span className="font-medium text-sm uppercase text-muted-foreground">Zodpovězené komentáře</span></div>
              <EditableNumberField value={insights.community_management.answered_comments} label="Komentáře" canEdit={canEdit} onSave={(v) => handleSaveCommunityField("answered_comments", v)} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><Mail className="w-5 h-5 text-accent-green" /><span className="font-medium text-sm uppercase text-muted-foreground">Zodpovězené DMs</span></div>
              <EditableNumberField value={insights.community_management.answered_dms} label="DMs" canEdit={canEdit} onSave={(v) => handleSaveCommunityField("answered_dms", v)} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-accent-orange" /><span className="font-medium text-sm uppercase text-muted-foreground">% odpovědí do 24h</span></div>
              <EditableNumberField value={insights.community_management.response_rate_24h} label="%" canEdit={canEdit} onSave={(v) => handleSaveCommunityField("response_rate_24h", v)} />
            </Card>
          </div>
        </Card>

        {/* 7. Brand Awareness */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Vliv na Brand Awareness</h2>
          <EditableSection
            value={brandAwareness}
            isEditing={editingSections.has("brand_awareness")}
            onStartEdit={() => startEditing("brand_awareness")}
            onSave={(v) => handleSaveSection("brand_awareness", v)}
            onCancel={() => stopEditing("brand_awareness")}
            canEdit={canEdit}
            placeholder="AI analýza vlivu na povědomí o značce..."
          />
        </Card>

        {/* Platform Sections with metrics, commentary, plan comparison, top/improve posts with analysis */}
        <PlatformSection
          icon={<FacebookIcon />}
          platformName="Facebook"
          metrics={insights.facebook_metrics}
          detailMetrics={insights.facebook_detail_metrics}
          metricsOverTime={fbMetricsOverTime}
          metricCommentaryKey={insights.metric_commentary?.facebook_key}
          metricCommentaryDetail={insights.metric_commentary?.facebook_detail}
          topPostsAnalysis={insights.facebook_top_posts_analysis}
          improvePostsAnalysis={insights.facebook_improve_posts_analysis}
          topPosts={insights.facebook_top_posts}
          improvePosts={insights.facebook_improve_posts}
          cur={cur}
          canEdit={canEdit}
          editingSections={editingSections}
          startEditing={startEditing}
          stopEditing={stopEditing}
          onSaveSection={handleSaveSection}
          sectionPrefix="facebook"
          getSpendPlan={getSpendPlan(fbSpendRatio)}
          getReachPlan={getReachPlan(fbReachRatio)}
          getFrequencyPlan={getFrequencyPlan()}
          chartSpaceId={chartSpaceId}
          chartCampaignIds={chartCampaignIds}
          chartEntityTypes={chartEntityTypes}
        />

        <PlatformSection
          icon={<InstagramIcon />}
          platformName="Instagram"
          metrics={insights.instagram_metrics}
          detailMetrics={insights.instagram_detail_metrics}
          metricsOverTime={igMetricsOverTime}
          metricCommentaryKey={insights.metric_commentary?.instagram_key}
          metricCommentaryDetail={insights.metric_commentary?.instagram_detail}
          topPostsAnalysis={insights.instagram_top_posts_analysis}
          improvePostsAnalysis={insights.instagram_improve_posts_analysis}
          topPosts={insights.instagram_top_posts}
          improvePosts={insights.instagram_improve_posts}
          cur={cur}
          canEdit={canEdit}
          editingSections={editingSections}
          startEditing={startEditing}
          stopEditing={stopEditing}
          onSaveSection={handleSaveSection}
          sectionPrefix="instagram"
          getSpendPlan={getSpendPlan(igSpendRatio)}
          getReachPlan={getReachPlan(igReachRatio)}
          getFrequencyPlan={getFrequencyPlan()}
          chartSpaceId={chartSpaceId}
          chartCampaignIds={chartCampaignIds}
          chartEntityTypes={chartEntityTypes}
        />

        <PlatformSection
          icon={<TiktokIcon />}
          platformName="TikTok"
          metrics={insights.tiktok_metrics}
          detailMetrics={insights.tiktok_detail_metrics}
          metricsOverTime={tkMetricsOverTime}
          metricCommentaryKey={insights.metric_commentary?.tiktok_key}
          metricCommentaryDetail={insights.metric_commentary?.tiktok_detail}
          topPostsAnalysis={insights.tiktok_top_posts_analysis}
          improvePostsAnalysis={insights.tiktok_improve_posts_analysis}
          topPosts={insights.tiktok_top_posts}
          improvePosts={insights.tiktok_improve_posts}
          cur={cur}
          canEdit={canEdit}
          editingSections={editingSections}
          startEditing={startEditing}
          stopEditing={stopEditing}
          onSaveSection={handleSaveSection}
          sectionPrefix="tiktok"
          getSpendPlan={getSpendPlan(tkSpendRatio)}
          getReachPlan={getReachPlan(tkReachRatio)}
          getFrequencyPlan={getFrequencyPlan()}
          chartSpaceId={chartSpaceId}
          chartCampaignIds={chartCampaignIds}
          chartEntityTypes={chartEntityTypes}
        />

        {/* Followers */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Followers</h2>
          {(() => {
            const visiblePlatforms = [
              hasFacebook ? "facebook" : null,
              hasInstagram ? "instagram" : null,
              hasTiktokData ? "tiktok" : null,
            ].filter(Boolean);
            const cols = visiblePlatforms.length === 3 ? "md:grid-cols-3" : visiblePlatforms.length === 2 ? "md:grid-cols-2" : "";
            return (
              <div className={`grid grid-cols-1 gap-6 ${cols}`}>
                {(hasFacebook || insights.followers.facebook != null) && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
                    <FacebookIcon /><span className="text-sm font-medium text-muted-foreground uppercase">Facebook</span>
                    <EditableNumberField value={insights.followers.facebook} label="Facebook" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("facebook", v)} />
                  </Card>
                )}
                {(hasInstagram || insights.followers.instagram != null) && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
                    <InstagramIcon /><span className="text-sm font-medium text-muted-foreground uppercase">Instagram</span>
                    <EditableNumberField value={insights.followers.instagram} label="Instagram" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("instagram", v)} />
                  </Card>
                )}
                {(hasTiktokData || insights.followers.tiktok != null) && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
                    <TiktokIcon /><span className="text-sm font-medium text-muted-foreground uppercase">TikTok</span>
                    <EditableNumberField value={insights.followers.tiktok} label="TikTok" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("tiktok", v)} />
                  </Card>
                )}
              </div>
            );
          })()}
        </Card>

        {/* Shrnutí: Co se povedlo */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Shrnutí</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 rounded-[20px] border-accent-green">
              <h3 className="font-bold text-accent-green mb-3 flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Co fungovalo</h3>
              <EditableListSection items={whatWorked} isEditing={editingSections.has("what_worked")} onStartEdit={() => startEditing("what_worked")} onSave={(items) => handleSaveListSection("what_worked", items)} onCancel={() => stopEditing("what_worked")} canEdit={canEdit} bulletColor="text-accent-green" />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-blue">
              <h3 className="font-bold text-accent-blue mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> TOP výsledky</h3>
              <EditableListSection items={topResults} isEditing={editingSections.has("top_results")} onStartEdit={() => startEditing("top_results")} onSave={(items) => handleSaveListSection("top_results", items)} onCancel={() => stopEditing("top_results")} canEdit={canEdit} bulletColor="text-accent-blue" />
            </Card>
          </div>
        </Card>

        {/* Shrnutí: Co se dělo */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Shrnutí – Co se dělo</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 rounded-[20px] border-border">
              <h3 className="font-bold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Co se dělo</h3>
              <EditableListSection items={whatHappened} isEditing={editingSections.has("what_happened")} onStartEdit={() => startEditing("what_happened")} onSave={(items) => handleSaveListSection("what_happened", items)} onCancel={() => stopEditing("what_happened")} canEdit={canEdit} />
            </Card>
            <Card className="p-6 rounded-[20px] border-border">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Co jsme řešili</h3>
              <EditableListSection items={whatWeSolved} isEditing={editingSections.has("what_we_solved")} onStartEdit={() => startEditing("what_we_solved")} onSave={(items) => handleSaveListSection("what_we_solved", items)} onCancel={() => stopEditing("what_we_solved")} canEdit={canEdit} />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-orange">
              <h3 className="font-bold text-accent-orange mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Hrozby a příležitosti</h3>
              <EditableListSection items={threatsOpps} isEditing={editingSections.has("threats_opportunities")} onStartEdit={() => startEditing("threats_opportunities")} onSave={(items) => handleSaveListSection("threats_opportunities", items)} onCancel={() => stopEditing("threats_opportunities")} canEdit={canEdit} bulletColor="text-accent-orange" />
            </Card>
          </div>
        </Card>

        {/* Learnings */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Learnings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 rounded-[20px] border-accent-green">
              <h3 className="font-bold text-accent-green mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Co zlepšujeme</h3>
              <EditableListSection items={improving} isEditing={editingSections.has("improving")} onStartEdit={() => startEditing("improving")} onSave={(items) => handleSaveListSection("improving", items)} onCancel={() => stopEditing("improving")} canEdit={canEdit} bulletColor="text-accent-green" />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-blue">
              <h3 className="font-bold text-accent-blue mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Čemu se budeme věnovat</h3>
              <EditableListSection items={focusAreas} isEditing={editingSections.has("focus_areas")} onStartEdit={() => startEditing("focus_areas")} onSave={(items) => handleSaveListSection("focus_areas", items)} onCancel={() => stopEditing("focus_areas")} canEdit={canEdit} bulletColor="text-accent-blue" />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-orange">
              <h3 className="font-bold text-accent-orange mb-3 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Co změníme</h3>
              <EditableListSection items={changes} isEditing={editingSections.has("changes")} onStartEdit={() => startEditing("changes")} onSave={(items) => handleSaveListSection("changes", items)} onCancel={() => stopEditing("changes")} canEdit={canEdit} bulletColor="text-accent-orange" />
            </Card>
          </div>
        </Card>
      </div>
    );
  }
);

QuarterlyAdsInsightsContent.displayName = "QuarterlyAdsInsightsContent";
