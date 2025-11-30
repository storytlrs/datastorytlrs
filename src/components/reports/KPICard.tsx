import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
}

export const KPICard = ({ 
  title, 
  value, 
  change, 
  icon: Icon,
  accentColor = "default" 
}: KPICardProps) => {
  const accentClass = {
    default: "border-accent",
    orange: "border-accent-orange",
    green: "border-accent-green",
    blue: "border-accent-blue",
  }[accentColor];

  const changeColor = change && change > 0 
    ? "text-accent-green" 
    : change && change < 0 
    ? "text-accent-orange" 
    : "text-muted-foreground";

  return (
    <Card className={cn(
      "p-6 rounded-[35px] border-2 transition-all hover:shadow-lg",
      accentClass
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        {Icon && (
          <Icon className="w-5 h-5 text-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-foreground">
          {value}
        </p>
        {change !== undefined && (
          <p className={cn("text-sm font-medium", changeColor)}>
            {change > 0 ? "+" : ""}{change}%
          </p>
        )}
      </div>
    </Card>
  );
};
