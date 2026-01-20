import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, StatusType, getStatusFromPerformance } from "./StatusBadge";
import { formatCurrency } from "@/lib/currencyUtils";

export interface LeaderboardEntry {
  handle: string;
  avatarUrl?: string | null;
  platform: string;
  views: number;
  interactions: number;
  engagementRate: number;
  viralityRate: number;
  tswbCost: number;
  currency: string;
}

export interface Benchmarks {
  engagementRate: number;
  viralityRate: number;
  tswbCost: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  benchmarks: Benchmarks;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const formatPercent = (num: number): string => {
  return num.toFixed(2) + "%";
};

const getOverallStatus = (
  entry: LeaderboardEntry,
  benchmarks: Benchmarks
): StatusType => {
  // Calculate average performance across metrics
  const erRatio = benchmarks.engagementRate > 0 
    ? entry.engagementRate / benchmarks.engagementRate 
    : 1;
  const vrRatio = benchmarks.viralityRate > 0 
    ? entry.viralityRate / benchmarks.viralityRate 
    : 1;
  // For cost, lower is better, so invert
  const costRatio = entry.tswbCost > 0 && benchmarks.tswbCost > 0
    ? benchmarks.tswbCost / entry.tswbCost
    : 1;

  const avgRatio = (erRatio + vrRatio + costRatio) / 3;

  if (avgRatio >= 1.5) return "WOW!";
  if (avgRatio >= 1.2) return "VIRAL";
  if (avgRatio >= 0.8) return "OK";
  return "FAIL";
};

export const LeaderboardTable = ({
  entries,
  benchmarks,
}: LeaderboardTableProps) => {
  // Sort by views descending
  const sortedEntries = [...entries].sort((a, b) => b.views - a.views);

  return (
    <div className="rounded-[20px] border border-foreground overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-bold">Influencer</TableHead>
            <TableHead className="text-right font-bold">Views</TableHead>
            <TableHead className="text-right font-bold">Interactions</TableHead>
            <TableHead className="text-right font-bold">
              <div>ER</div>
              <div className="text-xs font-normal text-muted-foreground">
                Benchmark: {formatPercent(benchmarks.engagementRate)}
              </div>
            </TableHead>
            <TableHead className="text-right font-bold">
              <div>Virality</div>
              <div className="text-xs font-normal text-muted-foreground">
                Benchmark: {formatPercent(benchmarks.viralityRate)}
              </div>
            </TableHead>
            <TableHead className="text-right font-bold">
              <div>TSWB Cost</div>
              <div className="text-xs font-normal text-muted-foreground">
                Benchmark: {formatCurrency(benchmarks.tswbCost, "CZK")}
              </div>
            </TableHead>
            <TableHead className="text-center font-bold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry, index) => (
            <TableRow key={`${entry.handle}-${index}`} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-2">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.handle}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {entry.handle.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">@{entry.handle}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.platform}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(entry.views)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(entry.interactions)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPercent(entry.engagementRate)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPercent(entry.viralityRate)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(entry.tswbCost, entry.currency)}
              </TableCell>
              <TableCell className="text-center">
                <StatusBadge status={getOverallStatus(entry, benchmarks)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
