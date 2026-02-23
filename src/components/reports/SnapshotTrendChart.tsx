import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { formatCurrencySimple } from "@/lib/currencyUtils";

interface SnapshotTrendChartProps {
  spaceId: string;
  campaignIds?: string[]; // entity_ids to filter (campaign_id not DB id)
  entityType?: string;
}

const METRIC_OPTIONS = [
  { value: "amount_spent", label: "Spend", format: "currency" },
  { value: "impressions", label: "Impressions", format: "number" },
  { value: "reach", label: "Reach", format: "number" },
  { value: "ctr", label: "CTR %", format: "percent" },
  { value: "cpm", label: "CPM", format: "currency" },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088fe",
];

const formatValue = (value: number, format: string) => {
  if (value === null || value === undefined) return "-";
  switch (format) {
    case "currency":
      return formatCurrencySimple(value, "CZK");
    case "percent":
      return `${value.toFixed(2)}%`;
    case "number":
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    default:
      return value.toString();
  }
};

export const SnapshotTrendChart = ({ spaceId, campaignIds, entityType = "meta_campaign" }: SnapshotTrendChartProps) => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("amount_spent");

  useEffect(() => {
    const fetchSnapshots = async () => {
      setLoading(true);
      let query = supabase
        .from("ads_metric_snapshots" as any)
        .select("*")
        .eq("space_id", spaceId)
        .eq("entity_type", entityType)
        .order("snapshot_date", { ascending: true });

      if (campaignIds && campaignIds.length > 0) {
        query = query.in("entity_id", campaignIds);
      }

      const { data, error } = await query;
      if (!error && data) {
        setSnapshots(data as any[]);
      }
      setLoading(false);
    };

    fetchSnapshots();
  }, [spaceId, entityType, campaignIds?.join(",")]);

  // Transform data for recharts: each date becomes a row, each campaign a column
  const { chartData, campaignNames } = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    const nameMap = new Map<string, string>();

    for (const snap of snapshots) {
      const date = snap.snapshot_date;
      const entityId = snap.entity_id;
      const name = snap.entity_name || entityId;
      nameMap.set(entityId, name);

      if (!dateMap.has(date)) {
        dateMap.set(date, {});
      }
      const metrics = typeof snap.metrics === "string" ? JSON.parse(snap.metrics) : snap.metrics;
      const value = metrics?.[selectedMetric];
      if (value !== undefined && value !== null) {
        dateMap.get(date)![entityId] = Number(value);
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const chartData = sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" }),
      rawDate: date,
      ...dateMap.get(date),
    }));

    return {
      chartData,
      campaignNames: nameMap,
    };
  }, [snapshots, selectedMetric]);

  const metricConfig = METRIC_OPTIONS.find(m => m.value === selectedMetric);
  const entityIds = Array.from(campaignNames.keys());

  if (loading) {
    return (
      <Card className="p-6 rounded-[35px] border-foreground">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (chartData.length < 2) {
    return (
      <Card className="p-6 rounded-[35px] border-foreground">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" />
          <h3 className="font-bold text-lg">Metric Trends</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>Potřebujeme alespoň 2 snapshoty pro zobrazení grafu vývoje.</p>
          <p className="text-sm mt-1">Spusťte "Differential Sync" opakovaně v různé dny.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-[35px] border-foreground">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="font-bold text-lg">Metric Trends</h3>
        </div>
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-[180px] rounded-[35px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(val) => formatValue(val, metricConfig?.format || "number")}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatValue(value, metricConfig?.format || "number"), ""]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend
              formatter={(value) => {
                const name = campaignNames.get(value) || value;
                return name.length > 30 ? name.substring(0, 30) + "…" : name;
              }}
            />
            {entityIds.map((entityId, i) => (
              <Line
                key={entityId}
                type="monotone"
                dataKey={entityId}
                name={entityId}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Delta table */}
      {chartData.length >= 2 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Změny od posledního snapshotu ({chartData[chartData.length - 2]?.date} → {chartData[chartData.length - 1]?.date})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium">Kampaň</th>
                  {METRIC_OPTIONS.map(m => (
                    <th key={m.value} className="text-right py-2 px-3 font-medium">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entityIds.map(entityId => {
                  const prev = chartData[chartData.length - 2];
                  const curr = chartData[chartData.length - 1];
                  const name = campaignNames.get(entityId) || entityId;

                  return (
                    <tr key={entityId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium truncate max-w-[200px]" title={name}>
                        {name.length > 35 ? name.substring(0, 35) + "…" : name}
                      </td>
                      {METRIC_OPTIONS.map(m => {
                        const prevVal = prev?.[entityId as keyof typeof prev] as unknown as number | undefined;
                        const currVal = curr?.[entityId as keyof typeof curr] as unknown as number | undefined;
                        
                        // We need to look at actual snapshot data for each metric
                        const prevSnap = snapshots.find(s => s.snapshot_date === prev?.rawDate && s.entity_id === entityId);
                        const currSnap = snapshots.find(s => s.snapshot_date === curr?.rawDate && s.entity_id === entityId);
                        const prevMetrics = prevSnap?.metrics || {};
                        const currMetrics = currSnap?.metrics || {};
                        const pv = Number(prevMetrics[m.value]) || 0;
                        const cv = Number(currMetrics[m.value]) || 0;
                        const delta = cv - pv;
                        const pctChange = pv !== 0 ? ((delta / pv) * 100) : 0;

                        return (
                          <td key={m.value} className="text-right py-2 px-3">
                            <div className="flex flex-col items-end">
                              <span>{formatValue(cv, m.format)}</span>
                              {delta !== 0 && (
                                <span className={`text-xs ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
                                  {delta > 0 ? "+" : ""}{formatValue(delta, m.format)}
                                  {pv !== 0 && ` (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%)`}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
};
