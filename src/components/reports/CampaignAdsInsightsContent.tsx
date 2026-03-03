import { useState, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TranslatedText } from "@/components/ui/TranslatedText";
import { MetricTile } from "./MetricTile";
import { formatCurrencySimple, formatCurrency } from "@/lib/currencyUtils";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Target, Star, DollarSign, Users, Pencil, Save, X,
  BarChart3, MessageCircle, Mail, Clock, Eye, TrendingUp,
  ThumbsUp, Lightbulb, CheckCircle, Zap, Play, MousePointer,
  UserCheck, Award, ClipboardList,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ── Types ──

interface PostData {
  name: string;
  spend: number;
  impressions: number;
  reach?: number;
  clicks: number;
  ctr: number;
  thumbnail_url?: string;
  reason?: string;
}

export interface CampaignStructuredInsights {
  executive_summary: { media_insight: string; top_result: string; recommendation: string };
  goal_fulfillment: { goals_set: string; results: string };
  metric_commentary?: { meta_key?: string; meta_detail?: string; tiktok_key?: string; tiktok_detail?: string };
  media_plan_comparison?: {
    budget?: { planned: number; actual: number };
    impressions?: { planned: number; actual: number };
    reach?: { planned: number; actual: number };
    cpm?: { planned: number; actual: number };
    frequency?: { planned: number; actual: number };
  } | null;
  meta_key_metrics: { spend: number; reach: number; frequency: number; currency: string };
  meta_detail_metrics: { thruplay_rate: number; view_rate_3s: number; avg_watch_time: number };
  tiktok_key_metrics: { spend: number; reach: number; frequency: number; currency: string };
  tiktok_detail_metrics: { thruplay_rate: number; view_rate_3s: number; avg_watch_time: number };
  audience_demographics?: { category: string; facebook: number; instagram: number; tiktok: number }[];
  target_audience: string;
  content_analysis?: {
    creative_comparison: string;
    platform_performance: string;
    improvement_suggestions: string;
  };
  top_content: PostData[];
  community_management: { answered_comments: number | null; answered_dms: number | null; response_rate_24h: number | null };
  brand_awareness: string;
  learnings: { what_worked: string[]; what_to_improve: string[]; what_to_test: string[] };
}

