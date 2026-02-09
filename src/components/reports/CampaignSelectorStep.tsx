import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface BrandCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  objective: string | null;
  status: string | null;
  date_start: string | null;
  date_stop: string | null;
}

interface CampaignSelectorStepProps {
  spaceId: string;
  selectedCampaignIds: string[];
  onSelectionChange: (ids: string[]) => void;
  startDate?: Date;
  endDate?: Date;
}

export const CampaignSelectorStep = ({
  spaceId,
  selectedCampaignIds,
  onSelectionChange,
  startDate,
  endDate,
}: CampaignSelectorStepProps) => {
  const [campaigns, setCampaigns] = useState<BrandCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      let query = supabase
        .from("brand_campaigns")
        .select("id, campaign_id, campaign_name, objective, status, date_start, date_stop")
        .eq("space_id", spaceId);

      if (startDate) {
        query = query.or(`date_stop.gte.${format(startDate, "yyyy-MM-dd")},date_stop.is.null`);
      }
      if (endDate) {
        query = query.or(`date_start.lte.${format(endDate, "yyyy-MM-dd")},date_start.is.null`);
      }

      const { data, error } = await query.order("campaign_name", { ascending: true, nullsFirst: false });

      if (!error && data) {
        setCampaigns(data);
        const validIds = new Set(data.map((c) => c.id));
        const filtered = selectedCampaignIds.filter((id) => validIds.has(id));
        if (filtered.length !== selectedCampaignIds.length) {
          onSelectionChange(filtered);
        }
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, [spaceId, startDate, endDate]);

  const toggleCampaign = (id: string) => {
    if (selectedCampaignIds.includes(id)) {
      onSelectionChange(selectedCampaignIds.filter((cid) => cid !== id));
    } else {
      onSelectionChange([...selectedCampaignIds, id]);
    }
  };

  const removeCampaign = (id: string) => {
    onSelectionChange(selectedCampaignIds.filter((cid) => cid !== id));
  };

  const selectedCampaigns = campaigns.filter((c) => selectedCampaignIds.includes(c.id));

  const getDisplayName = (campaign: BrandCampaign) =>
    campaign.campaign_name || campaign.campaign_id;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-2">Loading campaigns...</p>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No campaigns found for this date range.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-[35px] border-foreground"
          >
            {selectedCampaignIds.length > 0
              ? `${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? "s" : ""} selected`
              : "Select campaigns..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search campaigns..." />
            <CommandList>
              <CommandEmpty>No campaigns found.</CommandEmpty>
              <CommandGroup>
                {campaigns.map((campaign) => {
                  const isSelected = selectedCampaignIds.includes(campaign.id);
                  return (
                    <CommandItem
                      key={campaign.id}
                      value={getDisplayName(campaign)}
                      onSelect={() => toggleCampaign(campaign.id)}
                      className={cn(
                        isSelected && "bg-foreground text-background"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{getDisplayName(campaign)}</span>
                        {campaign.date_start && campaign.date_stop && (
                          <span className={cn(
                            "text-xs",
                            isSelected ? "text-background/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(campaign.date_start), "d.M.yyyy")} – {format(new Date(campaign.date_stop), "d.M.yyyy")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCampaigns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCampaigns.map((campaign) => (
            <Badge
              key={campaign.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="truncate max-w-[200px]">{getDisplayName(campaign)}</span>
              <button
                onClick={() => removeCampaign(campaign.id)}
                className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
