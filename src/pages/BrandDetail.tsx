import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, User, TrendingUp, BarChart3, Search, Calendar as CalendarIcon, Image, Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subMonths } from "date-fns";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import CreateReportDialog from "@/components/reports/CreateReportDialog";
import { ReportContributors, Contributor } from "@/components/reports/ReportContributors";

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
  tiktok_id: string | null;
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
  const [tiktokSyncing, setTiktokSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; campaignName: string } | null>(null);
  const [reportContributors, setReportContributors] = useState<Record<string, Contributor[]>>({});
  
  
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
  const [projectFilterOpen, setProjectFilterOpen] = useState(false);
  
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

  const fetchReportContributors = async (reportIds: string[]) => {
    if (reportIds.length === 0) return;
    
    try {
      // Fetch all audit_log entries for the reports
      const { data: auditData, error: auditError } = await supabase
        .from("audit_log")
        .select("report_id, user_id")
        .in("report_id", reportIds);

      if (auditError) throw auditError;
      if (!auditData || auditData.length === 0) return;

      // Get unique user IDs per report
      const reportUserMap: Record<string, Set<string>> = {};
      auditData.forEach((entry) => {
        if (!reportUserMap[entry.report_id]) {
          reportUserMap[entry.report_id] = new Set();
        }
        reportUserMap[entry.report_id].add(entry.user_id);
      });

      // Fetch all unique user profiles
      const allUserIds = [...new Set(auditData.map((e) => e.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", allUserIds);

      if (profilesError) throw profilesError;

      // Create profile map
      const profilesMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      // Build contributors per report
      const contributorsMap: Record<string, Contributor[]> = {};
      Object.entries(reportUserMap).forEach(([reportId, userIds]) => {
        contributorsMap[reportId] = [...userIds]
          .map((userId) => {
            const profile = profilesMap.get(userId);
            if (!profile) return null;
            return {
              user_id: userId,
              full_name: profile.full_name,
              email: profile.email,
              avatar_url: profile.avatar_url,
            };
          })
          .filter((c): c is Contributor => c !== null);
      });

      setReportContributors(contributorsMap);
    } catch (error) {
      console.error("Failed to fetch report contributors:", error);
    }
  };

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
      
      // Fetch contributors for all reports
      const reportIds = (reportsResponse.data || []).map((r) => r.id);
      fetchReportContributors(reportIds);
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
            {canEdit && brand.tiktok_id && (
              <Button
                variant="outline"
                className="rounded-[35px]"
                disabled={tiktokSyncing}
                onClick={async () => {
                  setTiktokSyncing(true);
                  setSyncProgress(null);
                  try {
                    const session = (await supabase.auth.getSession()).data.session;
                    const headers = {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${session?.access_token}`,
                      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    };
                    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-tiktok-ads`;

                    // Step 1: Get campaign list
                    const listRes = await fetch(fnUrl, {
                      method: "POST",
                      headers,
                      body: JSON.stringify({ spaceId: brandId, listOnly: true }),
                    });
                    const listData = await listRes.json();
                    if (!listRes.ok || listData.error) {
                      toast.error(listData.error || "Failed to fetch campaigns");
                      return;
                    }

                    const campaigns = listData.campaigns || [];
                    if (campaigns.length === 0) {
                      toast.info("No TikTok campaigns found");
                      return;
                    }

                    // Step 2: Import each campaign individually
                    let totalAdGroups = 0;
                    let totalAds = 0;
                    let successCount = 0;

                    for (let i = 0; i < campaigns.length; i++) {
                      const c = campaigns[i];
                      setSyncProgress({ current: i + 1, total: campaigns.length, campaignName: c.campaign_name });
                      try {
                        const res = await fetch(fnUrl, {
                          method: "POST",
                          headers,
                          body: JSON.stringify({ spaceId: brandId, campaignId: c.campaign_id }),
                        });
                        const data = await res.json();
                        if (res.ok && !data.error) {
                          totalAdGroups += data.ad_groups_imported || 0;
                          totalAds += data.ads_imported || 0;
                          successCount++;
                        } else {
                          console.error(`Campaign ${c.campaign_id} failed:`, data.error);
                        }
                      } catch (e) {
                        console.error(`Campaign ${c.campaign_id} error:`, e);
                      }
                    }

                    toast.success(`Synced ${successCount} campaigns, ${totalAdGroups} ad groups, ${totalAds} ads`);
                  } catch (err) {
                    toast.error("TikTok sync failed");
                    console.error(err);
                  } finally {
                    setTiktokSyncing(false);
                    setSyncProgress(null);
                  }
                }}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", tiktokSyncing && "animate-spin")} />
                {syncProgress
                  ? `Syncing ${syncProgress.current}/${syncProgress.total}: ${syncProgress.campaignName}`
                  : tiktokSyncing
                    ? "Loading campaigns..."
                    : "Sync TikTok"}
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
              <DateRangeFilter
                dateRange={dashboardFilters.dateRange}
                onDateRangeChange={(range) => setDashboardFilters(prev => ({ ...prev, dateRange: range }))}
              />

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
            {/* Header with Search and New Report button */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-[35px]"
                />
              </div>
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

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <DateRangeFilter
                  dateRange={reportsDateRange}
                  onDateRangeChange={setReportsDateRange}
                />

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
                  <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={projectFilterOpen}
                        className={cn(
                          "w-[200px] justify-between rounded-[35px] hover:border-foreground hover:bg-foreground hover:text-background",
                          projectFilter !== "all"
                            ? "border-accent-orange bg-accent-orange text-foreground"
                            : "border-foreground bg-card text-foreground"
                        )}
                      >
                        {projectFilter === "all"
                          ? "All projects"
                          : projects.find((p) => p.id === projectFilter)?.name || "Project"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search projects..." />
                        <CommandList>
                          <CommandEmpty>No projects found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setProjectFilter("all");
                                setProjectFilterOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  projectFilter === "all" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              All projects
                            </CommandItem>
                            {projects.map((project) => (
                              <CommandItem
                                key={project.id}
                                value={project.name}
                                onSelect={() => {
                                  setProjectFilter(project.id);
                                  setProjectFilterOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    projectFilter === project.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {project.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
              <div className="border border-foreground rounded-[20px] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-foreground">
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Contributors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const Icon = reportTypeIcons[report.type];
                      const colorClass = reportTypeColors[report.type];

                      return (
                        <TableRow
                          key={report.id}
                          className="border-foreground cursor-pointer"
                          onClick={() => navigate(`/reports/${report.id}`)}
                        >
                          <TableCell>
                            <div
                              className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reportTypeLabels[report.type as keyof typeof reportTypeLabels]}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{report.status}</TableCell>
                          <TableCell>
                            {report.start_date
                              ? new Date(report.start_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {report.end_date
                              ? new Date(report.end_date).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <ReportContributors
                              contributors={reportContributors[report.id] || []}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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

      </div>
    </div>
  );
};

export default BrandDetail;