interface CampaignAdsInsightsContentProps {
  insights: CampaignStructuredInsights;
  canEdit?: boolean;
  onSaveInsights?: (updates: Partial<CampaignStructuredInsights>) => Promise<void>;
  hasMetaPlatform?: boolean;
  hasTiktokPlatform?: boolean;
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

const EditableSection = ({
  value, isEditing, onStartEdit, onSave, onCancel, canEdit = false, placeholder = "Enter text...",
}: { value: string; isEditing: boolean; onStartEdit: () => void; onSave: (v: string) => void; onCancel: () => void; canEdit?: boolean; placeholder?: string }) => {
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

const EditableListSection = ({
  items, isEditing, onStartEdit, onSave, onCancel, canEdit = false, bulletColor = "text-foreground", placeholder = "Enter items...",
}: { items: string[]; isEditing: boolean; onStartEdit: () => void; onSave: (items: string[]) => void; onCancel: () => void; canEdit?: boolean; bulletColor?: string; placeholder?: string }) => {
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

const PostCard = ({ post }: { post: PostData }) => (
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
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground"><DollarSign className="w-3 h-3" /><span>{formatCurrencySimple(post.spend || 0, "CZK")}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><Eye className="w-3 h-3" /><span>{formatNumber(post.impressions)}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><MousePointer className="w-3 h-3" /><span>{formatNumber(post.clicks)}</span></div>
        <div className="flex items-center gap-1 text-muted-foreground"><TrendingUp className="w-3 h-3" /><span>{post.ctr?.toFixed(2) || 0}%</span></div>
      </div>
    </div>
  </Card>
);

const postGrid = (posts: PostData[]) => (
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

// ── Media Plan Comparison ──

const MediaPlanComparisonRow = ({ label, planned, actual, format = "number" }: { label: string; planned: number; actual: number; format?: "number" | "currency" | "percent" }) => {
  const pct = planned > 0 ? (actual / planned) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  const isOver = pct > 100;
  const formatVal = (v: number) => {
    if (format === "currency") return formatCurrencySimple(v, "CZK");
    if (format === "percent") return v.toFixed(2);
    return formatNumber(v);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("font-bold text-sm", isOver ? "text-accent-green" : pct >= 80 ? "text-foreground" : "text-accent-orange")}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <Progress value={clampedPct} className="h-2.5" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Plan: {formatVal(planned)}</span>
        <span>Skutečnost: {formatVal(actual)}</span>
      </div>
    </div>
  );
};

const MetricCommentary = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <div className="mt-3 p-3 bg-muted/40 rounded-[12px]">
      <p className="text-sm text-foreground leading-relaxed"><TranslatedText text={text} /></p>
    </div>
  );
};



export const CampaignAdsInsightsContent = forwardRef<HTMLDivElement, CampaignAdsInsightsContentProps>(
  ({ insights: raw, canEdit = false, onSaveInsights, hasMetaPlatform, hasTiktokPlatform }, ref) => {
    const d = (obj: any, defaults: any) => ({ ...defaults, ...obj });

    // Map legacy key_metrics / detail_metrics to platform-specific keys
    const rawAny = raw as any;
    const metaKeySource = raw.meta_key_metrics ?? rawAny.key_metrics;
    const metaDetailSource = raw.meta_detail_metrics ?? rawAny.detail_metrics;
    const tiktokKeySource = raw.tiktok_key_metrics ?? rawAny.tiktok_key_metrics;
    const tiktokDetailSource = raw.tiktok_detail_metrics ?? rawAny.tiktok_detail_metrics;

    const insights: CampaignStructuredInsights = {
      executive_summary: d(raw.executive_summary, { media_insight: "", top_result: "", recommendation: "" }),
      goal_fulfillment: d(raw.goal_fulfillment, { goals_set: "", results: "" }),
      metric_commentary: raw.metric_commentary || {},
      media_plan_comparison: raw.media_plan_comparison || null,
      meta_key_metrics: d(metaKeySource, { spend: 0, reach: 0, frequency: 0, currency: "CZK" }),
      meta_detail_metrics: d(metaDetailSource, { thruplay_rate: 0, view_rate_3s: 0, avg_watch_time: 0 }),
      tiktok_key_metrics: d(tiktokKeySource, { spend: 0, reach: 0, frequency: 0, currency: "CZK" }),
      tiktok_detail_metrics: d(tiktokDetailSource, { thruplay_rate: 0, view_rate_3s: 0, avg_watch_time: 0 }),
      audience_demographics: raw.audience_demographics || [],
      target_audience: raw.target_audience || "",
      content_analysis: raw.content_analysis || { creative_comparison: "", platform_performance: "", improvement_suggestions: "" },
      top_content: raw.top_content || [],
      community_management: d(raw.community_management, { answered_comments: null, answered_dms: null, response_rate_24h: null }),
      brand_awareness: raw.brand_awareness || "",
      learnings: d(raw.learnings, { what_worked: [], what_to_improve: [], what_to_test: [] }),
    };

    const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

    // Text states
    const [mediaInsight, setMediaInsight] = useState(insights.executive_summary.media_insight);
    const [topResult, setTopResult] = useState(insights.executive_summary.top_result);
    const [recommendation, setRecommendation] = useState(insights.executive_summary.recommendation);
    const [goalsSet, setGoalsSet] = useState(insights.goal_fulfillment.goals_set);
    const [results, setResults] = useState(insights.goal_fulfillment.results);
    const [targetAudience, setTargetAudience] = useState(insights.target_audience);
    const [brandAwareness, setBrandAwareness] = useState(insights.brand_awareness);

    // List states
    const [whatWorked, setWhatWorked] = useState(insights.learnings.what_worked);
    const [whatToImprove, setWhatToImprove] = useState(insights.learnings.what_to_improve);
    const [whatToTest, setWhatToTest] = useState(insights.learnings.what_to_test);

    const startEditing = (s: string) => setEditingSections((prev) => new Set([...prev, s]));
    const stopEditing = (s: string) => setEditingSections((prev) => { const next = new Set(prev); next.delete(s); return next; });

    const handleSaveSection = async (section: string, value: string) => {
      const setters: Record<string, (v: string) => void> = {
        media_insight: setMediaInsight, top_result: setTopResult, recommendation: setRecommendation,
        goals_set: setGoalsSet, results: setResults,
        target_audience: setTargetAudience, brand_awareness: setBrandAwareness,
      };
      setters[section]?.(value);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<CampaignStructuredInsights> = {};
        if (["media_insight", "top_result", "recommendation"].includes(section)) {
          updates.executive_summary = {
            media_insight: section === "media_insight" ? value : mediaInsight,
            top_result: section === "top_result" ? value : topResult,
            recommendation: section === "recommendation" ? value : recommendation,
          };
        } else if (["goals_set", "results"].includes(section)) {
          updates.goal_fulfillment = {
            goals_set: section === "goals_set" ? value : goalsSet,
            results: section === "results" ? value : results,
          };
        } else {
          (updates as any)[section] = value;
        }
        await onSaveInsights(updates);
      }
    };

    const handleSaveListSection = async (section: string, items: string[]) => {
      const setters: Record<string, (v: string[]) => void> = {
        what_worked: setWhatWorked, what_to_improve: setWhatToImprove, what_to_test: setWhatToTest,
      };
      setters[section]?.(items);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<CampaignStructuredInsights> = {};
        updates.learnings = {
          what_worked: section === "what_worked" ? items : whatWorked,
          what_to_improve: section === "what_to_improve" ? items : whatToImprove,
          what_to_test: section === "what_to_test" ? items : whatToTest,
        };
        await onSaveInsights(updates);
      }
    };

