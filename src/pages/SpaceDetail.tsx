import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface Space {
  id: string;
  name: string;
  description: string | null;
  profile_image_url: string | null;
}

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const reportTypeIcons = {
  influencer: FileText,
  social: TrendingUp,
  ads: BarChart3,
};

const reportTypeColors = {
  influencer: "bg-accent",
  social: "bg-accent-green",
  ads: "bg-accent-blue",
};

const SpaceDetail = () => {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spaceId) {
      fetchSpaceAndReports();
    }
  }, [spaceId]);

  const fetchSpaceAndReports = async () => {
    try {
      const [spaceResponse, reportsResponse] = await Promise.all([
        supabase.from("spaces").select("*").eq("id", spaceId).single(),
        supabase
          .from("reports")
          .select("*")
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false }),
      ]);

      if (spaceResponse.error) throw spaceResponse.error;
      if (reportsResponse.error) throw reportsResponse.error;

      setSpace(spaceResponse.data);
      setReports(reportsResponse.data || []);
    } catch (error) {
      toast.error("Failed to load space details");
      navigate("/spaces");
    } finally {
      setLoading(false);
    }
  };

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
            <Button className="rounded-[35px]">
              <Plus className="w-5 h-5 mr-2" />
              New Report
            </Button>
          </div>
        </div>

        {/* Reports */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Reports</h2>
          {reports.length === 0 ? (
            <Card className="p-12 text-center rounded-[35px] border-foreground">
              <p className="text-muted-foreground mb-4">No reports yet</p>
              <Button className="rounded-[35px]">
                <Plus className="w-5 h-5 mr-2" />
                Create your first report
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => {
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
                        <p className="text-sm text-muted-foreground capitalize">
                          {report.type} • {report.status}
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
    </div>
  );
};

export default SpaceDetail;
