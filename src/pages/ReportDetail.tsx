import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { OverviewTab } from "@/components/reports/OverviewTab";
import { CreatorsTab } from "@/components/reports/CreatorsTab";
import { ContentTab } from "@/components/reports/ContentTab";
import { AdsTab } from "@/components/reports/AdsTab";
import { DataTab } from "@/components/reports/DataTab";
import { EditReportDialog } from "@/components/reports/EditReportDialog";
import { useUserRole } from "@/hooks/useUserRole";
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
  const {
    reportId
  } = useParams();
  const navigate = useNavigate();
  const {
    isAdmin,
    canEdit
  } = useUserRole();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);
  const fetchReport = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("reports").select("*").eq("id", reportId).single();
      if (error) throw error;
      setReport(data);
    } catch (error) {
      toast.error("Failed to load report");
      navigate("/spaces");
    } finally {
      setLoading(false);
    }
  };
  const handlePublish = async () => {
    try {
      const {
        error
      } = await supabase.from("reports").update({
        status: "active"
      }).eq("id", reportId);
      if (error) throw error;
      toast.success("Report published successfully");
      fetchReport();
    } catch (error) {
      toast.error("Failed to publish report");
    }
  };
  const handleUnpublish = async () => {
    try {
      const {
        error
      } = await supabase.from("reports").update({
        status: "draft"
      }).eq("id", reportId);
      if (error) throw error;
      toast.success("Report unpublished successfully");
      fetchReport();
    } catch (error) {
      toast.error("Failed to unpublish report");
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <p>Loading report...</p>
      </div>;
  }
  if (!report) {
    return null;
  }
  return <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(`/spaces/${report.space_id}`)} className="mb-4 rounded-[35px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Space
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{report.name}</h1>
              <p className="text-muted-foreground capitalize">
                {report.type === "always_on" ? "Always-on content" : report.type === "social" ? "Always-on content" : `${report.type} campaign`} • {report.status === "active" ? "Published" : report.status}
              </p>
              {report.start_date && report.end_date && <p className="text-sm text-muted-foreground mt-1">
                  {new Date(report.start_date).toLocaleDateString()} -{" "}
                  {new Date(report.end_date).toLocaleDateString()}
                </p>}
            </div>
            
            <div className="flex items-center gap-2">
              {canEdit && report.status === "draft" && <Button onClick={handlePublish} className="rounded-[35px] bg-foreground text-background border border-foreground hover:bg-[#57DC64] hover:text-foreground hover:border-[#57DC64]">
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>}
              {canEdit && report.status === "active" && <Button variant="outline" onClick={handleUnpublish} className="rounded-[35px] border-foreground">
                  Unpublish
                </Button>}
              {isAdmin && <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="rounded-[35px] border-foreground text-center">
                  <Settings className="w-4 h-4 mr-2" />
                  ​
                </Button>}
            </div>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="rounded-[35px] border border-foreground mb-8">
            <TabsTrigger value="overview" className="rounded-[35px]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="insights" className="rounded-[35px]">
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="creators" className="rounded-[35px]">
              Creators
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-[35px]">
              Content
            </TabsTrigger>
            <TabsTrigger value="ads" className="rounded-[35px]">
              Ads
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-[35px]">
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab reportId={reportId!} />
          </TabsContent>

          <TabsContent value="data">
            <DataTab reportId={reportId!} onImportSuccess={fetchReport} />
          </TabsContent>

          <TabsContent value="creators">
            <CreatorsTab reportId={reportId!} />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab reportId={reportId!} />
          </TabsContent>

          <TabsContent value="ads">
            <AdsTab />
          </TabsContent>

          <TabsContent value="insights">
            <Card className="p-8 rounded-[35px] border-foreground">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">AI Insights</h2>
                <Button className="rounded-[35px]">
                  Generate AI Insights
                </Button>
              </div>
              <p className="text-muted-foreground">
                AI-generated performance summaries and strategic recommendations will be displayed here.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {report && <EditReportDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} report={report} onSuccess={fetchReport} />}
    </div>;
};
export default ReportDetail;