    const handleSaveCommunityField = async (field: string, value: number | null) => {
      const updated = { ...insights.community_management, [field]: value };
      if (onSaveInsights) await onSaveInsights({ community_management: updated });
    };

    const cur = insights.meta_key_metrics.currency || "CZK";
    const hasMeta = hasMetaPlatform ?? (insights.meta_key_metrics.spend > 0 || insights.meta_key_metrics.reach > 0);
    const hasTiktok = hasTiktokPlatform ?? (insights.tiktok_key_metrics.spend > 0 || insights.tiktok_key_metrics.reach > 0);

    return (
      <div ref={ref} className="space-y-8" style={{ backgroundColor: "#E9E9E9" }}>
        {/* 1. Executive Summary */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
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
              <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Stanovené cíle</span></div>
              <EditableSection value={goalsSet} isEditing={editingSections.has("goals_set")} onStartEdit={() => startEditing("goals_set")} onSave={(v) => handleSaveSection("goals_set", v)} onCancel={() => stopEditing("goals_set")} canEdit={canEdit} placeholder="Stanovené cíle kampaně..." />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">Plnění cílů</span></div>
              <EditableSection value={results} isEditing={editingSections.has("results")} onStartEdit={() => startEditing("results")} onSave={(v) => handleSaveSection("results", v)} onCancel={() => stopEditing("results")} canEdit={canEdit} placeholder="Výsledky a plnění..." />
            </Card>
          </div>
        </Card>

        {/* 3. Media Plan Comparison */}
        {insights.media_plan_comparison && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Plnění Media Plánu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {insights.media_plan_comparison.budget && insights.media_plan_comparison.budget.planned > 0 && (
                <MediaPlanComparisonRow label="Budget" planned={insights.media_plan_comparison.budget.planned} actual={insights.media_plan_comparison.budget.actual} format="currency" />
              )}
              {insights.media_plan_comparison.impressions && insights.media_plan_comparison.impressions.planned > 0 && (
                <MediaPlanComparisonRow label="Impressions" planned={insights.media_plan_comparison.impressions.planned} actual={insights.media_plan_comparison.impressions.actual} />
              )}
              {insights.media_plan_comparison.reach && insights.media_plan_comparison.reach.planned > 0 && (
                <MediaPlanComparisonRow label="Reach" planned={insights.media_plan_comparison.reach.planned} actual={insights.media_plan_comparison.reach.actual} />
              )}
              {insights.media_plan_comparison.cpm && insights.media_plan_comparison.cpm.planned > 0 && (
                <MediaPlanComparisonRow label="CPM" planned={insights.media_plan_comparison.cpm.planned} actual={insights.media_plan_comparison.cpm.actual} format="currency" />
              )}
              {insights.media_plan_comparison.frequency && insights.media_plan_comparison.frequency.planned > 0 && (
                <MediaPlanComparisonRow label="Frequency" planned={insights.media_plan_comparison.frequency.planned} actual={insights.media_plan_comparison.frequency.actual} format="percent" />
              )}
            </div>
          </Card>
        )}

        {/* 4. Klíčové metriky META */}
        {hasMeta && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/></svg>
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>
              Klíčové metriky META
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricTile title="Spend" value={formatCurrency(insights.meta_key_metrics.spend, cur)} icon={DollarSign} accentColor="orange" />
              <MetricTile title="Reach" value={formatNumber(insights.meta_key_metrics.reach)} icon={Users} accentColor="blue" />
              <MetricTile title="Frequency" value={insights.meta_key_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
            </div>
            <MetricCommentary text={insights.metric_commentary?.meta_key} />
          </Card>
        )}

        {/* 5. Detailní metriky META */}
        {hasMeta && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/></svg>
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>
              Detailní metriky META
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricTile title="ThruPlay Rate" value={formatPercent(insights.meta_detail_metrics.thruplay_rate)} icon={Play} accentColor="blue" />
              <MetricTile title="VV 3s Rate" value={formatPercent(insights.meta_detail_metrics.view_rate_3s)} icon={Eye} accentColor="blue" />
              <MetricTile title="Avg. Watch Time" value={`${insights.meta_detail_metrics.avg_watch_time.toFixed(1)}s`} icon={Clock} accentColor="blue" />
            </div>
            <MetricCommentary text={insights.metric_commentary?.meta_detail} />
          </Card>
        )}

