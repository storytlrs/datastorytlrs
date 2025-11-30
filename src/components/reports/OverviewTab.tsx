import { KPICard } from "./KPICard";
import { 
  Users, 
  Eye, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target,
  Zap,
  Award
} from "lucide-react";

export const OverviewTab = () => {
  // Mock data - will be replaced with real data from API
  const kpis = [
    {
      title: "Reach",
      value: "2.5M",
      change: 12.5,
      icon: Users,
      accentColor: "default" as const,
    },
    {
      title: "Views",
      value: "8.2M",
      change: 8.3,
      icon: Eye,
      accentColor: "blue" as const,
    },
    {
      title: "Engagement Rate",
      value: "4.8%",
      change: -2.1,
      icon: TrendingUp,
      accentColor: "green" as const,
    },
    {
      title: "CPM",
      value: "$12.40",
      change: -5.2,
      icon: DollarSign,
      accentColor: "orange" as const,
    },
    {
      title: "Brand Minutes",
      value: "125K",
      change: 15.7,
      icon: Clock,
      accentColor: "default" as const,
    },
    {
      title: "Total Spend",
      value: "$45.2K",
      icon: Target,
      accentColor: "orange" as const,
    },
    {
      title: "ROI",
      value: "3.2x",
      change: 22.1,
      icon: Zap,
      accentColor: "green" as const,
    },
    {
      title: "AQS",
      value: "87.5",
      change: 3.2,
      icon: Award,
      accentColor: "blue" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
            accentColor={kpi.accentColor}
          />
        ))}
      </div>
    </div>
  );
};
