import { Card } from "@/components/ui/card";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

export const CreatorsTab = () => {
  // Mock data - will be replaced with real data
  const creatorData = [
    { name: "Creator A", cpv: 0.15, er: 5.2, followers: 250000 },
    { name: "Creator B", cpv: 0.22, er: 3.8, followers: 180000 },
    { name: "Creator C", cpv: 0.08, er: 7.5, followers: 420000 },
    { name: "Creator D", cpv: 0.18, er: 4.6, followers: 310000 },
    { name: "Creator E", cpv: 0.12, er: 6.1, followers: 290000 },
    { name: "Creator F", cpv: 0.25, er: 3.2, followers: 150000 },
    { name: "Creator G", cpv: 0.10, er: 8.3, followers: 520000 },
  ];

  const getColor = (er: number) => {
    if (er > 6) return "hsl(var(--accent-green))";
    if (er > 4) return "hsl(var(--accent))";
    return "hsl(var(--accent-orange))";
  };

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Creator Performance</h2>
        <p className="text-muted-foreground">
          CPV vs Engagement Rate scatter plot with in-campaign benchmarks
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            opacity={0.2}
          />
          <XAxis 
            type="number" 
            dataKey="cpv" 
            name="CPV" 
            unit=" Kč"
            stroke="hsl(var(--foreground))"
            label={{ value: 'Cost Per View (Kč)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey="er" 
            name="ER" 
            unit="%"
            stroke="hsl(var(--foreground))"
            label={{ value: 'Engagement Rate (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Scatter name="Creators" data={creatorData}>
            {creatorData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.er)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-6 flex items-center gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-green"></div>
          <span className="text-muted-foreground">High Performance (ER &gt; 6%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent"></div>
          <span className="text-muted-foreground">Medium Performance (ER 4-6%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-orange"></div>
          <span className="text-muted-foreground">Needs Attention (ER &lt; 4%)</span>
        </div>
      </div>
    </Card>
  );
};
