import { useState, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MetricTile } from "./MetricTile";
import { TranslatedText } from "@/components/ui/TranslatedText";
import {
  Target,
  Rocket,
  Star,
  Eye,
  Wallet,
  MousePointer,
  TrendingUp,
  Heart,
  Play,
  BarChart3,
  Users,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

interface AdsStructuredInsights {
  executive_summary: string;
  campaign_context: {
    mainGoal: string;
    actions: string;
    highlights: string;
  };
  awareness_metrics: {
    reach: number;
    impressions: number;
    thruplays: number;
    video3sPlays: number;
    frequency: number;
  };
  engagement_metrics: {
    linkClicks: number;
    interactions: number;
    reactions: number;
    comments: number;
    shares: number;
    saves: number;
    ctr: number;
    engagementRate: number;
    thruplayRate: number;
    viewRate3s: number;
  };
  effectiveness_metrics: {
    spend: number;
    cpm: number;
    cpc: number;
    costPerThruplay: number;
    costPer3sView: number;
    cpe: number;
    currency: string;
  };
  benchmarks: {
    cpm: number;
    cpc: number;
    ctr: number;
    engagementRate: number;
  };
  top_ad_sets: {
    name: string;
    platform: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }[];
  campaign_count: number;
  ad_set_count: number;
  ad_count: number;
  awareness_summary?: string;
  engagement_summary?: string;
  effectiveness_summary?: string;
  recommendations: {
    works: string[];
    doesnt_work: string[];
    suggestions: string[];
  };
}

interface AdsAIInsightsContentProps {
  insights: AdsStructuredInsights;
  awarenessParagraph?: string;
  engagementParagraph?: string;
  effectivenessParagraph?: string;
  canEdit?: boolean;
  onSaveInsights?: (updates: Partial<AdsStructuredInsights>) => Promise<void>;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

const formatPercent = (num: number): string => `${num.toFixed(2)}%`;

// Editable section
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
          <Button size="sm" onClick={() => onSave(editValue)} className="rounded-[35px]">
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditValue(value); onCancel(); }}
            className="rounded-[35px] border-foreground"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
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
  items,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  canEdit = false,
  bulletColor = "text-foreground",
  placeholder = "Enter items (one per line)...",
}: EditableListSectionProps) => {
  const [editValue, setEditValue] = useState(items.join("\n"));

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
          <Button
            size="sm"
            onClick={() => onSave(editValue.split("\n").filter((l) => l.trim()))}
            className="rounded-[35px]"
          >
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditValue(items.join("\n")); onCancel(); }}
            className="rounded-[35px] border-foreground"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
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

export type { AdsStructuredInsights };

