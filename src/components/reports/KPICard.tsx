import { Card } from "@/components/ui/card";
import { LucideIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  accentColor?: "default" | "orange" | "green" | "blue";
  tooltip?: string;
}

export const KPICard = ({ 
  title, 
  value, 
  change, 
  icon: Icon,
  accentColor = "default",
  tooltip
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
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-sm">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
