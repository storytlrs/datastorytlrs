import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const KPITargetsTab = () => {
  // Mock data - will be replaced with real data
  const kpiTargets = [
    { metric: "Reach", planned: 2000000, actual: 2500000, unit: "" },
    { metric: "Views", planned: 8000000, actual: 8200000, unit: "" },
    { metric: "Engagement Rate", planned: 5.0, actual: 4.8, unit: "%" },
    { metric: "Total Spend", planned: 50000, actual: 45200, unit: "$" },
    { metric: "Brand Minutes", planned: 100000, actual: 125000, unit: "" },
    { metric: "ROI", planned: 2.5, actual: 3.2, unit: "x" },
  ];

  const formatNumber = (num: number, unit: string) => {
    if (unit === "$") return `$${(num / 1000).toFixed(1)}K`;
    if (unit === "") return num > 1000 ? `${(num / 1000000).toFixed(1)}M` : num.toString();
    if (unit === "x") return `${num.toFixed(1)}x`;
    return `${num.toFixed(1)}${unit}`;
  };

  const getProgress = (planned: number, actual: number) => {
    return Math.min((actual / planned) * 100, 100);
  };

  const getStatus = (planned: number, actual: number) => {
    const ratio = actual / planned;
    if (ratio >= 1) return { label: "Exceeded", color: "bg-accent-green" };
    if (ratio >= 0.8) return { label: "On Track", color: "bg-accent" };
    return { label: "Below Target", color: "bg-accent-orange" };
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">KPI Target Fulfilment</h2>
        <p className="text-muted-foreground">
          Comparison of planned vs actual performance metrics
        </p>
      </div>

      <div className="space-y-6">
        {kpiTargets.map((kpi, index) => {
          const progress = getProgress(kpi.planned, kpi.actual);
          const status = getStatus(kpi.planned, kpi.actual);

          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">{kpi.metric}</h3>
                  <Badge className={cn("text-xs", status.color)}>
                    {status.label}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatNumber(kpi.actual, kpi.unit)}
                  </span>
                  {" / "}
                  {formatNumber(kpi.planned, kpi.unit)}
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Target: {formatNumber(kpi.planned, kpi.unit)}</span>
                <span>{progress.toFixed(0)}% achieved</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
