import { useState, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MetricTile } from "./MetricTile";
import { formatCurrencySimple, formatCurrency } from "@/lib/currencyUtils";
import {
  Target,
  Rocket,
  Star,
  DollarSign,
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
} from "lucide-react";


// Reuse from AdsAIInsightsContent
export interface MonthlyStructuredInsights {
  executive_summary: string;
  campaign_context: {
    mainGoal: string;
    actions: string;
    highlights: string;
  };
  goal_fulfillment: string;
  key_metrics: {
    spend: number;
    reach: number;
    frequency: number;
    currency: string;
  };
  metrics_over_time: string;
  community_management: {
    answered_comments: number | null;
    answered_dms: number | null;
    response_rate_24h: number | null;
  };
  brand_awareness: string;
  facebook_metrics: {
    spend: number;
    reach: number;
    frequency: number;
  };
  facebook_top_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
  }[];
  instagram_metrics: {
    spend: number;
    reach: number;
    frequency: number;
  };
  instagram_top_posts: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    thumbnail_url?: string;
  }[];
  followers: {
    facebook: number | null;
    instagram: number | null;
    tiktok: number | null;
  };
  learnings: {
    works: string[];
    threats_opportunities: string[];
    improvements: string[];
  };
}

interface MonthlyAdsInsightsContentProps {
  insights: MonthlyStructuredInsights;
  canEdit?: boolean;
  onSaveInsights?: (updates: Partial<MonthlyStructuredInsights>) => Promise<void>;
}

const formatNumber = (num: number): string => {
  if (num == null) return "-";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

// Editable text section
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
      <p className="text-foreground leading-relaxed whitespace-pre-line">{value || <span className="text-muted-foreground italic">{placeholder}</span>}</p>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onStartEdit} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0">
          <Pencil className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

// Editable list
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
          <li key={i} className="text-sm text-foreground flex items-start gap-2"><span className={bulletColor}>•</span>{item}</li>
        ))}
        {(!items || items.length === 0) && <li className="text-sm text-muted-foreground italic">{placeholder}</li>}
      </ul>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onStartEdit} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"><Pencil className="w-3 h-3" /></Button>
      )}
    </div>
  );
};

