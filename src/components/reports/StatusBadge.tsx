import { cn } from "@/lib/utils";

export type StatusType = "WOW!" | "VIRAL" | "OK" | "FAIL";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string }> = {
  "WOW!": { bg: "bg-accent-green", text: "text-accent-green-foreground" },
  "VIRAL": { bg: "bg-accent-blue", text: "text-white" },
  "OK": { bg: "bg-accent-purple", text: "text-accent-purple-foreground" },
  "FAIL": { bg: "bg-accent-orange", text: "text-accent-orange-foreground" },
};

export const getStatusFromPerformance = (
  value: number,
  benchmark: number
): StatusType => {
  if (benchmark === 0) return "OK";
  const ratio = value / benchmark;
  if (ratio >= 1.5) return "WOW!";
  if (ratio >= 1.2) return "VIRAL";
  if (ratio >= 0.8) return "OK";
  return "FAIL";
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
        config.bg,
        config.text,
        className
      )}
    >
      {status}
    </span>
  );
};
