import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface ImportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  onSuccess: () => void;
}

export const ImportDataDialog = ({ open, onOpenChange, reportId, onSuccess }: ImportDataDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    rowsImported: number;
    rowsFailed: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls")) {
        setFile(droppedFile);
      } else {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Utility: Extract handle from markdown link [handle](url)
  const extractHandleFromMarkdown = (text: string): string => {
    if (!text) return "";
    const match = text.match(/\[([^\]]+)\]/);
    return match ? match[1] : text;
  };

  // Utility: Infer platform from URL
  const inferPlatformFromUrl = (url: string): string => {
    if (!url) return "instagram";
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("youtube.com")) return "youtube";
    if (url.includes("tiktok.com")) return "tiktok";
    return "instagram";
  };

  const parseHypeAuditorFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const parsedData: any = {
      influencers: [],
      media: [],
      ecom: [],
    };

    // Iterate through sheets and detect type by headers
    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const sheetName = workbook.SheetNames[i];
      const sheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

      if (data.length === 0) continue;

      const headers = Object.keys(data[0]);

      // Campaign Summary (Page 1) - vertical KV format
      if (headers.includes("Campaign") && data.length >= 2) {
        const campaignRow = data.find((row: any) => row.Campaign === "Campaign") || data[0];
        const spentRow = data.find((row: any) => row.Campaign?.includes("Spent"));
        
        parsedData.campaign = {
          name: campaignRow["Column1"] || "Untitled Campaign",
          budget: spentRow ? parseFloat(String(spentRow["Column1"] || 0).replace(/[^0-9.-]/g, "")) : 0,
          currency: "CZK",
        };
      }

      // Influencer Performance (Page 3)
      if (headers.includes("Account") && headers.includes("Followers")) {
        parsedData.influencers = data
          .filter((row: any) => row.Account && row.Followers)
          .map((row: any) => {
            const handle = extractHandleFromMarkdown(row.Account);
            const platform = inferPlatformFromUrl(row.Account);
            return {
              platform,
              handle,
              followers: parseInt(String(row.Followers || 0).replace(/[^0-9]/g, "")) || 0,
              aqs: parseFloat(row.AQS) || 0,
            };
          });
      }

      // Media Posted (Page 4)
      if (headers.includes("Username") && headers.includes("Type") && headers.includes("Url")) {
        parsedData.media = data
          .filter((row: any) => row.Username && row.Url)
          .map((row: any) => {
            const handle = extractHandleFromMarkdown(row.Username);
            const platform = inferPlatformFromUrl(row.Url);
            const contentType = (row.Type || "post").toLowerCase().replace("s", ""); // "reels" -> "reel"
            
            return {
              platform,
              handle,
              postURL: row.Url,
              contentType,
              publishedAt: row["Post date"] || null,
              impressions: parseInt(row.Impressions) || 0,
              reach: parseInt(row.Reach) || 0,
              views: parseInt(row.Views) || 0,
              likes: parseInt(row.Likes) || 0,
              comments: parseInt(row.Comments) || 0,
              shares: parseInt(row.Shares) || 0,
              saves: parseInt(row.Saves) || 0,
              er: parseFloat(row.ER) || 0,
              positiveCommentsPercent: parseFloat(row["Positive comments %"]) || null,
              negativeCommentsPercent: parseFloat(row["Negative comments %"]) || null,
              neutralCommentsPercent: parseFloat(row["Neutral comments %"]) || null,
            };
          });
      }

      // E-com Performance (Page 5)
      if (headers.includes("Influencer") && headers.includes("Promocode")) {
        parsedData.ecom = data
          .filter((row: any) => row.Influencer && row.Promocode)
          .map((row: any) => {
            const handle = extractHandleFromMarkdown(row.Influencer);
            const platform = inferPlatformFromUrl(row.Influencer);
            
            return {
              platform,
              handle,
              promoCode: row.Promocode,
              clicks: parseInt(row["E-com clicks"]) || 0,
              purchases: parseInt(row["E-com purchases"]) || 0,
              revenue: parseFloat(String(row["E-com revenue"] || 0).replace(/[^0-9.-]/g, "")) || 0,
              conversion: parseFloat(row["E-com conversion"]) || 0,
            };
          });
      }
    }

    return parsedData;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Parse file on client side
      const parsedData = await parseHypeAuditorFile(file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Send parsed data to backend
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-hypeauditor`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reportId,
            fileName: file.name,
            parsedData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult({
        success: data.success,
        rowsImported: data.rowsImported,
        rowsFailed: data.rowsFailed,
        errors: data.errors || [],
        warnings: data.warnings || [],
      });

      if (data.success) {
        toast.success(`Successfully imported ${data.rowsImported} rows`);
        if (data.warnings.length > 0) {
          toast.warning(`Import completed with ${data.warnings.length} warnings`);
        }
        onSuccess();
      } else {
        toast.error("Import failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-[35px] border-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Import HypeAuditor Data</DialogTitle>
          <DialogDescription>
            Upload a HypeAuditor Excel export file (.xlsx or .xls)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-[35px] p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="flex flex-col items-center gap-4">
              {file ? (
                <>
                  <FileSpreadsheet className="w-12 h-12 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expected Format Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload a HypeAuditor Excel export with campaign summary, influencer performance, media posted, and e-commerce data
            </AlertDescription>
          </Alert>

          {/* Import Results */}
          {result && (
            <div className="space-y-2">
              {result.success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully imported {result.rowsImported} rows
                    {result.rowsFailed > 0 && ` (${result.rowsFailed} failed)`}
                  </AlertDescription>
                </Alert>
              )}

              {result.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {result.warnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {result.warnings.length > 5 && (
                        <li>... and {result.warnings.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Errors:</strong>
                    <ul className="mt-2 list-disc list-inside text-sm">
                      {result.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-[35px]"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="rounded-[35px]"
            >
              {uploading ? "Importing..." : "Import Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
