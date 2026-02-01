import { cn } from "@/lib/utils";

interface TopicBadgeProps {
  topic: string;
  variant?: "positive" | "negative" | "neutral" | "default";
  className?: string;
}

const variantConfig = {
  positive: "bg-accent-green text-accent-green-foreground",
  negative: "bg-accent-orange text-accent-orange-foreground",
  neutral: "bg-accent-blue text-white",
  default: "bg-accent-purple text-accent-purple-foreground",
};

export const TopicBadge = ({ topic, variant = "default", className }: TopicBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
        variantConfig[variant],
        className
      )}
    >
      {topic}
    </span>
  );
};