export const AdsAIInsightsContent = forwardRef<HTMLDivElement, AdsAIInsightsContentProps>(
  ({ insights: rawInsights, awarenessParagraph, engagementParagraph, effectivenessParagraph, canEdit = false, onSaveInsights }, ref) => {
    // Provide safe defaults for all nested objects
    const insights: AdsStructuredInsights = {
      executive_summary: rawInsights.executive_summary || "",
      campaign_context: rawInsights.campaign_context || { mainGoal: "", actions: "", highlights: "" },
      awareness_metrics: { reach: 0, impressions: 0, thruplays: 0, video3sPlays: 0, frequency: 0, ...rawInsights.awareness_metrics },
      engagement_metrics: { linkClicks: 0, interactions: 0, reactions: 0, comments: 0, shares: 0, saves: 0, ctr: 0, engagementRate: 0, thruplayRate: 0, viewRate3s: 0, ...rawInsights.engagement_metrics },
      effectiveness_metrics: { spend: 0, cpm: 0, cpc: 0, costPerThruplay: 0, costPer3sView: 0, cpe: 0, currency: "CZK", ...rawInsights.effectiveness_metrics },
      benchmarks: { cpm: 0, cpc: 0, ctr: 0, engagementRate: 0, ...rawInsights.benchmarks },
      top_ad_sets: rawInsights.top_ad_sets || [],
      campaign_count: rawInsights.campaign_count || 0,
      ad_set_count: rawInsights.ad_set_count || 0,
      ad_count: rawInsights.ad_count || 0,
      awareness_summary: rawInsights.awareness_summary,
      engagement_summary: rawInsights.engagement_summary,
      effectiveness_summary: rawInsights.effectiveness_summary,
      recommendations: rawInsights.recommendations || { works: [], doesnt_work: [], suggestions: [] },
    };

    const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

    const [executiveSummary, setExecutiveSummary] = useState(insights.executive_summary);
    const [mainGoal, setMainGoal] = useState(insights.campaign_context.mainGoal);
    const [actions, setActions] = useState(insights.campaign_context.actions);
    const [highlights, setHighlights] = useState(insights.campaign_context.highlights);
    const [awarenessSummary, setAwarenessSummary] = useState(insights.awareness_summary || awarenessParagraph || "");
    const [engagementSummary, setEngagementSummary] = useState(insights.engagement_summary || engagementParagraph || "");
    const [effectivenessSummary, setEffectivenessSummary] = useState(insights.effectiveness_summary || effectivenessParagraph || "");
    const [worksItems, setWorksItems] = useState(insights.recommendations?.works || []);
    const [doesntWorkItems, setDoesntWorkItems] = useState(insights.recommendations?.doesnt_work || []);
    const [suggestionsItems, setSuggestionsItems] = useState(insights.recommendations?.suggestions || []);

    const startEditing = (s: string) => setEditingSections((prev) => new Set([...prev, s]));
    const stopEditing = (s: string) =>
      setEditingSections((prev) => {
        const next = new Set(prev);
        next.delete(s);
        return next;
      });

    const handleSaveSection = async (section: string, value: string) => {
      const setters: Record<string, (v: string) => void> = {
        executive_summary: setExecutiveSummary,
        mainGoal: setMainGoal,
        actions: setActions,
        highlights: setHighlights,
        awareness_summary: setAwarenessSummary,
        engagement_summary: setEngagementSummary,
        effectiveness_summary: setEffectivenessSummary,
      };
      setters[section]?.(value);
      stopEditing(section);

      if (onSaveInsights) {
        const updates: Partial<AdsStructuredInsights> = {};
        if (section === "executive_summary") updates.executive_summary = value;
        else if (["mainGoal", "actions", "highlights"].includes(section)) {
          updates.campaign_context = {
            mainGoal: section === "mainGoal" ? value : mainGoal,
            actions: section === "actions" ? value : actions,
            highlights: section === "highlights" ? value : highlights,
          };
        } else if (section === "awareness_summary") updates.awareness_summary = value;
        else if (section === "engagement_summary") updates.engagement_summary = value;
        else if (section === "effectiveness_summary") updates.effectiveness_summary = value;
        await onSaveInsights(updates);
      }
    };

    const handleSaveListSection = async (section: string, items: string[]) => {
      if (section === "recommendations_works") setWorksItems(items);
      if (section === "recommendations_doesnt_work") setDoesntWorkItems(items);
      if (section === "recommendations_suggestions") setSuggestionsItems(items);
      stopEditing(section);

      if (onSaveInsights) {
        await onSaveInsights({
          recommendations: {
            works: section === "recommendations_works" ? items : worksItems,
            doesnt_work: section === "recommendations_doesnt_work" ? items : doesntWorkItems,
            suggestions: section === "recommendations_suggestions" ? items : suggestionsItems,
          },
        });
      }
    };

    const cur = insights.effectiveness_metrics.currency || "CZK";

    return (
      <div ref={ref} className="space-y-8" style={{ backgroundColor: "#E9E9E9" }}>
        {/* Executive Summary */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
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

          {/* Campaign Context */}
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
              />
            </Card>
          </div>
        </Card>

        {/* Awareness Metrics */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Awareness</h2>
          <div className="mb-4">
            <EditableSection
              value={awarenessSummary}
              isEditing={editingSections.has("awareness_summary")}
              onStartEdit={() => startEditing("awareness_summary")}
              onSave={(v) => handleSaveSection("awareness_summary", v)}
              onCancel={() => stopEditing("awareness_summary")}
              canEdit={canEdit}
              placeholder="AI shrnutí awareness metrik..."
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricTile title="Reach" value={formatNumber(insights.awareness_metrics.reach)} icon={Users} accentColor="blue" />
            <MetricTile title="Impressions" value={formatNumber(insights.awareness_metrics.impressions)} icon={Eye} accentColor="blue" />
            <MetricTile title="ThruPlays" value={formatNumber(insights.awareness_metrics.thruplays)} icon={Play} accentColor="blue" />
            <MetricTile title="3s Views" value={formatNumber(insights.awareness_metrics.video3sPlays)} icon={Play} accentColor="blue" />
            <MetricTile title="Frequency" value={insights.awareness_metrics.frequency.toFixed(2)} icon={BarChart3} accentColor="blue" />
          </div>
        </Card>

        {/* Engagement Metrics */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Engagement</h2>
          <div className="mb-4">
            <EditableSection
              value={engagementSummary}
              isEditing={editingSections.has("engagement_summary")}
              onStartEdit={() => startEditing("engagement_summary")}
              onSave={(v) => handleSaveSection("engagement_summary", v)}
              onCancel={() => stopEditing("engagement_summary")}
              canEdit={canEdit}
              placeholder="AI shrnutí engagement metrik..."
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricTile title="Link Clicks" value={formatNumber(insights.engagement_metrics.linkClicks)} icon={MousePointer} accentColor="green" />
            <MetricTile
              title="CTR"
              value={formatPercent(insights.engagement_metrics.ctr)}
              icon={TrendingUp}
              accentColor="green"
              benchmark={formatPercent(insights.benchmarks.ctr)}
            />
            <MetricTile
              title="Engagement Rate"
              value={formatPercent(insights.engagement_metrics.engagementRate)}
              icon={Heart}
              accentColor="green"
              benchmark={formatPercent(insights.benchmarks.engagementRate)}
            />
            <MetricTile title="Interactions" value={formatNumber(insights.engagement_metrics.interactions)} icon={Heart} accentColor="green" />
            <MetricTile title="ThruPlay Rate" value={formatPercent(insights.engagement_metrics.thruplayRate)} icon={Play} accentColor="green" />
            <MetricTile title="View Rate (3s)" value={formatPercent(insights.engagement_metrics.viewRate3s)} icon={Play} accentColor="green" />
          </div>
        </Card>

        {/* Effectiveness Metrics */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Effectiveness</h2>
          <div className="mb-4">
            <EditableSection
              value={effectivenessSummary}
              isEditing={editingSections.has("effectiveness_summary")}
              onStartEdit={() => startEditing("effectiveness_summary")}
              onSave={(v) => handleSaveSection("effectiveness_summary", v)}
              onCancel={() => stopEditing("effectiveness_summary")}
              canEdit={canEdit}
              placeholder="AI shrnutí nákladové efektivity..."
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricTile title="Total Spend" value={formatCurrency(insights.effectiveness_metrics.spend, cur)} icon={Wallet} accentColor="orange" />
            <MetricTile
              title="CPM"
              value={formatCurrency(insights.effectiveness_metrics.cpm, cur)}
              icon={Wallet}
              accentColor="orange"
              benchmark={formatCurrency(insights.benchmarks.cpm, cur)}
            />
            <MetricTile
              title="CPC"
              value={formatCurrency(insights.effectiveness_metrics.cpc, cur)}
              icon={MousePointer}
              accentColor="orange"
              benchmark={formatCurrency(insights.benchmarks.cpc, cur)}
            />
            <MetricTile title="Cost per ThruPlay" value={formatCurrency(insights.effectiveness_metrics.costPerThruplay, cur)} icon={Play} accentColor="orange" />
            <MetricTile title="Cost per 3s View" value={formatCurrency(insights.effectiveness_metrics.costPer3sView, cur)} icon={Play} accentColor="orange" />
            <MetricTile title="CPE" value={formatCurrency(insights.effectiveness_metrics.cpe, cur)} icon={Heart} accentColor="orange" />
          </div>
        </Card>

        {/* Top Ad Sets */}
        {insights.top_ad_sets && insights.top_ad_sets.length > 0 && (
          <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
            <h2 className="text-xl font-bold mb-4">Top Ad Sets</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/20">
                    <th className="text-left py-2 font-semibold">Name</th>
                    <th className="text-right py-2 font-semibold">Spend</th>
                    <th className="text-right py-2 font-semibold">Impressions</th>
                    <th className="text-right py-2 font-semibold">Clicks</th>
                    <th className="text-right py-2 font-semibold">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.top_ad_sets.map((as, i) => (
                    <tr key={i} className="border-b border-foreground/10">
                      <td className="py-2">{as.name}</td>
                      <td className="text-right py-2">{formatCurrency(as.spend, cur)}</td>
                      <td className="text-right py-2">{formatNumber(as.impressions)}</td>
                      <td className="text-right py-2">{formatNumber(as.clicks)}</td>
                      <td className="text-right py-2">{formatPercent(as.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Summary & Takeaways */}
        <Card className="p-6 rounded-[20px] border-foreground" style={{ backgroundColor: "#E9E9E9" }}>
          <h2 className="text-xl font-bold mb-4">Summary & Takeaways</h2>
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
              />
            </Card>
          </div>
        </Card>
      </div>
    );
  }
);

AdsAIInsightsContent.displayName = "AdsAIInsightsContent";
