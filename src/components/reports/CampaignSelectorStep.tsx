import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BrandCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  objective: string | null;
  status: string | null;
  date_start: string | null;
  date_stop: string | null;
  amount_spent: number | null;
  impressions: number | null;
}

interface CampaignSelectorStepProps {
  spaceId: string;
  selectedCampaignIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const CampaignSelectorStep = ({
  spaceId,
  selectedCampaignIds,
  onSelectionChange,
}: CampaignSelectorStepProps) => {
  const [campaigns, setCampaigns] = useState<BrandCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("brand_campaigns")
        .select("id, campaign_id, campaign_name, objective, status, date_start, date_stop, amount_spent, impressions")
        .eq("space_id", spaceId)
        .order("date_start", { ascending: false, nullsFirst: false });

      if (!error && data) {
        setCampaigns(data);
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, [spaceId]);

  const toggleCampaign = (id: string) => {
    if (selectedCampaignIds.includes(id)) {
      onSelectionChange(selectedCampaignIds.filter((cid) => cid !== id));
    } else {
      onSelectionChange([...selectedCampaignIds, id]);
    }
  };

  const filtered = campaigns.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.campaign_name?.toLowerCase().includes(q) ?? false) ||
      c.campaign_id.toLowerCase().includes(q) ||
      (c.objective?.toLowerCase().includes(q) ?? false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <p className="font-medium">No campaigns found for this brand</p>
        <p className="text-sm">You can skip this step and add campaigns later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-[35px]"
        />
      </div>

      {selectedCampaignIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedCampaignIds.length} campaign{selectedCampaignIds.length > 1 ? "s" : ""} selected
        </p>
      )}

      <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
        {filtered.map((campaign) => {
          const isSelected = selectedCampaignIds.includes(campaign.id);
          return (
            <div
              key={campaign.id}
              onClick={() => toggleCampaign(campaign.id)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-foreground/40"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleCampaign(campaign.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {campaign.campaign_name || campaign.campaign_id}
                  </p>
                  {campaign.status && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {campaign.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {campaign.objective && <span>{campaign.objective}</span>}
                  {campaign.date_start && campaign.date_stop && (
                    <span>
                      {format(new Date(campaign.date_start), "d.M.yyyy")} – {format(new Date(campaign.date_stop), "d.M.yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No campaigns match your search
          </p>
        )}
      </div>
    </div>
  );
};
