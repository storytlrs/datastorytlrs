import { Card } from "@/components/ui/card";
import { LucideIcon, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanComparison {
  planned: number;
  actual: number;
  plannedLabel: string;
}

interface MetricTileProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  size?: "small" | "medium";
  target?: string | number;
  targetLabel?: string;
  benchmark?: string | number;
  benchmarkLabel?: string;
  planComparison?: PlanComparison;
}

export const MetricTile = ({
  title,
  value,
  icon: Icon,
  accentColor = "default",
  size = "medium",
  target,
  targetLabel,
  benchmark,
  benchmarkLabel = "Avg:",
  planComparison,
}: MetricTileProps) => {
  const accentClass = {
    default: "border-accent",
    orange: "border-accent-orange",
    green: "border-accent-green",
    blue: "border-accent-blue",
  }[accentColor];

  const sizeClasses = size === "small" 
    ? "p-3 min-h-[80px]" 
    : "p-4 min-h-[100px]";

  const titleSize = size === "small" ? "text-xs" : "text-sm";
  const valueSize = size === "small" ? "text-xl" : "text-2xl";
  const iconSize = size === "small" ? "w-4 h-4" : "w-5 h-5";

  const planPct = planComparison && planComparison.planned > 0
    ? (planComparison.actual / planComparison.planned) * 100
    : null;

  return (
    <Card
      className={cn(
        "rounded-[20px] border-2 transition-all hover:shadow-md flex flex-col",
        accentClass,
        sizeClasses
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={cn("font-medium text-muted-foreground uppercase tracking-wide", titleSize)}>
          {title}
        </span>
        {Icon && <Icon className={cn("text-foreground flex-shrink-0", iconSize)} />}
      </div>
      <div className="flex-1 flex flex-col justify-end">
        <p className={cn("font-bold text-foreground", valueSize)}>{value}</p>
        {planComparison && planPct !== null && (
          <div className="flex items-center gap-2 mt-1.5">
            <Target className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className={cn("text-muted-foreground", titleSize)}>
              Plan: {planComparison.plannedLabel}
            </span>
            <span className={cn(
              "font-bold text-xs px-1.5 py-0.5 rounded-full",
              planPct >= 100 ? "bg-accent-green/15 text-accent-green" :
              planPct >= 80 ? "bg-accent-blue/15 text-accent-blue" :
              "bg-accent-orange/15 text-accent-orange"
            )}>
              {planPct.toFixed(0)}%
            </span>
          </div>
        )}
        {benchmark !== undefined && (
          <p className={cn("font-medium text-muted-foreground mt-1", titleSize)}>
            {benchmarkLabel} {benchmark}
          </p>
        )}
        {target !== undefined && (
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            <Target className="w-3 h-3" />
            <span className={cn("font-medium", titleSize)}>
              {targetLabel || ""} {target}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
