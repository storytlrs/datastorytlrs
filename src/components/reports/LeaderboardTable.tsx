import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, StatusType } from "./StatusBadge";
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
  interactions?: number;
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

const getPercentile = (value: number, allValues: number[]): number => {
  if (allValues.length === 0) return 0.5;
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex((v) => v >= value);
  if (index === -1) return 1;
  return index / sorted.length;
};

const getOverallStatus = (
  entry: LeaderboardEntry,
  allEntries: LeaderboardEntry[],
  benchmarks: Benchmarks
): StatusType => {
  // 1. Benchmark comparison
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

  // 2. Relative comparison (percentile among creators)
  const erPercentile = getPercentile(
    entry.engagementRate,
    allEntries.map((e) => e.engagementRate)
  );
  const viewsPercentile = getPercentile(
    entry.views,
    allEntries.map((e) => e.views)
  );

  // 3. Combined score (60% benchmark, 40% relative)
  const benchmarkScore = (erRatio + vrRatio + costRatio) / 3;
  const relativeScore = (erPercentile + viewsPercentile) / 2;
  const combinedScore = (benchmarkScore * 0.6) + (relativeScore * 0.4);

  if (combinedScore >= 1.5) return "WOW!";
  if (combinedScore >= 1.2) return "VIRAL";
  if (combinedScore >= 0.8) return "OK";
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
            <TableHead className="font-bold">Creator</TableHead>
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
                <StatusBadge status={getOverallStatus(entry, sortedEntries, benchmarks)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
