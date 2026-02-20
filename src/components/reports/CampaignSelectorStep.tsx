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

interface UnifiedCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  platform: "meta" | "tiktok";
  objective: string | null;
  status: string | null;
  date_start: string | null;
  date_stop: string | null;
}

interface CampaignSelectorStepProps {
  spaceId: string;
  selectedCampaignIds: string[];
  selectedTiktokCampaignIds: string[];
  onSelectionChange: (metaIds: string[], tiktokIds: string[]) => void;
  startDate?: Date;
  endDate?: Date;
}

export const CampaignSelectorStep = ({
  spaceId,
  selectedCampaignIds,
  selectedTiktokCampaignIds,
  onSelectionChange,
  startDate,
  endDate,
}: CampaignSelectorStepProps) => {
  const [campaigns, setCampaigns] = useState<UnifiedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      const allCampaigns: UnifiedCampaign[] = [];

      // Fetch Meta campaigns (brand_campaigns)
      let metaQuery = supabase
        .from("brand_campaigns")
        .select("id, campaign_id, campaign_name, objective, status, date_start, date_stop")
        .eq("space_id", spaceId);

      if (startDate) {
        metaQuery = metaQuery.or(`date_stop.gte.${format(startDate, "yyyy-MM-dd")},date_stop.is.null`);
      }
      if (endDate) {
        metaQuery = metaQuery.or(`date_start.lte.${format(endDate, "yyyy-MM-dd")},date_start.is.null`);
      }

      const { data: metaData, error: metaError } = await metaQuery.order("campaign_name", { ascending: true, nullsFirst: false });

      if (!metaError && metaData) {
        allCampaigns.push(
          ...metaData.map((c) => ({
            id: c.id,
            campaign_id: c.campaign_id,
            campaign_name: c.campaign_name,
            platform: "meta" as const,
            objective: c.objective,
            status: c.status,
            date_start: c.date_start,
            date_stop: c.date_stop,
          }))
        );
      }

      // Fetch TikTok campaigns (distinct by campaign_id since tiktok_campaigns has demographic dimensions)
      const { data: tiktokData, error: tiktokError } = await supabase
        .from("tiktok_campaigns")
        .select("id, campaign_id, campaign_name, status")
        .eq("space_id", spaceId)
        .eq("age", "")
        .eq("gender", "")
        .eq("location", "")
        .order("campaign_name", { ascending: true, nullsFirst: false });

      if (!tiktokError && tiktokData) {
        allCampaigns.push(
          ...tiktokData.map((c) => ({
            id: c.id,
            campaign_id: c.campaign_id,
            campaign_name: c.campaign_name,
            platform: "tiktok" as const,
            objective: null,
            status: c.status,
            date_start: null,
            date_stop: null,
          }))
        );
      }

      setCampaigns(allCampaigns);

      // Validate existing selections
      const validMetaIds = new Set(allCampaigns.filter(c => c.platform === "meta").map(c => c.id));
      const validTiktokIds = new Set(allCampaigns.filter(c => c.platform === "tiktok").map(c => c.id));
      const filteredMeta = selectedCampaignIds.filter(id => validMetaIds.has(id));
      const filteredTiktok = selectedTiktokCampaignIds.filter(id => validTiktokIds.has(id));

      if (filteredMeta.length !== selectedCampaignIds.length || filteredTiktok.length !== selectedTiktokCampaignIds.length) {
        onSelectionChange(filteredMeta, filteredTiktok);
      }

      setLoading(false);
    };

    fetchCampaigns();
  }, [spaceId, startDate, endDate]);

  const allSelectedIds = [...selectedCampaignIds, ...selectedTiktokCampaignIds];

  const toggleCampaign = (campaign: UnifiedCampaign) => {
    if (campaign.platform === "meta") {
      if (selectedCampaignIds.includes(campaign.id)) {
        onSelectionChange(selectedCampaignIds.filter(id => id !== campaign.id), selectedTiktokCampaignIds);
      } else {
        onSelectionChange([...selectedCampaignIds, campaign.id], selectedTiktokCampaignIds);
      }
    } else {
      if (selectedTiktokCampaignIds.includes(campaign.id)) {
        onSelectionChange(selectedCampaignIds, selectedTiktokCampaignIds.filter(id => id !== campaign.id));
      } else {
        onSelectionChange(selectedCampaignIds, [...selectedTiktokCampaignIds, campaign.id]);
      }
    }
  };

  const removeCampaign = (campaign: UnifiedCampaign) => {
    if (campaign.platform === "meta") {
      onSelectionChange(selectedCampaignIds.filter(id => id !== campaign.id), selectedTiktokCampaignIds);
    } else {
      onSelectionChange(selectedCampaignIds, selectedTiktokCampaignIds.filter(id => id !== campaign.id));
    }
  };

  const selectedCampaigns = campaigns.filter(c => allSelectedIds.includes(c.id));

  const getDisplayName = (campaign: UnifiedCampaign) => {
    const name = campaign.campaign_name || campaign.campaign_id;
    const platformLabel = campaign.platform === "meta" ? "Meta" : "TikTok";
    return `[${platformLabel}] ${name}`;
  };

  // Sort selected campaigns to top
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aSelected = allSelectedIds.includes(a.id) ? 0 : 1;
    const bSelected = allSelectedIds.includes(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-2">Loading campaigns...</p>
    );
  }

  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">No campaigns found for this space.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-[35px] border-foreground"
          >
            {allSelectedIds.length > 0
              ? `${allSelectedIds.length} campaign${allSelectedIds.length > 1 ? "s" : ""} selected`
              : "Select campaigns..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
          <Command>
            <CommandInput placeholder="Search campaigns..." />
            <CommandList className="max-h-[200px]">
              <CommandEmpty>No campaigns found.</CommandEmpty>
              <CommandGroup>
                {sortedCampaigns.map((campaign) => {
                  const isSelected = allSelectedIds.includes(campaign.id);
                  return (
                    <CommandItem
                      key={campaign.id}
                      value={getDisplayName(campaign)}
                      onSelect={() => toggleCampaign(campaign)}
                      className={cn(
                        "data-[selected='true']:bg-accent data-[selected='true']:text-accent-foreground",
                        isSelected && "!bg-foreground !text-background"
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
                onClick={() => removeCampaign(campaign)}
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
