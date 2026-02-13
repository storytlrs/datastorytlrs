import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Save, Eye, RefreshCw, Download } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { AIInsightsInputDialog, CampaignContext } from "./AIInsightsInputDialog";
import { AdsAIInsightsContent, AdsStructuredInsights } from "./AdsAIInsightsContent";
import { MonthlyAdsInsightsContent, MonthlyStructuredInsights } from "./MonthlyAdsInsightsContent";
import { QuarterlyAdsInsightsContent, QuarterlyStructuredInsights } from "./QuarterlyAdsInsightsContent";
import { YearlyAdsInsightsContent, YearlyStructuredInsights } from "./YearlyAdsInsightsContent";
import { CampaignAdsInsightsContent, CampaignStructuredInsights } from "./CampaignAdsInsightsContent";

interface AdsAIInsightsTabProps {
  reportId: string;
}

export const AdsAIInsightsTab = ({ reportId }: AdsAIInsightsTabProps) => {
  const { canEdit } = useUserRole();
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [aiInsights, setAiInsights] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
  const [structuredData, setStructuredData] = useState<any | null>(null);
  const [reportPeriod, setReportPeriod] = useState<string>("campaign");
  const [awarenessParagraph, setAwarenessParagraph] = useState("");
  const [engagementParagraph, setEngagementParagraph] = useState("");
  const [effectivenessParagraph, setEffectivenessParagraph] = useState("");

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("ai_insights, ai_insights_structured, ai_insights_context, period")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      setAiInsights(data.ai_insights || "");
      setReportPeriod(data.period || "campaign");

      if (data.ai_insights_structured) {
        const structured = data.ai_insights_structured as any;
        setStructuredData(structured);

        // For default reports, set paragraph states
        if (structured.report_period !== "monthly") {
          setAwarenessParagraph(structured.awareness_summary || "");
          setEngagementParagraph(structured.engagement_summary || "");
          setEffectivenessParagraph(structured.effectiveness_summary || "");
        }
      }
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
      const { data, error } = await supabase.functions.invoke("generate-ads-ai-insights", {
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
      setAiInsights(data.structured_data?.executive_summary || "");

      if (data.structured_data?.report_period !== "monthly") {
        setAwarenessParagraph(data.awareness_summary || "");
        setEngagementParagraph(data.engagement_summary || "");
        setEffectivenessParagraph(data.effectiveness_summary || "");
      }

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
      toast.error("Chybí kontext kampaně. Použijte 'Generate AI Insights'.");
      return;
    }
    await handleGenerateInsights(structuredData.campaign_context);
  };

  const handleExportPDF = async () => {
    if (!structuredData) return;
    setIsExporting(true);
    setIsPdfMode(true);

    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      await new Promise((r) => setTimeout(r, 200));

      if (!pdfRef.current) throw new Error("PDF container not ready");

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: "#E9E9E9", width: 1100,
      });

      const pxToMm = 25.4 / (96 * 2);
      const pdfWidth = canvas.width * pxToMm;
      const pdfHeight = canvas.height * pxToMm;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm", format: [pdfWidth, pdfHeight],
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ads-insights-${new Date().toISOString().split("T")[0]}.pdf`);

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
      console.error("Error saving:", error);
      toast.error("Nepodařilo se uložit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStructuredInsights = async (updates: Record<string, any>) => {
    try {
      const updatedData = { ...structuredData, ...updates };
      const { error } = await supabase
        .from("reports")
        .update({ ai_insights_structured: updatedData as any })
        .eq("id", reportId);

      if (error) throw error;
      setStructuredData(updatedData);
      toast.success("Changes saved");
    } catch (error) {
      console.error("Error saving:", error);
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

  const isCampaign = structuredData?.report_period === "campaign" || (reportPeriod === "campaign" && structuredData);
  const isMonthly = structuredData?.report_period === "monthly" || (reportPeriod === "monthly" && structuredData);
  const isQuarterly = structuredData?.report_period === "quarterly" || (reportPeriod === "quarterly" && structuredData);
  const isYearly = structuredData?.report_period === "yearly" || (reportPeriod === "yearly" && structuredData);

  // Structured view
  if (structuredData && !isEditing) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="rounded-[35px] border-foreground">
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
            {canEdit && (
              <Button onClick={handleRegenerate} disabled={isGenerating} variant="outline" className="rounded-[35px] border-foreground" title="Regenerovat AI Insights s existujícím kontextem">
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Regenerate
              </Button>
            )}
          </div>

          {isCampaign ? (
            <CampaignAdsInsightsContent
              ref={contentRef}
              insights={structuredData as CampaignStructuredInsights}
              canEdit={canEdit}
              onSaveInsights={handleSaveStructuredInsights}
            />
          ) : isMonthly ? (
            <MonthlyAdsInsightsContent
              ref={contentRef}
              insights={structuredData as MonthlyStructuredInsights}
              canEdit={canEdit}
              onSaveInsights={handleSaveStructuredInsights}
            />
          ) : isQuarterly ? (
            <QuarterlyAdsInsightsContent
              ref={contentRef}
              insights={structuredData as QuarterlyStructuredInsights}
              canEdit={canEdit}
              onSaveInsights={handleSaveStructuredInsights}
            />
          ) : isYearly ? (
            <YearlyAdsInsightsContent
              ref={contentRef}
              insights={structuredData as YearlyStructuredInsights}
              canEdit={canEdit}
              onSaveInsights={handleSaveStructuredInsights}
            />
          ) : (
            <AdsAIInsightsContent
              ref={contentRef}
              insights={structuredData as AdsStructuredInsights}
              awarenessParagraph={awarenessParagraph}
              engagementParagraph={engagementParagraph}
              effectivenessParagraph={effectivenessParagraph}
              canEdit={canEdit}
              onSaveInsights={handleSaveStructuredInsights}
            />
          )}
        </div>

        {isPdfMode && structuredData && (
          <div style={{ position: "fixed", left: "-10000px", top: 0 }}>
            {isCampaign ? (
              <CampaignAdsInsightsContent
                ref={pdfRef}
                insights={structuredData as CampaignStructuredInsights}
              />
            ) : isMonthly ? (
              <MonthlyAdsInsightsContent
                ref={pdfRef}
                insights={structuredData as MonthlyStructuredInsights}
              />
            ) : isQuarterly ? (
              <QuarterlyAdsInsightsContent
                ref={pdfRef}
                insights={structuredData as QuarterlyStructuredInsights}
              />
            ) : isYearly ? (
              <YearlyAdsInsightsContent
                ref={pdfRef}
                insights={structuredData as YearlyStructuredInsights}
              />
            ) : (
              <AdsAIInsightsContent
                ref={pdfRef}
                insights={structuredData as AdsStructuredInsights}
                awarenessParagraph={awarenessParagraph}
                engagementParagraph={engagementParagraph}
                effectivenessParagraph={effectivenessParagraph}
              />
            )}
          </div>
        )}
      </>
    );
  }

  // Empty / raw state
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
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate AI Insights
            </Button>
          )}
        </div>

        {!structuredData && (
          <div className="mb-6 p-4 bg-muted/50 rounded-[20px] border border-muted-foreground/20">
            <p className="text-sm text-muted-foreground">
              Klikněte na "Generate AI Insights" pro vygenerování AI analýzy ads kampaně.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="aiInsights">Obsah AI Insights (raw)</Label>
              <div className="flex items-center gap-2">
                {canEdit && structuredData && (
                  <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" className="rounded-[35px]">
                    <Eye className="w-4 h-4 mr-2" /> Strukturovaný náhled
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={handleSaveInsights} disabled={isSaving} variant="outline" size="sm" className="rounded-[35px] border-foreground">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Uložit změny
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="aiInsights"
              value={aiInsights}
              onChange={(e) => setAiInsights(e.target.value)}
              placeholder="AI-generated ad campaign analysis will be displayed here..."
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
