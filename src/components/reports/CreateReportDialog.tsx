import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { CalendarIcon, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

const CreateReportDialog = ({
  open,
  onOpenChange,
  spaceId,
  onSuccess,
}: CreateReportDialogProps) => {
  const navigate = useNavigate();
  const { role, isAdmin } = useUserRole();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [projectId, setProjectId] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Step 2 state
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
      setStartDate(undefined);
      setEndDate(undefined);
      setFile(null);
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
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const canProceedStep1 = () => {
    return campaignName.trim() && startDate && endDate;
  };

  const handleNext = () => {
    if (step === 1 && canProceedStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkipUpload = () => {
    setStep(3);
  };

  const handleContinueWithFile = () => {
    if (file) {
      setStep(3);
    }
  };

  const processHypeAuditorFile = async (reportId: string) => {
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const parsedData = {
        campaign: {},
        influencers: [],
        media: [],
        ecommerce: [],
      };

      // Parse the file (reusing logic from ImportDataDialog)
      const campaignSheet = workbook.Sheets["Page 1"] || workbook.Sheets[workbook.SheetNames[0]];
      if (campaignSheet) {
        const campaignData = XLSX.utils.sheet_to_json(campaignSheet, { header: 1 });
        // Extract campaign data as key-value pairs
        for (const row of campaignData as any[]) {
          if (row[0] && row[1]) {
            parsedData.campaign[row[0]] = row[1];
          }
        }
      }

      // Parse influencers, media, ecommerce sheets...
      // (Similar logic to ImportDataDialog)

      // Call the import edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-hypeauditor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            reportId,
            parsedData: parsedData,
            fileName: file.name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  };

  const handleCreateReport = async () => {
    setLoading(true);
    try {
      // Create the report
      const reportData: any = {
        name: campaignName,
        space_id: spaceId,
        type: "influencer",
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

      // If file was uploaded, process it
      if (file) {
        try {
          await processHypeAuditorFile(report.id);
          toast.success("Report created and data imported successfully!");
        } catch (importError) {
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
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="project" className="rounded-[35px]">
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-background border-foreground">
              {projectsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading...
                </SelectItem>
              ) : projects.length === 0 ? (
                <SelectItem value="none" disabled>
                  No projects available
                </SelectItem>
              ) : (
                projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-[35px] p-12 text-center transition-colors",
          dragActive ? "border-accent bg-accent/10" : "border-foreground/20",
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
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            {file ? file.name : "Drop your file here or click to browse"}
          </p>
          <p className="text-sm text-muted-foreground">
            Supports XLSX files (HypeAuditor export)
          </p>
        </label>
      </div>

      {file && (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-[35px]">
          <FileText className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
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

        {file && (
          <div>
            <p className="text-sm text-muted-foreground">Data File</p>
            <p className="font-medium">{file.name}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((stepNum) => (
        <div
          key={stepNum}
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            step === stepNum ? "bg-accent" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[35px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Report Details"}
            {step === 2 && "Upload Data (Optional)"}
            {step === 3 && "Create Report"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Step {step} of 3
          </p>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

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
                  onClick={handleContinueWithFile}
                  disabled={!file}
                  className="rounded-[35px]"
                >
                  Continue
                </Button>
              </>
            )}

            {step === 3 && (
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
      </DialogContent>
    </Dialog>
  );
};

export default CreateReportDialog;
