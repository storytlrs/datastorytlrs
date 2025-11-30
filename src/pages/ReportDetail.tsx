import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { OverviewTab } from "@/components/reports/OverviewTab";
import { CreatorsTab } from "@/components/reports/CreatorsTab";
import { ContentTab } from "@/components/reports/ContentTab";
import { AdsTab } from "@/components/reports/AdsTab";
import { ImportDataDialog } from "@/components/reports/ImportDataDialog";
import { DataTab } from "@/components/reports/DataTab";

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  space_id: string;
}

const ReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

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
      navigate("/spaces");
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/spaces/${report.space_id}`)}
            className="mb-4 rounded-[35px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Space
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{report.name}</h1>
              <p className="text-muted-foreground capitalize">
                {report.type} Report • {report.status}
              </p>
              {report.start_date && report.end_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(report.start_date).toLocaleDateString()} -{" "}
                  {new Date(report.end_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              className="rounded-[35px]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="rounded-[35px] border border-foreground mb-8">
            <TabsTrigger value="overview" className="rounded-[35px]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-[35px]">
              Data
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
            <TabsTrigger value="insights" className="rounded-[35px]">
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="data">
            <DataTab reportId={reportId!} />
          </TabsContent>

          <TabsContent value="creators">
            <CreatorsTab />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab />
          </TabsContent>

          <TabsContent value="ads">
            <AdsTab />
          </TabsContent>

          <TabsContent value="insights">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">AI Insights</h2>
              <p className="text-muted-foreground">
                AI-generated performance summaries and strategic recommendations will be displayed here.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ImportDataDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        reportId={reportId!}
        onSuccess={fetchReport}
      />
    </div>
  );
};

export default ReportDetail;
