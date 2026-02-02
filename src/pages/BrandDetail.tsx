import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, User, TrendingUp, BarChart3, Search, Calendar as CalendarIcon, Settings, Image } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import CreateReportDialog from "@/components/reports/CreateReportDialog";
import EditBrandDialog from "@/components/brands/EditBrandDialog";
import BrandContentDashboard from "@/components/brands/BrandContentDashboard";
import BrandAdsDashboard from "@/components/brands/BrandAdsDashboard";
import BrandInfluencersDashboard from "@/components/brands/BrandInfluencersDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads" | "always_on";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  project_id: string | null;
  project?: { id: string; name: string } | null;
}

const reportTypeIcons = {
  influencer: User,
  social: Image,
  ads: BarChart3,
  always_on: Image,
};

const reportTypeColors = {
  influencer: "bg-accent-orange",
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

const BrandDetail = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, isAdmin, canEdit } = useUserRole();
  
  // Handle tab with backwards compatibility (overview -> content)
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "overview" ? "content" : (tabParam || "content");
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Dashboard filter states (shared across Content, Ads, Influencers tabs)
  const [dashboardFilters, setDashboardFilters] = useState({
    dateRange: {
      start: subMonths(new Date(), 12),
      end: new Date(),
    },
    platform: "all",
  });
  
  // Reports filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsDateRange, setReportsDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  const showProjectFilter = role === "admin" || role === "analyst";
  const showDashboardFilters = ["content", "ads", "influencers"].includes(defaultTab);
  const hasDashboardFilters = dashboardFilters.dateRange.start || dashboardFilters.dateRange.end || dashboardFilters.platform !== "all";
  
  const clearDashboardFilters = () => {
    setDashboardFilters({
      dateRange: { start: null, end: null },
      platform: "all",
    });
  };

  useEffect(() => {
    if (brandId) {
      fetchBrandAndReports();
    }
  }, [brandId]);

  const fetchBrandAndReports = async () => {
    try {
      const [brandResponse, reportsResponse, projectsResponse] = await Promise.all([
        supabase.from("spaces").select("*").eq("id", brandId).single(),
        supabase
          .from("reports")
          .select("*, project:projects(id, name)")
          .eq("space_id", brandId)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("space_id", brandId)
          .order("name"),
      ]);

      if (brandResponse.error) throw brandResponse.error;
      if (reportsResponse.error) throw reportsResponse.error;

      setBrand(brandResponse.data);
      setReports(reportsResponse.data || []);
      setProjects(projectsResponse.data || []);
    } catch (error) {
      toast.error("Failed to load brand details");
      navigate("/brands");
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
      if (showProjectFilter && projectFilter !== "all" && report.project_id !== projectFilter) {
        return false;
      }
      if (reportsDateRange.start && report.start_date) {
        if (new Date(report.start_date) < reportsDateRange.start) return false;
      }
      if (reportsDateRange.end && report.end_date) {
        if (new Date(report.end_date) > reportsDateRange.end) return false;
      }
      return true;
    });
  }, [reports, searchQuery, typeFilter, projectFilter, reportsDateRange, showProjectFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{brand.name}</h1>
              {brand.description && (
                <p className="text-muted-foreground">{brand.description}</p>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                size="icon"
                className="rounded-[35px] border-foreground"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="ads">Ads</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Dashboard Filters - shared across Content, Ads, Influencers tabs */}
          {showDashboardFilters && (
            <div className="flex flex-wrap gap-3 mb-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                      dashboardFilters.dateRange.start
                        ? "border-accent-orange bg-accent-orange text-foreground"
                        : "border-foreground bg-card text-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dashboardFilters.dateRange.start ? format(dashboardFilters.dateRange.start, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dashboardFilters.dateRange.start || undefined}
                    onSelect={(date) => setDashboardFilters(prev => ({
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
                      dashboardFilters.dateRange.end
                        ? "border-accent-orange bg-accent-orange text-foreground"
                        : "border-foreground bg-card text-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dashboardFilters.dateRange.end ? format(dashboardFilters.dateRange.end, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dashboardFilters.dateRange.end || undefined}
                    onSelect={(date) => setDashboardFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: date || null }
                    }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={dashboardFilters.platform}
                onValueChange={(value) => setDashboardFilters(prev => ({ ...prev, platform: value }))}
              >
                <SelectTrigger className={cn(
                  "w-[160px] rounded-[35px]",
                  dashboardFilters.platform !== "all"
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

              {hasDashboardFilters && (
                <Button
                  variant="ghost"
                  onClick={clearDashboardFilters}
                  className="rounded-[35px]"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}

          <TabsContent value="content" className="mt-0">
            <BrandContentDashboard spaceId={brandId!} filters={dashboardFilters} />
          </TabsContent>

          <TabsContent value="ads" className="mt-0">
            <BrandAdsDashboard spaceId={brandId!} filters={dashboardFilters} />
          </TabsContent>

          <TabsContent value="influencers" className="mt-0">
            <BrandInfluencersDashboard spaceId={brandId!} filters={dashboardFilters} />
          </TabsContent>

          <TabsContent value="insights">
            <Card className="p-8 rounded-[35px] border-foreground">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Insights</h2>
                <Button className="rounded-[35px]">
                  Generate AI Insights
                </Button>
              </div>
              <p className="text-muted-foreground">
                AI-generated performance summaries and strategic recommendations for this brand will be displayed here.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            {/* Header with New Report button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Reports</h2>
              {canEdit && (
                <Button 
                  className="rounded-[35px]"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Report
                </Button>
              )}
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
                  className="pl-10 rounded-[35px]"
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
                        reportsDateRange.start
                          ? "border-accent-orange bg-accent-orange text-foreground"
                          : "border-foreground bg-card text-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportsDateRange.start ? format(reportsDateRange.start, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reportsDateRange.start || undefined}
                      onSelect={(date) => setReportsDateRange(prev => ({ ...prev, start: date || null }))}
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
                        reportsDateRange.end
                          ? "border-accent-orange bg-accent-orange text-foreground"
                          : "border-foreground bg-card text-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reportsDateRange.end ? format(reportsDateRange.end, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reportsDateRange.end || undefined}
                      onSelect={(date) => setReportsDateRange(prev => ({ ...prev, end: date || null }))}
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

                {/* Project Filter (Admin/Analyst only) */}
                {showProjectFilter && (
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className={cn(
                      "w-[200px] rounded-[35px]",
                      projectFilter !== "all"
                        ? "border-accent-orange bg-accent-orange text-foreground"
                        : ""
                    )}>
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Clear Filters */}
                {(searchQuery || typeFilter !== "all" || projectFilter !== "all" || reportsDateRange.start || reportsDateRange.end) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setProjectFilter("all");
                      setReportsDateRange({ start: null, end: null });
                    }}
                    className="rounded-[35px]"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <Card className="p-12 text-center rounded-[35px] border-foreground">
                <p className="text-muted-foreground mb-4">
                  {reports.length === 0 ? "No reports yet" : "No reports match your filters"}
                </p>
                {reports.length === 0 && canEdit && (
                  <Button 
                    className="rounded-[35px]"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create your first report
                  </Button>
                )}
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
          </TabsContent>
        </Tabs>

        <CreateReportDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          spaceId={brandId!}
          onSuccess={fetchBrandAndReports}
        />

        {brand && (
          <EditBrandDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            brand={brand}
            onSuccess={fetchBrandAndReports}
          />
        )}
      </div>
    </div>
  );
};

export default BrandDetail;
