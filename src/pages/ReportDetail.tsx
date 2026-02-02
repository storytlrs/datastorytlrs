import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logReportAction } from "@/lib/auditLog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Send, ArrowLeft, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { OverviewTab } from "@/components/reports/OverviewTab";
import { CreatorsTab } from "@/components/reports/CreatorsTab";
import { ContentTab } from "@/components/reports/ContentTab";
import { DataTab } from "@/components/reports/DataTab";
import { AdCreativesTab } from "@/components/reports/AdCreativesTab";
import { AdsDataTab } from "@/components/reports/AdsDataTab";
import { AlwaysOnDataTab } from "@/components/reports/AlwaysOnDataTab";
import { AIInsightsTab } from "@/components/reports/AIInsightsTab";
import { EditReportDialog } from "@/components/reports/EditReportDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { ReportContributors, Contributor } from "@/components/reports/ReportContributors";
import { ReportActivityLog } from "@/components/reports/ReportActivityLog";

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads" | "always_on";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  space_id: string;
  project_id?: string | null;
}

const ReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canEdit } = useUserRole();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchReport();
      fetchContributors();
    }
  }, [reportId]);

  const fetchContributors = async () => {
    try {
      // First fetch distinct user_ids from audit_log
      const { data: auditData, error: auditError } = await supabase
        .from("audit_log")
        .select("user_id")
        .eq("report_id", reportId);

      if (auditError) throw auditError;

      if (!auditData || auditData.length === 0) {
        setContributors([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(auditData.map((e) => e.user_id))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const contributors: Contributor[] = (profilesData || []).map((p) => ({
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
      }));

      setContributors(contributors);
    } catch (error) {
      console.error("Failed to fetch contributors:", error);
    }
  };

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (error) throw error;
      setReport(data);
    } catch (error) {
      toast.error("Failed to load report");
      navigate("/brands");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "active" })
        .eq("id", reportId);
      if (error) throw error;
      await logReportAction(reportId!, "publish");
      toast.success("Report published successfully");
      fetchReport();
      fetchContributors();
    } catch (error) {
      toast.error("Failed to publish report");
    }
  };

  const handleUnpublish = async () => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "draft" })
        .eq("id", reportId);
      if (error) throw error;
      await logReportAction(reportId!, "unpublish");
      toast.success("Report unpublished successfully");
      fetchReport();
      fetchContributors();
    } catch (error) {
      toast.error("Failed to unpublish report");
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case "influencer":
        return "Influencer campaign";
      case "ads":
        return "Ads campaign";
      case "always_on":
      case "social":
        return "Always-on content";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  // Determine which tabs to show based on report type
  const isInfluencer = report.type === "influencer";
  const isAds = report.type === "ads";
  const isAlwaysOn = report.type === "always_on" || report.type === "social";

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/brands/${report.space_id}?tab=reports`)}
                className="p-0 h-auto font-normal text-muted-foreground rounded-[35px] px-2 mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                All reports
              </Button>
              <h1 className="text-4xl font-bold mb-2">{report.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                <span>
                  {getReportTypeLabel(report.type)} •{" "}
                  {report.status === "active" ? "Published" : report.status}
                </span>
                {contributors.length > 0 && (
                  <>
                    <span>•</span>
                    <ReportContributors contributors={contributors} />
                  </>
                )}
              </div>
              {report.start_date && report.end_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(report.start_date).toLocaleDateString()} -{" "}
                  {new Date(report.end_date).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canEdit && report.status === "draft" && (
                <Button
                  onClick={handlePublish}
                  className="rounded-[35px] bg-foreground text-background border border-foreground hover:bg-[#57DC64] hover:text-foreground hover:border-[#57DC64]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              )}
              {canEdit && report.status === "active" && (
                <Button
                  variant="outline"
                  onClick={handleUnpublish}
                  className="rounded-[35px] border-foreground"
                >
                  Unpublish
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsLogOpen(true)}
                className="rounded-[35px]"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Log
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(true)}
                  size="icon"
                  className="rounded-[35px] border-foreground"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Report Tabs - Conditional based on report type */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-8">
            {/* Common tabs for all report types */}
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>

            {/* Influencer-specific tabs */}
            {isInfluencer && (
              <>
                <TabsTrigger value="creators">Creators</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </>
            )}

            {/* Ads Campaign tabs */}
            {isAds && (
              <>
                <TabsTrigger value="ad-creatives">Ad Creatives</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </>
            )}

            {/* Always-on Content tabs */}
            {isAlwaysOn && (
              <>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Common tab content */}
          <TabsContent value="overview">
            <OverviewTab reportId={reportId!} />
          </TabsContent>

          <TabsContent value="insights">
            <AIInsightsTab reportId={reportId!} />
          </TabsContent>

          {/* Influencer-specific content */}
          {isInfluencer && (
            <>
              <TabsContent value="creators">
                <CreatorsTab reportId={reportId!} />
              </TabsContent>

              <TabsContent value="content">
                <ContentTab reportId={reportId!} />
              </TabsContent>


              <TabsContent value="data">
                <DataTab reportId={reportId!} onImportSuccess={fetchReport} />
              </TabsContent>
            </>
          )}

          {/* Ads Campaign content */}
          {isAds && (
            <>
              <TabsContent value="ad-creatives">
                <AdCreativesTab reportId={reportId!} />
              </TabsContent>

              <TabsContent value="data">
                <AdsDataTab reportId={reportId!} onImportSuccess={fetchReport} />
              </TabsContent>
            </>
          )}

          {/* Always-on Content */}
          {isAlwaysOn && (
            <>
              <TabsContent value="content">
                <ContentTab reportId={reportId!} />
              </TabsContent>

              <TabsContent value="data">
                <AlwaysOnDataTab reportId={reportId!} onImportSuccess={fetchReport} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <ReportActivityLog
        reportId={reportId!}
        open={isLogOpen}
        onOpenChange={setIsLogOpen}
      />

      {report && (
        <EditReportDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          report={report}
          onSuccess={fetchReport}
        />
      )}
    </div>
  );
};

export default ReportDetail;
