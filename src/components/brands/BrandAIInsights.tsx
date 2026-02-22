import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightTile, TileData } from "./InsightTile";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";

interface BrandAIInsightsProps {
  spaceId: string;
}

const BrandAIInsights = ({ spaceId }: BrandAIInsightsProps) => {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ["space-ai-insights", spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_ai_insights" as any)
        .select("*")
        .eq("space_id", spaceId)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-space-ai-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ space_id: spaceId, trigger: "manual" }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate insights");
      }

      toast.success("AI Insights vygenerovány");
      queryClient.invalidateQueries({ queryKey: ["space-ai-insights", spaceId] });
    } catch (e: any) {
      toast.error(e.message || "Chyba při generování insights");
    } finally {
      setGenerating(false);
    }
  };

  const tiles: TileData[] = insights?.tiles || [];
  const generatedAt = insights?.generated_at
    ? new Date(insights.generated_at).toLocaleDateString("cs-CZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-[20px]" />
        ))}
      </div>
    );
  }

  if (!insights || tiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Žádné AI Insights</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          AI Insights budou automaticky generovány po publikaci reportu, nebo je můžete vygenerovat ručně.
        </p>
        {canEdit && (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-[35px]"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generuji...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Vygenerovat AI Insights
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {generatedAt && (
            <p className="text-sm text-muted-foreground">
              Poslední aktualizace: {generatedAt}
            </p>
          )}
        </div>
        {canEdit && (
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-[35px]"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generuji...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Přegenerovat
              </>
            )}
          </Button>
        )}
      </div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
        {tiles.map((tile, index) => (
          <div key={index} className="break-inside-avoid mb-4">
            <InsightTile tile={tile} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandAIInsights;
