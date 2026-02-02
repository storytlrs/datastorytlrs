import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Save, Settings2, Pencil, Eye, RefreshCw, Download } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AIInsightsInputDialog, CampaignContext } from "./AIInsightsInputDialog";
import { AIInsightsContent } from "./AIInsightsContent";
import { AIInsightsContentPDF } from "./AIInsightsContentPDF";
interface AIInsightsTabProps {
  reportId: string;
}

interface CreatorPerformanceData {
  handle: string;
  avatar_url: string | null;
  platforms: string[];
  top_content: any | null;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  relevance: number | "high" | "medium" | "low"; // Support both old string and new number format
  key_insight: string;
  positive_topics: string[];
  negative_topics: string[];
}

interface KPITargets {
  overview: {
    creators: number;
    content: number;
    views: number;
    avgCpm: number;
  };
  innovation: {
    tswbCost: number;
    interactions: number;
    engagementRate: number;
    viralityRate: number;
  };
}

interface StructuredInsights {
  executive_summary: string;
  campaign_context: CampaignContext;
  top_content: any[];
  selected_top_content_ids?: string[];
  overview_metrics: {
    creators: number;
    content: number;
    views: number;
    avgCpm: number;
    currency: string;
  };
  innovation_metrics: {
    tswbCost: number;
    interactions: number;
    engagementRate: number;
    viralityRate: number;
    tswb: number;
    currency: string;
  };
  kpi_targets?: KPITargets;
  sentiment_analysis: {
    average: "positive" | "neutral" | "negative";
    summary: string;
  };
  top_sentiment_topics?: string[];
  leaderboard: any[];
  benchmarks: {
    engagementRate: number;
    viralityRate: number;
    tswbCost: number;
  };
  creator_performance: CreatorPerformanceData[];
  recommendations: {
    works: string[];
    doesnt_work: string[];
    suggestions: string[];
  };
  overview_summary?: string;
  innovation_summary?: string;
}

