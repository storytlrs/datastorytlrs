import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

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
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="rounded-[35px] border border-foreground mb-8">
            <TabsTrigger value="overview" className="rounded-[35px]">
              Overview
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
            <TabsTrigger value="kpi" className="rounded-[35px]">
              KPI Targets
            </TabsTrigger>
            <TabsTrigger value="insights" className="rounded-[35px]">
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
              <p className="text-muted-foreground">
                KPI cards and overview metrics will be displayed here once data is imported.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="creators">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">Creator Performance</h2>
              <p className="text-muted-foreground">
                Creator scatter plots and performance tables will be displayed here.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">Content Analysis</h2>
              <p className="text-muted-foreground">
                Content grid with post previews and performance metrics will be displayed here.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="ads">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">Ads Performance</h2>
              <p className="text-muted-foreground">
                Campaign, adset, and ad performance metrics will be displayed here.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="kpi">
            <Card className="p-8 rounded-[35px] border-foreground">
              <h2 className="text-2xl font-bold mb-4">KPI Targets</h2>
              <p className="text-muted-foreground">
                Planned vs Actual KPI comparison will be displayed here.
              </p>
            </Card>
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
    </div>
  );
};

export default ReportDetail;
