import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useT } from "@/lib/translations";
import { Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AIPrompt {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  prompt_text: string;
  updated_at: string;
}

export const PromptsTab = () => {
  const t = useT();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
  const [openPrompts, setOpenPrompts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .order("name");

      if (error) throw error;
      setPrompts(data || []);
      
      // Initialize edited prompts with current values
      const initial: Record<string, string> = {};
      data?.forEach((p) => {
        initial[p.id] = p.prompt_text;
      });
      setEditedPrompts(initial);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast.error(t("Nepodařilo se načíst prompty"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (prompt: AIPrompt) => {
    const newText = editedPrompts[prompt.id];
    if (newText === prompt.prompt_text) {
      toast.info(t("Žádné změny k uložení"));
      return;
    }

    setSavingId(prompt.id);
    try {
      const { error } = await supabase
        .from("ai_prompts")
        .update({ prompt_text: newText })
        .eq("id", prompt.id);

      if (error) throw error;

      // Update local state
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === prompt.id ? { ...p, prompt_text: newText } : p
        )
      );
      toast.success(t("Prompt uložen"));
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error(t("Nepodařilo se uložit prompt"));
    } finally {
      setSavingId(null);
    }
  };

  const togglePrompt = (id: string) => {
    setOpenPrompts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hasChanges = (prompt: AIPrompt) => {
    return editedPrompts[prompt.id] !== prompt.prompt_text;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("AI Prompty")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Zde můžete upravit prompty používané pro AI analýzy")}
          </p>
        </div>
      </div>

      {prompts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {t("Žádné prompty nenalezeny")}
        </Card>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="overflow-hidden">
              <Collapsible
                open={openPrompts[prompt.id]}
                onOpenChange={() => togglePrompt(prompt.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {prompt.category && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {prompt.category}
                          </span>
                        )}
                        <h3 className="font-medium">{prompt.name}</h3>
                        {hasChanges(prompt) && (
                          <span className="text-xs bg-accent-orange text-foreground px-2 py-0.5 rounded-full">
                            {t("Neuloženo")}
                          </span>
                        )}
                      </div>
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {prompt.description}
                        </p>
                      )}
                    </div>
                    {openPrompts[prompt.id] ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {t("Klíč:")} <code className="bg-muted px-1 rounded">{prompt.key}</code>
                    </div>
                    <Textarea
                      value={editedPrompts[prompt.id] || ""}
                      onChange={(e) =>
                        setEditedPrompts((prev) => ({
                          ...prev,
                          [prompt.id]: e.target.value,
                        }))
                      }
                      className="min-h-[300px] font-mono text-sm"
                      placeholder={t("Zadejte prompt...")}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSave(prompt)}
                        disabled={savingId === prompt.id || !hasChanges(prompt)}
                        className="rounded-[35px]"
                      >
                        {savingId === prompt.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {t("Uložit změny")}
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
