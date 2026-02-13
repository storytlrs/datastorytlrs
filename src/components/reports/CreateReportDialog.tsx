import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logReportAction } from "@/lib/auditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Upload, FileSpreadsheet, X, Check, ChevronsUpDown } from "lucide-react";
import { CampaignSelectorStep } from "./CampaignSelectorStep";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseFile, type ParsedFile } from "./import/fileParser";
import { ColumnMappingStep } from "./import/ColumnMappingStep";
import { ImportReviewStep } from "./import/ImportReviewStep";
import { parseMappingTarget, MAPPING_FIELDS } from "./import/mappingConfig";

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onSuccess: () => void;
}

interface Project {
  id: string;
  name: string;
}

const reportTypeOptions = [
  { value: "influencer", label: "Influencer campaign" },
  { value: "ads", label: "Ads campaign" },
  { value: "always_on", label: "Always-on content" },
];

const periodOptions = [
  { value: "campaign", label: "Campaign" },
  { value: "monthly", label: "Měsíční" },
  { value: "quarterly", label: "Kvartální" },
  { value: "yearly", label: "Roční" },
];

const CreateReportDialog = ({
  open,
  onOpenChange,
  spaceId,
  onSuccess,
}: CreateReportDialogProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [projectId, setProjectId] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [reportType, setReportType] = useState<"influencer" | "ads" | "always_on">("influencer");
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  // Campaign selection state (for ads/always_on)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedTiktokCampaignIds, setSelectedTiktokCampaignIds] = useState<string[]>([]);

  // Step 2/3 state (file upload)
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("space_id", spaceId)
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (isAdmin) {
        fetchProjects();
      }
    } else {
      // Reset state when closing
      setStep(1);
      setProjectId("");
      setCampaignName("");
      setReportType("influencer");
      setPeriod("monthly");
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedCampaignIds([]);
      setSelectedTiktokCampaignIds([]);
      setFile(null);
      setParsedFile(null);
      setMappings({});
    }
    onOpenChange(newOpen);
  };

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
      const extension = droppedFile.name.split(".").pop()?.toLowerCase();
      if (extension === "xlsx" || extension === "xls" || extension === "csv") {
        setFile(droppedFile);
        setParsedFile(null);
        setMappings({});
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedFile(null);
      setMappings({});
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setParsedFile(null);
    setMappings({});
  };

  const needsCampaignStep = reportType === "ads" || reportType === "always_on";
  const showCampaignSelector = needsCampaignStep;

  const canProceedStep1 = () => {
    return campaignName.trim() && startDate && endDate;
  };

  const handleNext = () => {
    if (step === 1 && canProceedStep1()) {
      setStep(2); // Upload step (was step 3)
    }
  };

  const handleBack = () => {
    if (step === 5) {
      setStep(4);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleSkipUpload = () => {
    setStep(5); // Go to review without file
  };

  const handleAnalyzeFile = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const parsed = await parseFile(file);
      setParsedFile(parsed);

      // Initialize mappings with suggestions
      const initialMappings: Record<string, string | null> = {};
      parsed.columns.forEach((column) => {
        initialMappings[column.name] = column.suggestedMapping;
      });
      setMappings(initialMappings);

      setStep(3); // Go to mapping step
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMappingChange = useCallback((column: string, value: string | null) => {
    setMappings((prev) => ({
      ...prev,
      [column]: value,
    }));
  }, []);

  const handleMappingNext = () => {
    setStep(4); // Go to import review
  };

  const handleCreateReport = async () => {
    setLoading(true);
    try {
      // Create the report
      const reportData: any = {
        name: campaignName,
        space_id: spaceId,
        type: reportType,
        period,
        status: "draft",
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      };

      if (projectId) {
        reportData.project_id = projectId;
      }

      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert([reportData])
        .select()
        .single();

      if (reportError) throw reportError;

      // Save Meta campaign links
      if (selectedCampaignIds.length > 0) {
        const campaignLinks = selectedCampaignIds.map((cid) => ({
          report_id: report.id,
          brand_campaign_id: cid,
        }));
        const { error: linkError } = await supabase
          .from("report_campaigns")
          .insert(campaignLinks);
        if (linkError) {
          console.error("Error linking Meta campaigns:", linkError);
        }
      }

      // Save TikTok campaign links
      if (selectedTiktokCampaignIds.length > 0) {
        const tiktokLinks = selectedTiktokCampaignIds.map((cid) => ({
          report_id: report.id,
          tiktok_campaign_id: cid,
        }));
        const { error: tiktokLinkError } = await supabase
          .from("report_tiktok_campaigns")
          .insert(tiktokLinks);
        if (tiktokLinkError) {
          console.error("Error linking TikTok campaigns:", tiktokLinkError);
        }
      }

      // Log the create action
      await logReportAction(report.id, "create", {
        name: campaignName,
        type: reportType,
      });

      // If file was uploaded and mapped, process it
      if (parsedFile && Object.values(mappings).some(Boolean)) {
        try {
          const mappingsList = Object.entries(mappings)
            .filter(([_, target]) => target !== null)
            .map(([sourceColumn, target]) => {
              const parsed = parseMappingTarget(target!);
              return {
                sourceColumn,
                targetTable: parsed!.table,
                targetField: parsed!.field,
              };
            });

          const { data: session } = await supabase.auth.getSession();
          if (!session?.session) {
            throw new Error("Not authenticated");
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-mapped-data`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                reportId: report.id,
                fileName: parsedFile.fileName,
                mappings: mappingsList,
                rows: parsedFile.rows,
              }),
            }
          );

          const result = await response.json();

          if (response.ok && result.success) {
            toast.success(`Report created and ${result.rowsImported} rows imported!`);
          } else {
            toast.warning("Report created, but data import had issues");
          }
        } catch (importError) {
          console.error("Import error:", importError);
          toast.warning("Report created, but data import failed");
        }
      } else {
        toast.success("Report created successfully!");
      }

      onSuccess();
      handleOpenChange(false);
      navigate(`/reports/${report.id}`);
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error("Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      {isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <Popover open={projectOpen} onOpenChange={setProjectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectOpen}
                className="w-full justify-between rounded-[35px] border-foreground"
              >
                {projectId
                  ? projects.find((p) => p.id === projectId)?.name
                  : "Select a project (optional)"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search projects..." />
                <CommandList>
                  <CommandEmpty>No projects found.</CommandEmpty>
                  <CommandGroup>
                    {projectsLoading ? (
                      <CommandItem disabled>Loading...</CommandItem>
                    ) : projects.length === 0 ? (
                      <CommandItem disabled>No projects available</CommandItem>
                    ) : (
                      projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.name}
                          onSelect={() => {
                            setProjectId(project.id === projectId ? "" : project.id);
                            setProjectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              projectId === project.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {project.name}
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="campaignName">Campaign Name *</Label>
        <Input
          id="campaignName"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="Enter campaign name"
          className="rounded-[35px]"
        />
      </div>

      <div className="space-y-2">
          <Label htmlFor="reportType">Report Type *</Label>
          <Select value={reportType} onValueChange={(value) => setReportType(value as "influencer" | "ads" | "always_on")}>
            <SelectTrigger id="reportType" className="rounded-[35px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-foreground">
              {reportTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      {(reportType === "ads" || reportType === "always_on") && (
        <div className="space-y-2">
          <Label htmlFor="period">Period *</Label>
          <Select value={period} onValueChange={(value) => setPeriod(value as "monthly" | "quarterly" | "yearly")}>
            <SelectTrigger id="period" className="rounded-[35px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-foreground">
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal rounded-[35px]",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border-foreground" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal rounded-[35px]",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border-foreground" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showCampaignSelector && (
        <div className="space-y-2">
          <Label>Link Campaigns (optional)</Label>
          <CampaignSelectorStep
            spaceId={spaceId}
            selectedCampaignIds={selectedCampaignIds}
            selectedTiktokCampaignIds={selectedTiktokCampaignIds}
            onSelectionChange={(metaIds, tiktokIds) => {
              setSelectedCampaignIds(metaIds);
              setSelectedTiktokCampaignIds(tiktokIds);
            }}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-[35px] p-12 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-foreground/20",
          file && "border-primary bg-primary/5",
          "hover:border-foreground/40"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-4">
          {file ? (
            <>
              <FileSpreadsheet className="w-12 h-12 text-primary" />
              <div>
                <p className="font-medium text-lg">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemoveFile();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-lg">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports XLSX, XLS, and CSV files
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="space-y-4 p-6 bg-muted rounded-[35px]">
        <h3 className="font-bold text-lg">Review Report Details</h3>

        {projectId && (
          <div>
            <p className="text-sm text-muted-foreground">Project</p>
            <p className="font-medium">
              {projects.find((p) => p.id === projectId)?.name}
            </p>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground">Campaign Name</p>
          <p className="font-medium">{campaignName}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Report Type</p>
          <p className="font-medium">
            {reportTypeOptions.find((o) => o.value === reportType)?.label}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">
              {startDate ? format(startDate, "PPP") : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">
              {endDate ? format(endDate, "PPP") : "-"}
            </p>
          </div>
        </div>

        {selectedCampaignIds.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground">Linked Campaigns</p>
            <p className="font-medium">{selectedCampaignIds.length} campaign{selectedCampaignIds.length > 1 ? "s" : ""}</p>
          </div>
        )}

        {parsedFile && (
          <div>
            <p className="text-sm text-muted-foreground">Data File</p>
            <p className="font-medium">{parsedFile.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {parsedFile.totalRows} rows • {Object.values(mappings).filter(Boolean).length} fields mapped
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Report Details";
      case 2:
        return "Upload Data (Optional)";
      case 3:
        return "Map Columns";
      case 4:
        return "Review Import";
      case 5:
        return "Create Report";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "rounded-[35px]",
        step === 3 || step === 4 ? "sm:max-w-[900px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[600px]"
      )}>
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && parsedFile && (
            <ColumnMappingStep
              parsedFile={parsedFile}
              mappings={mappings}
              onMappingChange={handleMappingChange}
              onNext={handleMappingNext}
              onBack={() => setStep(2)}
              onCancel={() => handleOpenChange(false)}
            />
          )}
          {step === 4 && parsedFile && (
            <ImportReviewStep
              parsedFile={parsedFile}
              mappings={mappings}
              onImport={() => setStep(5)}
              onBack={() => setStep(3)}
              onCancel={() => handleOpenChange(false)}
              isLoading={false}
            />
          )}
          {step === 5 && renderReviewStep()}
        </div>

        {(step === 1 || step === 2 || step === 5) && (
          <div className="flex justify-between gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="rounded-[35px]"
              >
                Back
              </Button>
            )}

            <div className="flex gap-3 ml-auto">
              {step === 1 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedStep1()}
                  className="rounded-[35px]"
                >
                  Next
                </Button>
              )}

              {step === 2 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSkipUpload}
                    className="rounded-[35px]"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleAnalyzeFile}
                    disabled={!file || isAnalyzing}
                    className="rounded-[35px]"
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze & Map"}
                  </Button>
                </>
              )}

              {step === 5 && (
                <Button
                  onClick={handleCreateReport}
                  disabled={loading}
                  className="rounded-[35px]"
                >
                  {loading ? "Creating..." : "Create Report"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateReportDialog;