export const AIInsightsTab = ({ reportId }: AIInsightsTabProps) => {
  const { isAdmin, canEdit } = useUserRole();
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [spaceId, setSpaceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfMode, setIsPdfMode] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredInsights | null>(null);
  const [overviewParagraph, setOverviewParagraph] = useState<string>("");
  const [innovationParagraph, setInnovationParagraph] = useState<string>("");
  const [sentimentParagraph, setSentimentParagraph] = useState<string>("");
  const [reportMetadata, setReportMetadata] = useState<{
    name?: string;
    type?: string;
    status?: string;
    start_date?: string | null;
    end_date?: string | null;
  }>({});

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("ai_insights, ai_webhook_url, space_id, ai_insights_structured, ai_insights_context, name, type, status, start_date, end_date")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      setAiInsights(data.ai_insights || "");
      
      setSpaceId(data.space_id || "");
      
      if (data.ai_insights_structured) {
        const structured = data.ai_insights_structured as unknown as StructuredInsights;
        setStructuredData(structured);
        if (structured.sentiment_analysis?.summary) {
          setSentimentParagraph(structured.sentiment_analysis.summary);
        }
      }
      
      setReportMetadata({
        name: data.name,
        type: data.type,
        status: data.status,
        start_date: data.start_date,
        end_date: data.end_date,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Nepodařilo se načíst data");
    } finally {
      setIsLoading(false);
    }
  };


  const handleGenerateInsights = async (context: CampaignContext) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-insights", {
        body: { report_id: reportId, campaign_context: context },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Příliš mnoho požadavků. Zkuste to prosím později.");
        } else if (data.error.includes("Payment required")) {
          toast.error("Nedostatek kreditů. Doplňte prosím kredity ve workspace.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setStructuredData(data.structured_data);
      setOverviewParagraph(data.overview_paragraph || "");
      setInnovationParagraph(data.innovation_paragraph || "");
      setSentimentParagraph(data.sentiment_paragraph || "");
      setAiInsights(data.structured_data?.executive_summary || "");
      
      toast.success("AI Insights vygenerovány úspěšně!");
      setIsInputDialogOpen(false);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      toast.error("Nepodařilo se vygenerovat AI Insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!structuredData?.campaign_context) {
      toast.error("Chybí kontext kampaně. Použijte 'Generate AI Insights' pro první generování.");
      return;
    }
    await handleGenerateInsights(structuredData.campaign_context);
  };

  // Helper to wait for all images to load
  const waitForImages = (container: HTMLElement): Promise<void> => {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    return Promise.all(promises).then(() => {});
  };

  const handleExportPDF = async () => {
    if (!structuredData) return;
    
    setIsExporting(true);
    setIsPdfMode(true);
    
    try {
      // Wait for re-render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      
      // Wait a bit more for DOM to settle
      await new Promise(r => setTimeout(r, 200));
      
      if (!pdfRef.current) {
        throw new Error("PDF container not ready");
      }
      
      // Wait for images to load
      await waitForImages(pdfRef.current);
      
      // Step 1: Render to canvas
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#E9E9E9',
        width: 1100,
      });
      
      // Step 2: Get canvas dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Step 3: Convert to mm (96 DPI * scale factor)
      const pxToMm = 25.4 / (96 * 2); // 2 is the scale factor
      const pdfWidth = imgWidth * pxToMm;
      const pdfHeight = imgHeight * pxToMm;
      
      // Step 4: Create PDF with custom dimensions (single page)
      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight], // Custom size = one continuous page
      });
      
      // Step 5: Add image to fill entire page
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Step 6: Save
      pdf.save(`insights-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("PDF exportováno úspěšně!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Nepodařilo se exportovat PDF");
    } finally {
      setIsPdfMode(false);
      setIsExporting(false);
    }
  };

  const handleSaveInsights = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ ai_insights: aiInsights })
        .eq("id", reportId);

      if (error) throw error;
      toast.success("AI Insights uloženy");
    } catch (error) {
      console.error("Error saving AI insights:", error);
      toast.error("Nepodařilo se uložit AI Insights");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStructuredInsights = async (updates: Partial<StructuredInsights>) => {
    try {
      const updatedData = { ...structuredData, ...updates };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("reports")
        .update({ ai_insights_structured: updatedData as any })
        .eq("id", reportId);

      if (error) throw error;
      setStructuredData(updatedData as StructuredInsights);
      toast.success("Changes saved");
    } catch (error) {
      console.error("Error saving structured insights:", error);
      toast.error("Failed to save changes");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </Card>
    );
  }

  // Show structured view if we have structured data
  if (structuredData && !isEditing) {
    return (
      <>
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              variant="outline"
              className="rounded-[35px] border-foreground"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>
            {canEdit && (
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                variant="outline"
                className="rounded-[35px] border-foreground"
                title="Regenerovat AI Insights s existujícím kontextem"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            )}
          </div>

          <AIInsightsContent
            ref={contentRef}
            insights={structuredData}
            overviewParagraph={overviewParagraph}
            innovationParagraph={innovationParagraph}
            sentimentParagraph={sentimentParagraph}
            canEdit={canEdit}
            reportId={reportId}
            onSaveInsights={handleSaveStructuredInsights}
          />
        </div>

        {/* Hidden off-screen PDF render container */}
        {isPdfMode && structuredData && (
          <div style={{ position: 'fixed', left: '-10000px', top: 0 }}>
            <AIInsightsContentPDF
              ref={pdfRef}
              insights={structuredData}
              overviewParagraph={overviewParagraph}
              innovationParagraph={innovationParagraph}
              sentimentParagraph={sentimentParagraph}
              reportName={reportMetadata.name}
              reportType={reportMetadata.type}
              reportStatus={reportMetadata.status}
              startDate={reportMetadata.start_date}
              endDate={reportMetadata.end_date}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Card className="p-8 rounded-[35px] border-foreground">
        <div className="flex items-center justify-end mb-6">
          {canEdit && (
            <Button
              onClick={() => setIsInputDialogOpen(true)}
              disabled={isGenerating}
              className="rounded-[35px] bg-foreground text-background border border-foreground hover:bg-accent-green hover:text-foreground hover:border-accent-green disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate AI Insights
            </Button>
          )}
        </div>

        {!structuredData && (
          <div className="mb-6 p-4 bg-muted/50 rounded-[20px] border border-muted-foreground/20">
            <p className="text-sm text-muted-foreground">
              Klikněte na "Generate AI Insights" pro vygenerování AI analýzy kampaně.
            </p>
          </div>
        )}


        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="aiInsights">Obsah AI Insights (raw)</Label>
              <div className="flex items-center gap-2">
                {canEdit && structuredData && (
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="ghost"
                    size="sm"
                    className="rounded-[35px]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Strukturovaný náhled
                  </Button>
                )}
                {canEdit && (
                  <Button
                    onClick={handleSaveInsights}
                    disabled={isSaving}
                    variant="outline"
                    size="sm"
                    className="rounded-[35px] border-foreground"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Uložit změny
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="aiInsights"
              value={aiInsights}
              onChange={(e) => setAiInsights(e.target.value)}
              placeholder="AI-generated performance summaries and strategic recommendations will be displayed here..."
              className="min-h-[300px] rounded-[20px] border-foreground font-mono text-sm"
              readOnly={!canEdit}
            />
          </div>
        </div>
      </Card>

      <AIInsightsInputDialog
        open={isInputDialogOpen}
        onOpenChange={setIsInputDialogOpen}
        onSubmit={handleGenerateInsights}
        isGenerating={isGenerating}
      />
    </>
  );
};
