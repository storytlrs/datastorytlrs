import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ContentItem {
  id: string;
  thumbnail_url: string | null;
  content_type: string;
  platform: string;
  views: number;
  engagement_rate: number | null;
  url: string | null;
  content_summary: string | null;
  creators: {
    handle: string;
  } | null;
}

interface ContentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  maxSelections?: number;
}

export const ContentSelectorDialog = ({
  open,
  onOpenChange,
  reportId,
  selectedIds,
  onSelect,
  maxSelections = 5,
}: ContentSelectorDialogProps) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localSelection, setLocalSelection] = useState<string[]>(selectedIds);

  useEffect(() => {
    setLocalSelection(selectedIds);
  }, [selectedIds]);

  useEffect(() => {
    if (open) {
      fetchContent();
    }
  }, [open, reportId]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("content")
        .select("id, thumbnail_url, content_type, platform, views, engagement_rate, url, content_summary, creators(handle)")
        .eq("report_id", reportId)
        .order("views", { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setLocalSelection((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= maxSelections) {
        toast.error(`Maximum ${maxSelections} items can be selected`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    onSelect(localSelection);
    onOpenChange(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden rounded-[35px] border-foreground">
        <DialogHeader>
          <DialogTitle>Select Top Content ({localSelection.length}/{maxSelections})</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[50vh] py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : content.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No content available
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {content.map((item) => (
                <div
                  key={item.id}
                  className={`relative border rounded-[15px] p-3 cursor-pointer transition-all ${
                    localSelection.includes(item.id)
                      ? "border-accent-green bg-accent-green/10"
                      : "border-border hover:border-foreground"
                  }`}
                  onClick={() => handleToggle(item.id)}
                >
                  <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                      checked={localSelection.includes(item.id)}
                      onCheckedChange={() => handleToggle(item.id)}
                    />
                  </div>

                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt="Content preview"
                      className="w-full h-24 object-cover rounded-[10px] mb-2"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted rounded-[10px] mb-2 flex items-center justify-center text-xs text-muted-foreground">
                      No preview
                    </div>
                  )}

                  <div className="text-xs space-y-1">
                    <p className="font-medium truncate">
                      @{item.creators?.handle || "Unknown"}
                    </p>
                    <div className="flex justify-between text-muted-foreground">
                      <span className="capitalize">{item.platform}</span>
                      <span>{formatNumber(item.views || 0)} views</span>
                    </div>
                  </div>

                  {localSelection.includes(item.id) && (
                    <div className="absolute bottom-2 left-2 bg-accent-green text-accent-green-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      #{localSelection.indexOf(item.id) + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[35px] border-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-[35px] bg-foreground text-background hover:bg-accent-green hover:text-foreground"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
