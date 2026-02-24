import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon, Check, X } from "lucide-react";

interface ExtractedStats {
  reach: number | null;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  profile_visits: number | null;
  follows: number | null;
  link_clicks: number | null;
  sticker_clicks: number | null;
  watch_time: number | null;
  avg_watch_time: number | null;
  interactions: number | null;
  accounts_reached: number | null;
  accounts_engaged: number | null;
  content_type: string | null;
  raw_text: string | null;
}

interface ImportInfluencerStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  creators: Array<{ id: string; handle: string }>;
  onSuccess: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  reach: "Reach",
  impressions: "Impressions",
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  saves: "Saves",
  shares: "Shares",
  reposts: "Reposts",
  profile_visits: "Profile Visits",
  follows: "Follows",
  link_clicks: "Link Clicks",
  sticker_clicks: "Sticker Clicks",
  watch_time: "Watch Time (s)",
  avg_watch_time: "Avg Watch Time (s)",
  interactions: "Interactions",
  accounts_reached: "Accounts Reached",
  accounts_engaged: "Accounts Engaged",
};

export const ImportInfluencerStatsDialog = ({
  open,
  onOpenChange,
  reportId,
  creators,
  onSuccess,
}: ImportInfluencerStatsDialogProps) => {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedStats | null>(null);
  const [editableData, setEditableData] = useState<Record<string, number | null>>({});
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [contentType, setContentType] = useState<string>("reel");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep("upload");
    setExtracting(false);
    setSaving(false);
    setPreviewUrl(null);
    setExtractedData(null);
    setEditableData({});
    setSelectedCreatorId("");
    setContentType("reel");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Convert to base64 and send to edge function
    setExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const response = await supabase.functions.invoke("extract-influencer-stats", {
        body: { image_base64: base64, mime_type: file.type },
      });

      if (response.error) throw response.error;
      const result = response.data as { success?: boolean; data?: ExtractedStats; error?: string };

      if (result?.success && result.data) {
        setExtractedData(result.data);
        // Populate editable data with non-null values
        const editable: Record<string, number | null> = {};
        for (const [key, value] of Object.entries(result.data)) {
          if (key in METRIC_LABELS && value !== null) {
            editable[key] = value as number;
          }
        }
        setEditableData(editable);
        if (result.data.content_type) {
          setContentType(result.data.content_type);
        }
        setStep("review");
        toast.success("Data extracted successfully!");
      } else {
        toast.error(result?.error || "Failed to extract data");
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error(error.message || "Failed to extract data from screenshot");
    } finally {
      setExtracting(false);
    }
  };

  const handleMetricChange = (key: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setEditableData((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    if (!selectedCreatorId) {
      toast.error("Please select a creator");
      return;
    }

    setSaving(true);
    try {
      // Map editable data to content table fields
      const contentData: Record<string, any> = {
        report_id: reportId,
        creator_id: selectedCreatorId,
        platform: "instagram" as const,
        content_type: contentType,
        reach: editableData.reach ?? editableData.accounts_reached ?? null,
        impressions: editableData.impressions ?? null,
        views: editableData.views ?? null,
        likes: editableData.likes ?? null,
        comments: editableData.comments ?? null,
        saves: editableData.saves ?? null,
        shares: editableData.shares ?? null,
        reposts: editableData.reposts ?? null,
        link_clicks: editableData.link_clicks ?? null,
        sticker_clicks: editableData.sticker_clicks ?? null,
        watch_time: editableData.watch_time ?? null,
        avg_watch_time: editableData.avg_watch_time ?? null,
      };

      const { error } = await supabase.from("content").insert(contentData as any);

      if (error) throw error;

      toast.success("Influencer stats saved!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save stats: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[35px] border-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Import Influencer Stats</DialogTitle>
          <DialogDescription>
            Upload a screenshot of Instagram statistics and we'll extract the data automatically
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  className="max-h-64 rounded-lg object-contain"
                />
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Click or drag & drop to upload a screenshot
                  </p>
                </>
              )}
              {extracting && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Extracting data...</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {step === "review" && extractedData && (
          <div className="space-y-6">
            {/* Screenshot preview */}
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Screenshot"
                  className="max-h-40 rounded-lg object-contain border border-border"
                />
              </div>
            )}

            {/* Creator & content type selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Creator</Label>
                <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select creator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.handle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Extracted metrics - editable */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Extracted Metrics (edit if needed)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                  const value = editableData[key];
                  if (value === undefined || value === null) return null;
                  return (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        value={value ?? ""}
                        onChange={(e) => handleMetricChange(key, e.target.value)}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Raw text reference */}
            {extractedData.raw_text && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Raw extracted text</Label>
                <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg max-h-24 overflow-y-auto">
                  {extractedData.raw_text}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={resetState} className="rounded-[35px]">
                <Upload className="mr-2 h-4 w-4" />
                Upload Different Screenshot
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="rounded-[35px]">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !selectedCreatorId} className="rounded-[35px]">
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Save to Content
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
