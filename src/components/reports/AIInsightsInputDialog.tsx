import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface CampaignContext {
  mainGoal: string;
  actions: string;
  highlights: string;
}

interface AIInsightsInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CampaignContext) => void;
  isGenerating: boolean;
}

export const AIInsightsInputDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isGenerating,
}: AIInsightsInputDialogProps) => {
  const [mainGoal, setMainGoal] = useState("");
  const [actions, setActions] = useState("");
  const [highlights, setHighlights] = useState("");

  const handleSubmit = () => {
    onSubmit({
      mainGoal,
      actions,
      highlights,
    });
  };

  const isValid = mainGoal.trim() && actions.trim() && highlights.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[35px] border-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Generate AI Insights
          </DialogTitle>
          <DialogDescription>
            Odpovězte na následující otázky pro vygenerování AI analýzy kampaně.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="mainGoal" className="text-base font-semibold">
              Co bylo hlavním cílem kampaně?
            </Label>
            <Textarea
              id="mainGoal"
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              placeholder="Např. Zvýšení povědomí o značce, launch nového produktu, zvýšení prodejů..."
              className="rounded-[20px] min-h-[100px] border-foreground"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actions" className="text-base font-semibold">
              Co jsme udělali pro dosažení cíle?
            </Label>
            <Textarea
              id="actions"
              value={actions}
              onChange={(e) => setActions(e.target.value)}
              placeholder="Např. Spolupráce s 10 influencery, vytvoření video obsahu, promo kódy..."
              className="rounded-[20px] min-h-[100px] border-foreground"
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="highlights" className="text-base font-semibold">
              Co se povedlo nejvíce?
            </Label>
            <Textarea
              id="highlights"
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="Např. Virální video od @influencer, vysoká engagement rate, překročení cílů..."
              className="rounded-[20px] min-h-[100px] border-foreground"
              disabled={isGenerating}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[35px] border-foreground"
            disabled={isGenerating}
          >
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isGenerating}
            className="rounded-[35px] bg-foreground text-background hover:bg-accent-green hover:text-foreground"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generuji...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
