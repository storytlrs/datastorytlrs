import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandContentDashboard from "./BrandContentDashboard";
import BrandAdsDashboard from "./BrandAdsDashboard";
import BrandInfluencersDashboard from "./BrandInfluencersDashboard";

interface BrandOverviewTabProps {
  spaceId: string;
}

interface OverviewFilters {
  dateRange: { start: Date | null; end: Date | null };
  platform: string;
}

const BrandOverviewTab = ({ spaceId }: BrandOverviewTabProps) => {
  const [activeTab, setActiveTab] = useState("content");
  const [filters, setFilters] = useState<OverviewFilters>({
    dateRange: {
      start: subMonths(new Date(), 12),
      end: new Date(),
    },
    platform: "all",
  });

  const hasActiveFilters = filters.dateRange.start || filters.dateRange.end || filters.platform !== "all";

  const clearFilters = () => {
    setFilters({
      dateRange: { start: null, end: null },
      platform: "all",
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
        </TabsList>

        {/* Filters - shared across all tabs */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                  filters.dateRange.start
                    ? "border-accent-orange bg-accent-orange text-foreground"
                    : "border-foreground bg-card text-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.start ? format(filters.dateRange.start, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.start || undefined}
                onSelect={(date) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: date || null }
                }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                  filters.dateRange.end
                    ? "border-accent-orange bg-accent-orange text-foreground"
                    : "border-foreground bg-card text-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.end ? format(filters.dateRange.end, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateRange.end || undefined}
                onSelect={(date) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: date || null }
                }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select
            value={filters.platform}
            onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}
          >
            <SelectTrigger className={cn(
              "w-[160px] rounded-[35px]",
              filters.platform !== "all"
                ? "border-accent-orange bg-accent-orange text-foreground"
                : ""
            )}>
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="rounded-[35px]"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Tab contents */}
        <TabsContent value="content" className="mt-0">
          <BrandContentDashboard spaceId={spaceId} filters={filters} />
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <BrandAdsDashboard spaceId={spaceId} filters={filters} />
        </TabsContent>

        <TabsContent value="influencers" className="mt-0">
          <BrandInfluencersDashboard spaceId={spaceId} filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandOverviewTab;
