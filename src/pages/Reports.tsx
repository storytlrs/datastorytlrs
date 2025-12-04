import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, TrendingUp, BarChart3, Calendar as CalendarIcon, Image } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads" | "always_on";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  space_id: string;
  space?: { id: string; name: string } | null;
}

const reportTypeIcons = {
  influencer: FileText,
  social: Image,
  ads: BarChart3,
  always_on: Image,
};

const reportTypeColors = {
  influencer: "bg-accent",
  social: "bg-accent",
  ads: "bg-accent-blue",
  always_on: "bg-accent",
};

const reportTypeLabels = {
  influencer: "Influencer campaign",
  ads: "Ads campaign",
  always_on: "Always-on content",
  social: "Always-on content",
};

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*, space:spaces(id, name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (searchQuery && !report.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== "all" && report.type !== typeFilter) {
        return false;
      }
      if (dateRange.start && report.start_date) {
        if (new Date(report.start_date) < dateRange.start) return false;
      }
      if (dateRange.end && report.end_date) {
        if (new Date(report.end_date) > dateRange.end) return false;
      }
      return true;
    });
  }, [reports, searchQuery, typeFilter, dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reports</h1>
          <p className="text-muted-foreground">All your reports across spaces</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-[35px] border-foreground"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Date Range Start */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                    dateRange.start
                      ? "border-accent-orange bg-accent-orange text-foreground"
                      : "border-foreground bg-card text-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.start ? format(dateRange.start, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.start || undefined}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, start: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date Range End */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                    dateRange.end
                      ? "border-accent-orange bg-accent-orange text-foreground"
                      : "border-foreground bg-card text-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.end ? format(dateRange.end, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.end || undefined}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, end: date || null }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={cn(
                "w-[200px] rounded-[35px]",
                typeFilter !== "all"
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : ""
              )}>
                <SelectValue placeholder="Report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="influencer">Influencer campaign</SelectItem>
                <SelectItem value="ads">Ads campaign</SelectItem>
                <SelectItem value="always_on">Always-on content</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchQuery || typeFilter !== "all" || dateRange.start || dateRange.end) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setDateRange({ start: null, end: null });
                }}
                className="rounded-[35px]"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <Card className="p-12 text-center rounded-[35px] border-foreground">
            <p className="text-muted-foreground">
              {reports.length === 0 ? "No reports yet" : "No reports match your filters"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const Icon = reportTypeIcons[report.type];
              const colorClass = reportTypeColors[report.type];

              return (
                <Card
                  key={report.id}
                  className="p-6 cursor-pointer transition-all hover:shadow-lg border-foreground rounded-[35px]"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-[35px] ${colorClass} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 truncate">
                        {report.name}
                      </h3>
                      <Badge variant="outline" className="mb-2">
                        {reportTypeLabels[report.type as keyof typeof reportTypeLabels]}
                      </Badge>
                      {report.space && (
                        <p className="text-sm text-muted-foreground">
                          {report.space.name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground capitalize">
                        {report.status}
                      </p>
                      {report.start_date && report.end_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(report.start_date).toLocaleDateString()} -{" "}
                          {new Date(report.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
