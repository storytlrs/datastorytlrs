import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Save, Settings2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AIInsightsTabProps {
  reportId: string;
}

export const AIInsightsTab = ({ reportId }: AIInsightsTabProps) => {
  const { canEdit } = useUserRole();
  const [aiInsights, setAiInsights] = useState<string>("");
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [reportId]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("ai_insights, ai_webhook_url")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      setAiInsights(data.ai_insights || "");
      setWebhookUrl(data.ai_webhook_url || "");
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Nepodařilo se načíst data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWebhookUrl = async () => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({ ai_webhook_url: webhookUrl })
        .eq("id", reportId);

      if (error) throw error;
      toast.success("Webhook URL uložena");
    } catch (error) {
      console.error("Error saving webhook URL:", error);
      toast.error("Nepodařilo se uložit webhook URL");
    }
  };

  const handleTriggerWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Zadejte webhook URL");
      return;
    }

    setIsTriggering(true);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          report_id: reportId,
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
        }),
      });

      toast.success("Webhook byl úspěšně spuštěn. Zkontrolujte n8n pro potvrzení.");
    } catch (error) {
      console.error("Error triggering webhook:", error);
      toast.error("Nepodařilo se spustit webhook");
    } finally {
      setIsTriggering(false);
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

  if (isLoading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </Card>
    );
  }

  return (
    <Card className="p-8 rounded-[35px] border-foreground">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">AI Insights</h2>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              onClick={handleTriggerWebhook}
              disabled={isTriggering || !webhookUrl}
              className="rounded-[35px] bg-foreground text-background border border-foreground hover:bg-accent-green hover:text-foreground hover:border-accent-green"
            >
              {isTriggering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate AI Insights
            </Button>
          )}
        </div>
      </div>

      {canEdit && (
        <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Webhook nastavení
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="space-y-4 p-4 bg-muted/50 rounded-[20px]">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">n8n Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    className="rounded-[35px] border-foreground"
                  />
                  <Button
                    onClick={handleSaveWebhookUrl}
                    variant="outline"
                    className="rounded-[35px] border-foreground"
                  >
                    Uložit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Zadejte URL vašeho n8n webhook triggeru. Po kliknutí na "Generate AI Insights" se spustí váš n8n workflow.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="aiInsights">Obsah AI Insights</Label>
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
          <Textarea
            id="aiInsights"
            value={aiInsights}
            onChange={(e) => setAiInsights(e.target.value)}
            placeholder="AI-generated performance summaries and strategic recommendations will be displayed here..."
            className="min-h-[300px] rounded-[20px] border-foreground"
            readOnly={!canEdit}
          />
        </div>
      </div>
    </Card>
  );
};
