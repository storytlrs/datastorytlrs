import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logReportAction } from "@/lib/auditLog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface Project {
  id: string;
  name: string;
}

interface Report {
  id: string;
  name: string;
  type: "influencer" | "social" | "ads" | "always_on";
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  space_id: string;
  project_id?: string | null;
}

interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report;
  onSuccess: () => void;
}

const reportTypeOptions = [
  { value: "influencer", label: "Influencer campaign" },
  { value: "ads", label: "Ads campaign" },
  { value: "always_on", label: "Always-on content" },
];

export const EditReportDialog = ({ open, onOpenChange, report, onSuccess }: EditReportDialogProps) => {
  const { isAdmin } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [name, setName] = useState(report.name);
  const [projectId, setProjectId] = useState(report.project_id || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    report.start_date ? new Date(report.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    report.end_date ? new Date(report.end_date) : undefined
  );
  const [type, setType] = useState(report.type === "social" ? "always_on" : report.type);
  

  useEffect(() => {
    if (open) {
      setName(report.name);
      setProjectId(report.project_id || "");
      setStartDate(report.start_date ? new Date(report.start_date) : undefined);
      setEndDate(report.end_date ? new Date(report.end_date) : undefined);
      setType(report.type === "social" ? "always_on" : report.type);
      
      
      if (isAdmin) {
        fetchProjects();
      }
    }
  }, [open, report, isAdmin]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("space_id", report.space_id)
      .order("name");

    if (!error && data) {
      setProjects(data);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          name: name.trim(),
          project_id: projectId || null,
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          type: type as "influencer" | "ads" | "always_on",
          
        })
        .eq("id", report.id);

      if (error) throw error;

      // Log the update action
      await logReportAction(report.id, "update", {
        name: name.trim(),
        type,
      });

      toast.success("Report settings updated");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Edit Report Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select 
                value={projectId || "__none__"} 
                onValueChange={(value) => setProjectId(value === "__none__" ? "" : value)}
              >
                <SelectTrigger className="rounded-[35px]">
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="__none__" disabled>No projects in this space</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="__none__">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
              className="rounded-[35px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as "influencer" | "ads" | "always_on")}>
              <SelectTrigger className="rounded-[35px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
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
                <PopoverContent className="w-auto p-0" align="start">
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
              <Label>End Date</Label>
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
                <PopoverContent className="w-auto p-0" align="start">
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-[35px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="rounded-[35px]"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
