import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Eye, Heart, MessageCircle, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import { TranslatedText } from "@/components/ui/TranslatedText";

export interface TileData {
  type: "metric" | "chart" | "content_preview" | "text";
  title: string;
  value?: string;
  subtitle?: string;
  benchmark?: string;
  size?: "small" | "medium" | "large";
  accent_color?: "default" | "orange" | "green" | "blue";
  chart_data?: { name: string; value: number }[];
  chart_type?: "bar" | "line" | "pie";
  content?: {
    thumbnail_url?: string;
    url?: string;
    views?: number;
    likes?: number;
    comments?: number;
    engagement_rate?: number;
    platform?: string;
    content_type?: string;
    creator_handle?: string;
  };
  text?: string;
  source_report_id?: string;
  priority: number;
}

export const getTileSizeClass = (size?: string) => {
  if (size === "large") return "md:col-span-2";
  return "";
};

const ACCENT_CLASSES = {
  default: "border-accent",
  orange: "border-accent-orange",
  green: "border-accent-green",
  blue: "border-accent-blue",
};

const CHART_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--accent-orange))",
  "hsl(var(--accent-green))",
  "hsl(var(--accent-blue))",
  "hsl(var(--muted-foreground))",
];

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export const InsightTile = ({ tile }: { tile: TileData }) => {
  const accentClass = ACCENT_CLASSES[tile.accent_color || "default"];

  if (tile.type === "metric") {
    return (
      <Card className={cn("rounded-[20px] border-2 p-4 flex flex-col", accentClass)}>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          <TranslatedText text={tile.title} />
        </span>
        <div className="flex flex-col justify-end">
          <p className="text-2xl font-bold text-foreground">{tile.value}</p>
          {tile.benchmark && (
            <p className="text-xs font-medium text-muted-foreground mt-1">
              <TranslatedText text={tile.benchmark} />
            </p>
          )}
          {tile.subtitle && (
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              <TranslatedText text={tile.subtitle} />
            </p>
          )}
        </div>
      </Card>
    );
  }

  if (tile.type === "chart" && tile.chart_data?.length) {
    return <ChartTile tile={tile} accentClass={accentClass} />;
  }

  if (tile.type === "content_preview" && tile.content) {
    const c = tile.content;
    return (
      <Card className={cn("rounded-[20px] border-2 p-4 flex flex-col", accentClass)}>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          <TranslatedText text={tile.title} />
        </span>
        <div className="flex gap-3">
          {c.thumbnail_url && (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={c.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              @{c.creator_handle}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {c.platform} · {c.content_type}
            </p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              {c.views != null && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {formatNumber(c.views)}
                </span>
              )}
              {c.likes != null && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" /> {formatNumber(c.likes)}
                </span>
              )}
              {c.comments != null && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {formatNumber(c.comments)}
                </span>
              )}
            </div>
            {c.engagement_rate != null && (
              <p className="text-xs font-medium text-foreground mt-1">
                ER: {c.engagement_rate.toFixed(2)}%
              </p>
            )}
          </div>
          {c.url && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </Card>
    );
  }

  if (tile.type === "text" && tile.text) {
    return <TextTile tile={tile} accentClass={accentClass} />;
  }

  return null;
};

/** Translates each chart_data name before rendering */
const useTranslatedChartData = (data: { name: string; value: number }[]) => {
  // Translate up to 10 label names; hooks must be called unconditionally
  const t0 = useTranslatedText(data[0]?.name || "");
  const t1 = useTranslatedText(data[1]?.name || "");
  const t2 = useTranslatedText(data[2]?.name || "");
  const t3 = useTranslatedText(data[3]?.name || "");
  const t4 = useTranslatedText(data[4]?.name || "");
  const t5 = useTranslatedText(data[5]?.name || "");
  const t6 = useTranslatedText(data[6]?.name || "");
  const t7 = useTranslatedText(data[7]?.name || "");
  const t8 = useTranslatedText(data[8]?.name || "");
  const t9 = useTranslatedText(data[9]?.name || "");
  const translations = [t0, t1, t2, t3, t4, t5, t6, t7, t8, t9];

  return data.map((item, i) => ({
    ...item,
    name: i < 10 ? (translations[i] || item.name) : item.name,
  }));
};

const ChartTile = ({ tile, accentClass }: { tile: TileData; accentClass: string }) => {
  const translatedData = useTranslatedChartData(tile.chart_data || []);

  return (
    <Card className={cn("rounded-[20px] border-2 p-4 flex flex-col", accentClass)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        <TranslatedText text={tile.title} />
      </span>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          {tile.chart_type === "pie" ? (
            <PieChart>
              <Pie
                data={translatedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {translatedData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : tile.chart_type === "line" ? (
            <LineChart data={translatedData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            <BarChart data={translatedData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const TextTile = ({ tile, accentClass }: { tile: TileData; accentClass: string }) => {
  const translatedText = useTranslatedText(tile.text || "");
  return (
    <Card className={cn("rounded-[20px] border-2 p-4 flex flex-col", accentClass)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        <TranslatedText text={tile.title} />
      </span>
      <div className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{translatedText}</ReactMarkdown>
      </div>
    </Card>
  );
};
