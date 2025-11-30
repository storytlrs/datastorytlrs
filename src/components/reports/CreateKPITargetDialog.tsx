import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const kpiSchema = z.object({
  kpi_name: z.string().min(1, "KPI name is required"),
  planned_value: z.number().min(0, "Planned value must be positive"),
  actual_value: z.number().min(0).optional(),
  unit: z.string().optional(),
});

type KPIFormData = z.infer<typeof kpiSchema>;

interface CreateKPITargetDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const CreateKPITargetDialog = ({ reportId, onSuccess }: CreateKPITargetDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<KPIFormData>({
    resolver: zodResolver(kpiSchema),
  });

  const onSubmit = async (data: KPIFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("kpi_targets").insert({
        report_id: reportId,
        kpi_name: data.kpi_name,
        planned_value: data.planned_value,
        actual_value: data.actual_value || null,
        unit: data.unit || null,
      });

      if (error) throw error;

      toast.success("KPI target added successfully");
      setOpen(false);
      reset();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create KPI target");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-[35px]">
          <Plus className="w-4 h-4 mr-2" />
          Add KPI Target
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Add New KPI Target</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="kpi_name">KPI Name *</Label>
            <Input
              id="kpi_name"
              placeholder="e.g., Total Reach"
              {...register("kpi_name")}
              className="rounded-[35px]"
            />
            {errors.kpi_name && <p className="text-sm text-destructive mt-1">{errors.kpi_name.message}</p>}
          </div>

          <div>
            <Label htmlFor="planned_value">Planned Value *</Label>
            <Input
              id="planned_value"
              type="number"
              step="0.01"
              placeholder="0"
              {...register("planned_value", { valueAsNumber: true })}
              className="rounded-[35px]"
            />
            {errors.planned_value && <p className="text-sm text-destructive mt-1">{errors.planned_value.message}</p>}
          </div>

          <div>
            <Label htmlFor="actual_value">Actual Value</Label>
            <Input
              id="actual_value"
              type="number"
              step="0.01"
              placeholder="0"
              {...register("actual_value", { valueAsNumber: true })}
              className="rounded-[35px]"
            />
            {errors.actual_value && <p className="text-sm text-destructive mt-1">{errors.actual_value.message}</p>}
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              placeholder="e.g., views, $, %"
              {...register("unit")}
              className="rounded-[35px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[35px]">
              {isSubmitting ? "Creating..." : "Create KPI Target"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
