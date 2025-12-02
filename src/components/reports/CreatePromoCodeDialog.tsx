import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const promoSchema = z.object({
  code: z.string().min(1, "Promo code is required"),
  creator_id: z.string().optional(),
  clicks: z.number().min(0).optional(),
  purchases: z.number().min(0).optional(),
  revenue: z.number().min(0).optional(),
  conversion_rate: z.number().min(0).max(100).optional(),
});

type PromoFormData = z.infer<typeof promoSchema>;

interface CreatePromoCodeDialogProps {
  reportId: string;
  onSuccess: () => void;
}

export const CreatePromoCodeDialog = ({ reportId, onSuccess }: CreatePromoCodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PromoFormData>({
    resolver: zodResolver(promoSchema),
  });

  const creator_id = watch("creator_id");

  useEffect(() => {
    fetchCreators();
  }, [reportId]);

  const fetchCreators = async () => {
    const { data } = await supabase
      .from("creators")
      .select("id, handle, platform")
      .eq("report_id", reportId)
      .order("handle");
    
    setCreators(data || []);
  };

  const onSubmit = async (data: PromoFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("promo_codes").insert({
        report_id: reportId,
        code: data.code,
        creator_id: data.creator_id || null,
        clicks: data.clicks || null,
        purchases: data.purchases || null,
        revenue: data.revenue || null,
        conversion_rate: data.conversion_rate || null,
      });

      if (error) throw error;

      toast.success("Promo code added successfully");
      setOpen(false);
      reset();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create promo code");
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
          Add Promo Code
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[35px]">
        <DialogHeader>
          <DialogTitle>Add New Promo Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="code">Promo Code *</Label>
            <Input
              id="code"
              placeholder="e.g., SAVE20"
              {...register("code")}
              className="rounded-[35px]"
            />
            {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
          </div>

          <div>
            <Label htmlFor="creator_id">Creator (Optional)</Label>
            <Select value={creator_id} onValueChange={(value) => setValue("creator_id", value)}>
              <SelectTrigger className="rounded-[35px]">
                <SelectValue placeholder="Select creator (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {creators.map((creator) => (
                  <SelectItem key={creator.id} value={creator.id}>
                    {creator.handle} ({creator.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clicks">Clicks</Label>
              <Input
                id="clicks"
                type="number"
                placeholder="0"
                {...register("clicks", { valueAsNumber: true })}
                className="rounded-[35px]"
              />
            </div>
            <div>
              <Label htmlFor="purchases">Purchases</Label>
              <Input
                id="purchases"
                type="number"
                placeholder="0"
                {...register("purchases", { valueAsNumber: true })}
                className="rounded-[35px]"
              />
            </div>
            <div>
              <Label htmlFor="revenue">Revenue (Kč)</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("revenue", { valueAsNumber: true })}
                className="rounded-[35px]"
              />
            </div>
            <div>
              <Label htmlFor="conversion_rate">Conversion Rate (%)</Label>
              <Input
                id="conversion_rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("conversion_rate", { valueAsNumber: true })}
                className="rounded-[35px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-[35px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[35px]">
              {isSubmitting ? "Creating..." : "Create Promo Code"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
