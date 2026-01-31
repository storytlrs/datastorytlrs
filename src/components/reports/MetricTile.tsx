import { Card } from "@/components/ui/card";
import { LucideIcon, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricTileProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  size?: "small" | "medium";
  target?: string | number;
  targetLabel?: string;
}

export const MetricTile = ({
  title,
  value,
  icon: Icon,
  accentColor = "default",
  size = "medium",
  target,
  targetLabel,
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