        {/* 6. Klíčové metriky TikTok */}
        {hasTiktok && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 2.6-2.55c.27 0 .52.04.77.11v-3.16a5.74 5.74 0 0 0-.77-.05A5.72 5.72 0 0 0 4.14 15.3a5.73 5.73 0 0 0 5.72 5.72 5.73 5.73 0 0 0 5.72-5.72V9.33a7.58 7.58 0 0 0 4.42 1.42V7.58a4.27 4.27 0 0 1-3.4-1.76Z"/></svg>
              Klíčové metriky TikTok
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricTile title="Spend" value={formatCurrency(insights.tiktok_key_metrics.spend, cur)} icon={DollarSign} accentColor="orange" />
              <MetricTile title="Reach" value={formatNumber(insights.tiktok_key_metrics.reach)} icon={Users} accentColor="blue" />
              <MetricTile title="Frequency" value={insights.tiktok_key_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
            </div>
            <MetricCommentary text={insights.metric_commentary?.tiktok_key} />
          </Card>
        )}

        {/* 7. Detailní metriky TikTok */}
        {hasTiktok && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6a2.6 2.6 0 0 1 2.6-2.55c.27 0 .52.04.77.11v-3.16a5.74 5.74 0 0 0-.77-.05A5.72 5.72 0 0 0 4.14 15.3a5.73 5.73 0 0 0 5.72 5.72 5.73 5.73 0 0 0 5.72-5.72V9.33a7.58 7.58 0 0 0 4.42 1.42V7.58a4.27 4.27 0 0 1-3.4-1.76Z"/></svg>
              Detailní metriky TikTok
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <MetricTile title="ThruPlay Rate" value={formatPercent(insights.tiktok_detail_metrics.thruplay_rate)} icon={Play} accentColor="blue" />
              <MetricTile title="VV 3s Rate" value={formatPercent(insights.tiktok_detail_metrics.view_rate_3s)} icon={Eye} accentColor="blue" />
              <MetricTile title="Avg. Watch Time" value={`${insights.tiktok_detail_metrics.avg_watch_time.toFixed(1)}s`} icon={Clock} accentColor="blue" />
            </div>
            <MetricCommentary text={insights.metric_commentary?.tiktok_detail} />
          </Card>
        )}

        {/* 7. Oslovená cílová skupina */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Oslovená cílová skupina</h2>
          
          {/* Demographics bar chart */}
          {insights.audience_demographics && insights.audience_demographics.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">TOP {insights.audience_demographics.length} oslovené kategorie dle platformy</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.audience_demographics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatNumber(value), name === 'facebook' ? 'Facebook' : name === 'instagram' ? 'Instagram' : 'TikTok']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    />
                    <Legend formatter={(value: string) => value === 'facebook' ? 'Facebook' : value === 'instagram' ? 'Instagram' : 'TikTok'} />
                    <Bar dataKey="facebook" fill="#1877F2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="instagram" fill="#E4405F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tiktok" fill="#000000" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <EditableSection
            value={targetAudience}
            isEditing={editingSections.has("target_audience")}
            onStartEdit={() => startEditing("target_audience")}
            onSave={(v) => handleSaveSection("target_audience", v)}
            onCancel={() => stopEditing("target_audience")}
            canEdit={canEdit}
            placeholder="AI analýza oslovené cílové skupiny..."
          />
        </Card>

        {/* Content Analysis */}
        {(insights.content_analysis?.creative_comparison || insights.content_analysis?.platform_performance || insights.content_analysis?.improvement_suggestions) && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6" />
              Analýza kreativ
            </h2>
            <div className="flex gap-6">
              {/* Text content */}
              <div className="flex-1 space-y-4">
                {insights.content_analysis.creative_comparison && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-accent-blue" /><span className="font-bold text-sm uppercase">Porovnání vizuálů</span></div>
                    <p className="text-foreground leading-relaxed text-sm"><TranslatedText text={insights.content_analysis.creative_comparison} /></p>
                  </Card>
                )}
                {insights.content_analysis.platform_performance && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">Výkon dle platformy</span></div>
                    <p className="text-foreground leading-relaxed text-sm"><TranslatedText text={insights.content_analysis.platform_performance} /></p>
                  </Card>
                )}
                {insights.content_analysis.improvement_suggestions && (
                  <Card className="p-4 rounded-[15px] border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2"><Lightbulb className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Doporučení pro zlepšení</span></div>
                    <p className="text-foreground leading-relaxed text-sm"><TranslatedText text={insights.content_analysis.improvement_suggestions} /></p>
                  </Card>
                )}
              </div>
              {/* Top 2 creative previews */}
              {insights.top_content.length > 0 && (
                <div className="flex-shrink-0 w-[300px]">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Nejúspěšnější kreativy</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {insights.top_content.slice(0, 2).map((post, i) => (
                      <PostCard key={i} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* TOP 5 contentů */}
        {insights.top_content.length > 0 && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4">TOP 5 contentů za celou kampaň</h2>
            {postGrid(insights.top_content)}
          </Card>
        )}

        {/* 9. Community Management */}
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

        {/* 10. Brand Awareness */}
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

        {/* 11. Shrnutí & Learnings */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Shrnutí & Learnings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><ThumbsUp className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">Co se povedlo</span></div>
              <EditableListSection
                items={whatWorked} isEditing={editingSections.has("what_worked")}
                onStartEdit={() => startEditing("what_worked")}
                onSave={(items) => handleSaveListSection("what_worked", items)}
                onCancel={() => stopEditing("what_worked")}
                canEdit={canEdit} bulletColor="text-accent-green" placeholder="Body co se povedlo..."
              />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Co zlepšit</span></div>
              <EditableListSection
                items={whatToImprove} isEditing={editingSections.has("what_to_improve")}
                onStartEdit={() => startEditing("what_to_improve")}
                onSave={(items) => handleSaveListSection("what_to_improve", items)}
                onCancel={() => stopEditing("what_to_improve")}
                canEdit={canEdit} bulletColor="text-accent-orange" placeholder="Body co zlepšit..."
              />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-5 h-5 text-accent-blue" /><span className="font-bold text-sm uppercase">Co příště otestujeme</span></div>
              <EditableListSection
                items={whatToTest} isEditing={editingSections.has("what_to_test")}
                onStartEdit={() => startEditing("what_to_test")}
                onSave={(items) => handleSaveListSection("what_to_test", items)}
                onCancel={() => stopEditing("what_to_test")}
                canEdit={canEdit} bulletColor="text-accent-blue" placeholder="Body co otestovat..."
              />
            </Card>
          </div>
        </Card>
      </div>
    );
  }
);

CampaignAdsInsightsContent.displayName = "CampaignAdsInsightsContent";
