import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, TrendingUp, BarChart3, Search, Calendar as CalendarIcon, Settings } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import CreateReportDialog from "@/components/reports/CreateReportDialog";
import EditSpaceDialog from "@/components/spaces/EditSpaceDialog";
import SpaceOverviewTab from "@/components/spaces/SpaceOverviewTab";
import { useUserRole } from "@/hooks/useUserRole";

interface Space {
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
  influencer: FileText,
  social: TrendingUp,
  ads: BarChart3,
  always_on: TrendingUp,
};

const reportTypeColors = {
  influencer: "bg-accent",
  social: "bg-accent-green",
  ads: "bg-accent-blue",
  always_on: "bg-accent-green",
};

const reportTypeLabels = {
  influencer: "Influencer campaign",
  ads: "Ads campaign",
  always_on: "Always-on content",
  social: "Always-on content",
};

const SpaceDetail = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const { role, isAdmin, canEdit } = useUserRole();
  const [space, setSpace] = useState<Space | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  const showProjectFilter = role === "admin" || role === "analyst";

  useEffect(() => {
    if (spaceId) {
      fetchSpaceAndReports();
    }
  }, [spaceId]);

  const fetchSpaceAndReports = async () => {
    try {
      const [spaceResponse, reportsResponse, projectsResponse] = await Promise.all([
        supabase.from("spaces").select("*").eq("id", spaceId).single(),
        supabase
          .from("reports")
          .select("*, project:projects(id, name)")
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("space_id", spaceId)
          .order("name"),
      ]);

      if (spaceResponse.error) throw spaceResponse.error;
      if (reportsResponse.error) throw reportsResponse.error;

      setSpace(spaceResponse.data);
      setReports(reportsResponse.data || []);
      setProjects(projectsResponse.data || []);
    } catch (error) {
      toast.error("Failed to load space details");
      navigate("/spaces");
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
      if (dateRange.start && report.start_date) {
        if (new Date(report.start_date) < dateRange.start) return false;
      }
      if (dateRange.end && report.end_date) {
        if (new Date(report.end_date) > dateRange.end) return false;
      }
      return true;
    });
  }, [reports, searchQuery, typeFilter, projectFilter, dateRange, showProjectFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!space) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/spaces")}
            className="mb-4 rounded-[35px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Spaces
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{space.name}</h1>
              {space.description && (
                <p className="text-muted-foreground">{space.description}</p>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-[35px]"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="rounded-[35px] border border-foreground mb-8">
            <TabsTrigger value="overview" className="rounded-[35px]">Overview</TabsTrigger>
            <TabsTrigger value="insights" className="rounded-[35px]">AI Insights</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-[35px]">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SpaceOverviewTab spaceId={spaceId!} />
          </TabsContent>

          <TabsContent value="insights">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">AI Insights</h2>
              <p className="text-muted-foreground">
                AI-generated performance summaries and strategic recommendations for this space will be displayed here.
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
                    <Button variant="outline" className="rounded-[35px] justify-start text-left font-normal">
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
                    <Button variant="outline" className="rounded-[35px] justify-start text-left font-normal">
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
                  <SelectTrigger className="w-[200px] rounded-[35px]">
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
                    <SelectTrigger className="w-[200px] rounded-[35px]">
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
                {(searchQuery || typeFilter !== "all" || projectFilter !== "all" || dateRange.start || dateRange.end) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setProjectFilter("all");
                      setDateRange({ start: null, end: null });
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
          spaceId={spaceId!}
          onSuccess={fetchSpaceAndReports}
        />

        {space && (
          <EditSpaceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            space={space}
            onSuccess={fetchSpaceAndReports}
          />
        )}
      </div>
    </div>
  );
};

export default SpaceDetail;
