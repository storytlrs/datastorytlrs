import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportWizard, type ImportResult } from "./import/ImportWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon, FileSpreadsheet, Check, X, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Screenshot extraction types ──

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

interface ImageEntry {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "extracting" | "done" | "error";
  extractedData: ExtractedStats | null;
  editableData: Record<string, number | null>;
  errorMessage?: string;
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

let entryIdCounter = 0;

// ── Props ──

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  onSuccess: () => void;
  creators?: Array<{ id: string; handle: string }>;
}

type ImportMode = null | "spreadsheet" | "screenshot";

export const ImportDataDialog = ({ open, onOpenChange, reportId, onSuccess, creators = [] }: ImportDataDialogProps) => {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<ImportMode>(null);

  // Screenshot state
  const [screenshotStep, setScreenshotStep] = useState<"upload" | "review">("upload");
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [contentType, setContentType] = useState("reel");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setResult(null);
    setMode(null);
    setScreenshotStep("upload");
    setEntries([]);
    setSaving(false);
    setSelectedCreatorId("");
    setContentType("reel");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // ── Spreadsheet handlers ──

  const handleSpreadsheetComplete = (importResult: ImportResult) => {
    setResult(importResult);
    if (importResult.success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  // ── Screenshot handlers ──

  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const extractSingleImage = async (entry: ImageEntry): Promise<ImageEntry> => {
    try {
      const base64 = await fileToBase64(entry.file);
      const response = await supabase.functions.invoke("extract-influencer-stats", {
        body: { image_base64: base64, mime_type: entry.file.type },
      });
      if (response.error) throw response.error;
      const result = response.data as { success?: boolean; data?: ExtractedStats; error?: string };
      if (result?.success && result.data) {
        const editable: Record<string, number | null> = {};
        for (const [key, value] of Object.entries(result.data)) {
          if (key in METRIC_LABELS && value !== null) {
            editable[key] = value as number;
          }
        }
        return { ...entry, status: "done", extractedData: result.data, editableData: editable };
      }
      return { ...entry, status: "error", errorMessage: result?.error || "Failed to extract data" };
    } catch (error: any) {
      return { ...entry, status: "error", errorMessage: error.message || "Extraction failed" };
    }
  };

  const handleScreenshotFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please upload image files");
      return;
    }

    setMode("screenshot");

    const newEntries: ImageEntry[] = imageFiles.map(file => ({
      id: `entry_${++entryIdCounter}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "extracting" as const,
      extractedData: null,
      editableData: {},
    }));

    setEntries(prev => [...prev, ...newEntries]);

    const results = await Promise.all(newEntries.map(extractSingleImage));

    setEntries(prev => {
      const updated = [...prev];
      for (const r of results) {
        const idx = updated.findIndex(e => e.id === r.id);
        if (idx >= 0) updated[idx] = r;
      }
      return updated;
    });

    const firstDone = results.find(r => r.status === "done" && r.extractedData?.content_type);
    if (firstDone?.extractedData?.content_type) setContentType(firstDone.extractedData.content_type);

    const doneCount = results.filter(r => r.status === "done").length;
    const errorCount = results.filter(r => r.status === "error").length;
    if (doneCount > 0) {
      toast.success(`Extracted data from ${doneCount} screenshot${doneCount > 1 ? "s" : ""}${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      setScreenshotStep("review");
    } else {
      toast.error("Failed to extract data from all screenshots");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMetricChange = (entryId: string, key: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setEntries(prev =>
      prev.map(e => (e.id === entryId ? { ...e, editableData: { ...e.editableData, [key]: num } } : e))
    );
  };

  const removeEntry = (entryId: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== entryId);
      if (updated.filter(e => e.status === "done").length === 0) {
        setScreenshotStep("upload");
        if (updated.length === 0) setMode(null);
      }
      return updated;
    });
  };

  const handleScreenshotSave = async () => {
    if (!selectedCreatorId) { toast.error("Please select a creator"); return; }
    const doneEntries = entries.filter(e => e.status === "done");
    if (doneEntries.length === 0) { toast.error("No extracted data to save"); return; }

    setSaving(true);
    try {
      const inserts = doneEntries.map(entry => ({
        report_id: reportId,
        creator_id: selectedCreatorId,
        platform: "instagram" as const,
        content_type: contentType,
        reach: entry.editableData.reach ?? entry.editableData.accounts_reached ?? null,
        impressions: entry.editableData.impressions ?? null,
        views: entry.editableData.views ?? null,
        likes: entry.editableData.likes ?? null,
        comments: entry.editableData.comments ?? null,
        saves: entry.editableData.saves ?? null,
        shares: entry.editableData.shares ?? null,
        reposts: entry.editableData.reposts ?? null,
        link_clicks: entry.editableData.link_clicks ?? null,
        sticker_clicks: entry.editableData.sticker_clicks ?? null,
        watch_time: entry.editableData.watch_time ?? null,
        avg_watch_time: entry.editableData.avg_watch_time ?? null,
      }));

      const { error } = await supabase.from("screenshot_influencer" as any).insert(inserts as any);
      if (error) throw error;

      toast.success(`${inserts.length} record${inserts.length > 1 ? "s" : ""} saved!`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save stats: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Unified file handler: detect type and route ──

  const handleUnifiedFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const isImage = firstFile.type.startsWith("image/");
    const ext = firstFile.name.split(".").pop()?.toLowerCase();
    const isSpreadsheet = ext === "xlsx" || ext === "xls" || ext === "csv";

    if (isImage) {
      handleScreenshotFiles(files);
    } else if (isSpreadsheet) {
      setMode("spreadsheet");
    } else {
      toast.error("Unsupported file type. Upload images (screenshots) or spreadsheets (XLSX, CSV).");
    }
  };

  const isExtracting = entries.some(e => e.status === "extracting");
  const doneEntries = entries.filter(e => e.status === "done");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[35px] border-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Import Data</DialogTitle>
          <DialogDescription>
            {mode === "screenshot"
              ? "Screenshots detected — extracting influencer stats via OCR"
              : mode === "spreadsheet"
              ? "Upload an XLSX, XLS, or CSV file and map columns to import Creators, Content, and Promo Codes"
              : "Upload spreadsheets (XLSX, CSV) to import data or screenshots to extract influencer stats"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Initial / Screenshot upload state ── */}
        {mode === null && (
          <div className="space-y-6">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-[35px] p-12 text-center transition-colors cursor-pointer",
                "border-border hover:border-foreground"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUnifiedFileDrop(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-3">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-lg">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Spreadsheets (XLSX, XLS, CSV) for data import • Screenshots (PNG, JPG) for influencer stats extraction
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUnifiedFileDrop(e.target.files)}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose} className="rounded-[35px]">Cancel</Button>
            </div>
          </div>
        )}

        {/* ── Screenshot: extracting state ── */}
        {mode === "screenshot" && screenshotStep === "upload" && (
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => !isExtracting && fileInputRef.current?.click()}
            >
              {entries.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {entries.map(entry => (
                    <div key={entry.id} className="relative">
                      <img src={entry.previewUrl} alt="Preview" className="h-24 rounded-lg object-contain border border-border" />
                      {entry.status === "extracting" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Click or drag & drop to upload more screenshots
                  </p>
                </>
              )}
              {isExtracting && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Extracting data from {entries.filter(e => e.status === "extracting").length} image(s)...</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleScreenshotFiles(e.target.files)}
            />
          </div>
        )}

        {/* ── Screenshot: review state ── */}
        {mode === "screenshot" && screenshotStep === "review" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Creator</Label>
                <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select creator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.handle}</SelectItem>
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

            <div className="space-y-4">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <img src={entry.previewUrl} alt={`Screenshot ${idx + 1}`} className="h-20 rounded-lg object-contain border border-border flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Screenshot {idx + 1}</h4>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEntry(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {entry.status === "extracting" && (
                        <div className="flex items-center gap-2 text-primary text-sm mt-1">
                          <Loader2 className="h-4 w-4 animate-spin" /> Extracting...
                        </div>
                      )}
                      {entry.status === "error" && (
                        <p className="text-sm text-destructive mt-1">{entry.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  {entry.status === "done" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(METRIC_LABELS).map(([key, label]) => {
                        const value = entry.editableData[key];
                        if (value === undefined || value === null) return null;
                        return (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{label}</Label>
                            <Input type="number" value={value ?? ""} onChange={(e) => handleMetricChange(entry.id, key, e.target.value)} className="h-9 rounded-lg" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-[35px]">
                <Plus className="mr-2 h-4 w-4" /> Add More Screenshots
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleScreenshotFiles(e.target.files)} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="rounded-[35px]">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button onClick={handleScreenshotSave} disabled={saving || !selectedCreatorId || doneEntries.length === 0} className="rounded-[35px]">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Save {doneEntries.length} Record{doneEntries.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Spreadsheet mode: existing ImportWizard ── */}
        {mode === "spreadsheet" && (
          <ImportWizard
            reportId={reportId}
            onComplete={handleSpreadsheetComplete}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