// Editable number input
const EditableNumberField = ({
  value, label, canEdit, onSave,
}: { value: number | null; label: string; canEdit: boolean; onSave: (v: number | null) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-24 h-8 rounded-[10px] border-foreground text-sm"
        />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { onSave(editValue ? Number(editValue) : null); setIsEditing(false); }}>
          <Save className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditValue(value?.toString() || ""); setIsEditing(false); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <span className="text-2xl font-bold text-foreground">{value != null ? formatNumber(value) : "-"}</span>
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0">
          <Pencil className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

const PostCard = ({ post }: { post: { name: string; spend: number; impressions: number; clicks: number; ctr: number; thumbnail_url?: string } }) => (
  <Card className="overflow-hidden rounded-[35px] border-foreground hover:shadow-lg transition-shadow">
    <div className="relative aspect-[9/12.8] bg-muted overflow-hidden">
      {post.thumbnail_url ? (
        <img
          src={post.thumbnail_url}
          alt={post.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.querySelector('.placeholder')?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`w-full h-full flex flex-col items-center justify-center gap-2 placeholder ${post.thumbnail_url ? "hidden absolute inset-0" : ""}`}>
        <Eye className="w-8 h-8 text-muted-foreground/30" />
      </div>
    </div>
    <div className="p-3 space-y-2">
      <span className="font-medium text-xs truncate block">{post.name}</span>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>{formatCurrencySimple(post.spend || 0, "CZK")}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>{formatNumber(post.impressions)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <MousePointer className="w-3 h-3" />
          <span>{formatNumber(post.clicks)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>{post.ctr?.toFixed(2) || 0}%</span>
        </div>
      </div>
    </div>
  </Card>
);

// Platform icon components
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#E4405F"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
);
const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
);

export const MonthlyAdsInsightsContent = forwardRef<HTMLDivElement, MonthlyAdsInsightsContentProps>(
  ({ insights: raw, canEdit = false, onSaveInsights }, ref) => {
    const insights: MonthlyStructuredInsights = {
      executive_summary: raw.executive_summary || "",
      campaign_context: raw.campaign_context || { mainGoal: "", actions: "", highlights: "" },
      goal_fulfillment: raw.goal_fulfillment || "",
      key_metrics: { spend: 0, reach: 0, frequency: 0, currency: "CZK", ...raw.key_metrics },
      metrics_over_time: raw.metrics_over_time || "",
      community_management: { answered_comments: null, answered_dms: null, response_rate_24h: null, ...raw.community_management },
      brand_awareness: raw.brand_awareness || "",
      facebook_metrics: { spend: 0, reach: 0, frequency: 0, ...raw.facebook_metrics },
      facebook_top_posts: raw.facebook_top_posts || [],
      instagram_metrics: { spend: 0, reach: 0, frequency: 0, ...raw.instagram_metrics },
      instagram_top_posts: raw.instagram_top_posts || [],
      followers: { facebook: null, instagram: null, tiktok: null, ...raw.followers },
      learnings: { works: [], threats_opportunities: [], improvements: [], ...raw.learnings },
    };

    const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
    const [executiveSummary, setExecutiveSummary] = useState(insights.executive_summary);
    const [goalFulfillment, setGoalFulfillment] = useState(insights.goal_fulfillment);
    const [metricsOverTime, setMetricsOverTime] = useState(insights.metrics_over_time);
    const [brandAwareness, setBrandAwareness] = useState(insights.brand_awareness);
    const [mainGoal, setMainGoal] = useState(insights.campaign_context.mainGoal);
    const [actions, setActions] = useState(insights.campaign_context.actions);
    const [highlights, setHighlights] = useState(insights.campaign_context.highlights);
    const [worksItems, setWorksItems] = useState(insights.learnings.works);
    const [threatsItems, setThreatsItems] = useState(insights.learnings.threats_opportunities);
    const [improvementsItems, setImprovementsItems] = useState(insights.learnings.improvements);

    const startEditing = (s: string) => setEditingSections((prev) => new Set([...prev, s]));
    const stopEditing = (s: string) => setEditingSections((prev) => { const next = new Set(prev); next.delete(s); return next; });

    const handleSaveSection = async (section: string, value: string) => {
      const setters: Record<string, (v: string) => void> = {
        executive_summary: setExecutiveSummary,
        goal_fulfillment: setGoalFulfillment,
        metrics_over_time: setMetricsOverTime,
        brand_awareness: setBrandAwareness,
        mainGoal: setMainGoal,
        actions: setActions,
        highlights: setHighlights,
      };
      setters[section]?.(value);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<MonthlyStructuredInsights> = {};
        if (section === "executive_summary") updates.executive_summary = value;
        else if (section === "goal_fulfillment") updates.goal_fulfillment = value;
        else if (section === "metrics_over_time") updates.metrics_over_time = value;
        else if (section === "brand_awareness") updates.brand_awareness = value;
        else if (["mainGoal", "actions", "highlights"].includes(section)) {
          updates.campaign_context = {
            mainGoal: section === "mainGoal" ? value : mainGoal,
            actions: section === "actions" ? value : actions,
            highlights: section === "highlights" ? value : highlights,
          };
        }
        await onSaveInsights(updates);
      }
    };

    const handleSaveListSection = async (section: string, items: string[]) => {
      if (section === "learnings_works") setWorksItems(items);
      if (section === "learnings_threats") setThreatsItems(items);
      if (section === "learnings_improvements") setImprovementsItems(items);
      stopEditing(section);

      if (onSaveInsights) {
        await onSaveInsights({
          learnings: {
            works: section === "learnings_works" ? items : worksItems,
            threats_opportunities: section === "learnings_threats" ? items : threatsItems,
            improvements: section === "learnings_improvements" ? items : improvementsItems,
          },
        });
      }
    };

    const handleSaveCommunityField = async (field: string, value: number | null) => {
      const updated = { ...insights.community_management, [field]: value };
      if (onSaveInsights) {
        await onSaveInsights({ community_management: updated });
      }
    };

    const handleSaveFollowersField = async (platform: string, value: number | null) => {
      const updated = { ...insights.followers, [platform]: value };
      if (onSaveInsights) {
        await onSaveInsights({ followers: updated });
      }
    };

    const cur = insights.key_metrics.currency || "CZK";

    return (
      <div ref={ref} className="space-y-8" style={{ backgroundColor: "#E9E9E9" }}>
        {/* 1. Executive Summary */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
          <EditableSection
            value={executiveSummary}
            isEditing={editingSections.has("executive_summary")}
            onStartEdit={() => startEditing("executive_summary")}
            onSave={(v) => handleSaveSection("executive_summary", v)}
            onCancel={() => stopEditing("executive_summary")}
            canEdit={canEdit}
            placeholder="AI vygeneruje executive summary..."
          />
          {/* Campaign Context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Target className="w-5 h-5 text-accent-orange" /><span className="font-bold text-sm uppercase">Hlavní cíl</span></div>
              <EditableSection value={mainGoal} isEditing={editingSections.has("mainGoal")} onStartEdit={() => startEditing("mainGoal")} onSave={(v) => handleSaveSection("mainGoal", v)} onCancel={() => stopEditing("mainGoal")} canEdit={canEdit} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Rocket className="w-5 h-5 text-accent-blue" /><span className="font-bold text-sm uppercase">Co jsme udělali</span></div>
              <EditableSection value={actions} isEditing={editingSections.has("actions")} onStartEdit={() => startEditing("actions")} onSave={(v) => handleSaveSection("actions", v)} onCancel={() => stopEditing("actions")} canEdit={canEdit} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Star className="w-5 h-5 text-accent-green" /><span className="font-bold text-sm uppercase">Highlights</span></div>
              <EditableSection value={highlights} isEditing={editingSections.has("highlights")} onStartEdit={() => startEditing("highlights")} onSave={(v) => handleSaveSection("highlights", v)} onCancel={() => stopEditing("highlights")} canEdit={canEdit} />
            </Card>
          </div>
        </Card>

        {/* 2. Plnění cílů */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Plnění cílů</h2>
          <EditableSection
            value={goalFulfillment}
            isEditing={editingSections.has("goal_fulfillment")}
            onStartEdit={() => startEditing("goal_fulfillment")}
            onSave={(v) => handleSaveSection("goal_fulfillment", v)}
            onCancel={() => stopEditing("goal_fulfillment")}
            canEdit={canEdit}
            placeholder="AI porovnání cílů s dosaženými výsledky..."
          />
        </Card>

        {/* 3. Klíčové metriky */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Klíčové metriky</h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricTile title="Spend" value={formatCurrency(insights.key_metrics.spend, cur)} icon={DollarSign} accentColor="orange" />
            <MetricTile title="Reach" value={formatNumber(insights.key_metrics.reach)} icon={Users} accentColor="blue" />
            <MetricTile title="Frequency" value={insights.key_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
          </div>
        </Card>

        {/* 4. Vývoj metrik v čase */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Vývoj metrik v čase</h2>
          <EditableSection
            value={metricsOverTime}
            isEditing={editingSections.has("metrics_over_time")}
            onStartEdit={() => startEditing("metrics_over_time")}
            onSave={(v) => handleSaveSection("metrics_over_time", v)}
            onCancel={() => stopEditing("metrics_over_time")}
            canEdit={canEdit}
            placeholder="AI popis vývoje metrik v průběhu měsíce..."
          />
        </Card>

        {/* 5. Community Management */}
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

        {/* 6. Vliv na brand awareness */}
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

        {/* 7. Facebook příspěvky */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <div className="flex items-center gap-3 mb-4">
            <FacebookIcon />
            <h2 className="text-xl font-bold">Klíčové metriky – Facebook</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricTile title="Spend" value={formatCurrency(insights.facebook_metrics.spend, cur)} icon={DollarSign} accentColor="orange" />
            <MetricTile title="Reach" value={formatNumber(insights.facebook_metrics.reach)} icon={Users} accentColor="blue" />
            <MetricTile title="Frequency" value={insights.facebook_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
          </div>
          {insights.facebook_top_posts.length > 0 && (
            <>
              <h3 className="font-bold text-lg mb-3">TOP příspěvky</h3>
              <div className={`grid gap-6 ${
                insights.facebook_top_posts.length === 1 ? "grid-cols-1 max-w-[250px] mx-auto" :
                insights.facebook_top_posts.length === 2 ? "grid-cols-2 max-w-[520px] mx-auto" :
                insights.facebook_top_posts.length === 3 ? "grid-cols-3 max-w-[780px] mx-auto" :
                insights.facebook_top_posts.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              }`}>
                {insights.facebook_top_posts.map((post, i) => <PostCard key={i} post={post} />)}
              </div>
            </>
          )}
        </Card>

        {/* 8. Instagram příspěvky */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <div className="flex items-center gap-3 mb-4">
            <InstagramIcon />
            <h2 className="text-xl font-bold">Klíčové metriky – Instagram</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricTile title="Spend" value={formatCurrency(insights.instagram_metrics.spend, cur)} icon={DollarSign} accentColor="orange" />
            <MetricTile title="Reach" value={formatNumber(insights.instagram_metrics.reach)} icon={Users} accentColor="blue" />
            <MetricTile title="Frequency" value={insights.instagram_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
          </div>
          {insights.instagram_top_posts.length > 0 && (
            <>
              <h3 className="font-bold text-lg mb-3">TOP příspěvky</h3>
              <div className={`grid gap-6 ${
                insights.instagram_top_posts.length === 1 ? "grid-cols-1 max-w-[250px] mx-auto" :
                insights.instagram_top_posts.length === 2 ? "grid-cols-2 max-w-[520px] mx-auto" :
                insights.instagram_top_posts.length === 3 ? "grid-cols-3 max-w-[780px] mx-auto" :
                insights.instagram_top_posts.length === 4 ? "grid-cols-2 md:grid-cols-4" :
                "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              }`}>
                {insights.instagram_top_posts.map((post, i) => <PostCard key={i} post={post} />)}
              </div>
            </>
          )}
        </Card>

        {/* 9. Followers */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Followers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
              <FacebookIcon />
              <span className="text-sm font-medium text-muted-foreground uppercase">Facebook</span>
              <EditableNumberField value={insights.followers.facebook} label="Facebook" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("facebook", v)} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
              <InstagramIcon />
              <span className="text-sm font-medium text-muted-foreground uppercase">Instagram</span>
              <EditableNumberField value={insights.followers.instagram} label="Instagram" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("instagram", v)} />
            </Card>
            <Card className="p-4 rounded-[15px] border-border bg-muted/30 flex flex-col items-center gap-3">
              <TiktokIcon />
              <span className="text-sm font-medium text-muted-foreground uppercase">TikTok</span>
              <EditableNumberField value={insights.followers.tiktok} label="TikTok" canEdit={canEdit} onSave={(v) => handleSaveFollowersField("tiktok", v)} />
            </Card>
          </div>
        </Card>

        {/* 10. Learnings */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Learnings</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 rounded-[20px] border-accent-green">
              <h3 className="font-bold text-accent-green mb-3 flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Co se povedlo</h3>
              <EditableListSection
                items={worksItems}
                isEditing={editingSections.has("learnings_works")}
                onStartEdit={() => startEditing("learnings_works")}
                onSave={(items) => handleSaveListSection("learnings_works", items)}
                onCancel={() => stopEditing("learnings_works")}
                canEdit={canEdit}
                bulletColor="text-accent-green"
              />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-orange">
              <h3 className="font-bold text-accent-orange mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Hrozby a příležitosti</h3>
              <EditableListSection
                items={threatsItems}
                isEditing={editingSections.has("learnings_threats")}
                onStartEdit={() => startEditing("learnings_threats")}
                onSave={(items) => handleSaveListSection("learnings_threats", items)}
                onCancel={() => stopEditing("learnings_threats")}
                canEdit={canEdit}
                bulletColor="text-accent-orange"
              />
            </Card>
            <Card className="p-6 rounded-[20px] border-accent-blue">
              <h3 className="font-bold text-accent-blue mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Co zlepšit</h3>
              <EditableListSection
                items={improvementsItems}
                isEditing={editingSections.has("learnings_improvements")}
                onStartEdit={() => startEditing("learnings_improvements")}
                onSave={(items) => handleSaveListSection("learnings_improvements", items)}
                onCancel={() => stopEditing("learnings_improvements")}
                canEdit={canEdit}
                bulletColor="text-accent-blue"
              />
            </Card>
          </div>
        </Card>
      </div>
    );
  }
);

MonthlyAdsInsightsContent.displayName = "MonthlyAdsInsightsContent";
