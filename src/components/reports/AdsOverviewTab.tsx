import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "./KPICard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { 
  Eye, 
  DollarSign,
  MousePointer,
  BarChart3,
  CalendarIcon,
  X,
  Target,
  Users,
  Play,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  Bookmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency as formatCurrencyUtil, DEFAULT_CURRENCY } from "@/lib/currencyUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AdsOverviewTabProps {
  reportId: string;
}

interface AdSet {
  id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_name: string | null;
  platform: string;
  amount_spent: number | null;
  reach: number | null;
  impressions: number | null;
  thruplays: number | null;
  video_3s_plays: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  link_clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  date_stop: string | null;
}

interface Ad {
  id: string;
  ad_set_id: string;
  ad_name: string;
  platform: string;
  amount_spent: number | null;
  reach: number | null;
  impressions: number | null;
  thruplays: number | null;
  video_3s_plays: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  frequency: number | null;
  link_clicks: number | null;
  post_reactions: number | null;
  post_comments: number | null;
  post_shares: number | null;
  post_saves: number | null;
  date_start: string | null;
  date_stop: string | null;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatPercent = (num: number, decimals: number = 2): string => {
  return `${num.toFixed(decimals)}%`;
};

interface KPISectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

const KPISection = ({ title, icon: Icon, children }: KPISectionProps) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5" />
      <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {children}
    </div>
  </div>
);

export const AdsOverviewTab = ({ reportId }: AdsOverviewTabProps) => {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedAdSet, setSelectedAdSet] = useState<string>("all");
  const [selectedAd, setSelectedAd] = useState<string>("all");
  
  // Data source toggles
  const [showAdSets, setShowAdSets] = useState(true);
  const [showAds, setShowAds] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const [adSetsRes, adsRes] = await Promise.all([
        supabase.from("ad_sets").select("*").eq("report_id", reportId),
        supabase.from("ads").select("*").eq("report_id", reportId),
      ]);
      
      setAdSets(adSetsRes.data || []);
      setAds(adsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [reportId]);

  // Get unique campaigns for filter
  const campaigns = useMemo(() => {
    const uniqueCampaigns = new Map<string, string>();
    adSets.forEach((adSet) => {
      if (adSet.campaign_id && adSet.campaign_name) {
        uniqueCampaigns.set(adSet.campaign_id, adSet.campaign_name);
      }
    });
    return Array.from(uniqueCampaigns, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [adSets]);

  // Get ad sets filtered by campaign for dropdown
  const availableAdSets = useMemo(() => {
    let filtered = adSets;
    if (selectedCampaign !== "all") {
      filtered = adSets.filter(a => a.campaign_id === selectedCampaign);
    }
    return filtered
      .filter(a => a.ad_name)
      .sort((a, b) => (a.ad_name || "").localeCompare(b.ad_name || ""));
  }, [adSets, selectedCampaign]);

  // Get ads filtered by ad set for dropdown
  const availableAds = useMemo(() => {
    let filtered = ads;
    if (selectedAdSet !== "all") {
      filtered = ads.filter(a => a.ad_set_id === selectedAdSet);
    } else if (selectedCampaign !== "all") {
      const adSetIds = new Set(availableAdSets.map(a => a.id));
      filtered = ads.filter(a => adSetIds.has(a.ad_set_id));
    }
    return filtered.sort((a, b) => a.ad_name.localeCompare(b.ad_name));
  }, [ads, selectedAdSet, selectedCampaign, availableAdSets]);

  // Filter ad sets by date range and campaign
  const filteredAdSets = useMemo(() => {
    return adSets.filter((item) => {
      if (selectedCampaign !== "all" && item.campaign_id !== selectedCampaign) return false;
      if (selectedAdSet !== "all" && item.id !== selectedAdSet) return false;
      if (dateRange.start && item.date_start && new Date(item.date_start) < dateRange.start) return false;
      if (dateRange.end && item.date_stop && new Date(item.date_stop) > dateRange.end) return false;
      return true;
    });
  }, [adSets, selectedCampaign, selectedAdSet, dateRange]);

  // Filter ads
  const filteredAds = useMemo(() => {
    const adSetIds = new Set(filteredAdSets.map(a => a.id));
    return ads.filter((item) => {
      if (!adSetIds.has(item.ad_set_id)) return false;
      if (selectedAd !== "all" && item.id !== selectedAd) return false;
      if (dateRange.start && item.date_start && new Date(item.date_start) < dateRange.start) return false;
      if (dateRange.end && item.date_stop && new Date(item.date_stop) > dateRange.end) return false;
      return true;
    });
  }, [ads, filteredAdSets, selectedAd, dateRange]);

  // Calculate KPIs for Ad Sets
  const adSetKPIs = useMemo(() => {
    if (!showAdSets) return null;
    
    const data = filteredAdSets;
    const totalReach = data.reduce((sum, item) => sum + (item.reach || 0), 0);
    const totalImpressions = data.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const totalThruplays = data.reduce((sum, item) => sum + (item.thruplays || 0), 0);
    const total3sViews = data.reduce((sum, item) => sum + (item.video_3s_plays || 0), 0);
    const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    
    const totalLinkClicks = data.reduce((sum, item) => sum + (item.link_clicks || 0), 0);
    const totalReactions = data.reduce((sum, item) => sum + (item.post_reactions || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.post_comments || 0), 0);
    const totalShares = data.reduce((sum, item) => sum + (item.post_shares || 0), 0);
    const totalSaves = data.reduce((sum, item) => sum + (item.post_saves || 0), 0);
    const totalInteractions = totalReactions + totalComments + totalShares + totalSaves;
    const totalSpend = data.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
    
    return {
      awareness: {
        reach: totalReach,
        impressions: totalImpressions,
        thruplays: totalThruplays,
        video3sPlays: total3sViews,
        frequency: avgFrequency,
      },
      engagement: {
        linkClicks: totalLinkClicks,
        reactions: totalReactions,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
        interactions: totalInteractions,
        ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
        engagementRate: totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0,
        thruplayRate: totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0,
        viewRate3s: totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0,
      },
      effectiveness: {
        spend: totalSpend,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        cpc: totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0,
        costPerThruplay: totalThruplays > 0 ? totalSpend / totalThruplays : 0,
        costPer3sView: total3sViews > 0 ? totalSpend / total3sViews : 0,
        cpe: totalInteractions > 0 ? totalSpend / totalInteractions : 0,
        count: data.length,
      },
    };
  }, [filteredAdSets, showAdSets]);

  // Calculate KPIs for Ads
  const adsKPIs = useMemo(() => {
    if (!showAds) return null;
    
    const data = filteredAds;
    const totalReach = data.reduce((sum, item) => sum + (item.reach || 0), 0);
    const totalImpressions = data.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const totalThruplays = data.reduce((sum, item) => sum + (item.thruplays || 0), 0);
    const total3sViews = data.reduce((sum, item) => sum + (item.video_3s_plays || 0), 0);
    const avgFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    
    const totalLinkClicks = data.reduce((sum, item) => sum + (item.link_clicks || 0), 0);
    const totalReactions = data.reduce((sum, item) => sum + (item.post_reactions || 0), 0);
    const totalComments = data.reduce((sum, item) => sum + (item.post_comments || 0), 0);
    const totalShares = data.reduce((sum, item) => sum + (item.post_shares || 0), 0);
    const totalSaves = data.reduce((sum, item) => sum + (item.post_saves || 0), 0);
    const totalInteractions = totalReactions + totalComments + totalShares + totalSaves;
    const totalSpend = data.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
    
    return {
      awareness: {
        reach: totalReach,
        impressions: totalImpressions,
        thruplays: totalThruplays,
        video3sPlays: total3sViews,
        frequency: avgFrequency,
      },
      engagement: {
        linkClicks: totalLinkClicks,
        reactions: totalReactions,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
        interactions: totalInteractions,
        ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
        engagementRate: totalImpressions > 0 ? (totalInteractions / totalImpressions) * 100 : 0,
        thruplayRate: totalImpressions > 0 ? (totalThruplays / totalImpressions) * 100 : 0,
        viewRate3s: totalImpressions > 0 ? (total3sViews / totalImpressions) * 100 : 0,
      },
      effectiveness: {
        spend: totalSpend,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        cpc: totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0,
        costPerThruplay: totalThruplays > 0 ? totalSpend / totalThruplays : 0,
        costPer3sView: total3sViews > 0 ? totalSpend / total3sViews : 0,
        cpe: totalInteractions > 0 ? totalSpend / totalInteractions : 0,
        count: data.length,
      },
    };
  }, [filteredAds, showAds]);

  const formatCurrency = (num: number): string => formatCurrencyUtil(num, "CZK");

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    setSelectedCampaign("all");
    setSelectedAdSet("all");
    setSelectedAd("all");
  };

  const hasFilters = dateRange.start || dateRange.end || selectedCampaign !== "all" || selectedAdSet !== "all" || selectedAd !== "all";

  // Reset dependent filters when parent changes
  useEffect(() => {
    setSelectedAdSet("all");
    setSelectedAd("all");
  }, [selectedCampaign]);

  useEffect(() => {
    setSelectedAd("all");
  }, [selectedAdSet]);

  if (loading) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </Card>
    );
  }

  if (adSets.length === 0) {
    return (
      <Card className="p-8 rounded-[35px] border-foreground">
        <p className="text-muted-foreground text-center">
          No ads data available. Import data in the Data tab to see KPIs.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Start Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                dateRange.start
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.start ? format(dateRange.start, "MMM d, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-[20px]" align="start">
            <Calendar
              mode="single"
              selected={dateRange.start || undefined}
              onSelect={(date) => setDateRange((prev) => ({ ...prev, start: date || null }))}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* End Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-[35px] justify-start text-left font-normal hover:border-foreground hover:bg-foreground hover:text-background",
                dateRange.end
                  ? "border-accent-orange bg-accent-orange text-foreground"
                  : "border-foreground bg-card text-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.end ? format(dateRange.end, "MMM d, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-[20px]" align="start">
            <Calendar
              mode="single"
              selected={dateRange.end || undefined}
              onSelect={(date) => setDateRange((prev) => ({ ...prev, end: date || null }))}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Campaign Filter */}
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className={cn(
            "w-[200px] rounded-[35px]",
            selectedCampaign !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent className="rounded-[20px]">
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ad Set Filter */}
        <Select value={selectedAdSet} onValueChange={setSelectedAdSet}>
          <SelectTrigger className={cn(
            "w-[200px] rounded-[35px]",
            selectedAdSet !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="All ad sets" />
          </SelectTrigger>
          <SelectContent className="rounded-[20px]">
            <SelectItem value="all">All ad sets</SelectItem>
            {availableAdSets.map((adSet) => (
              <SelectItem key={adSet.id} value={adSet.id}>
                {adSet.ad_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ad Filter */}
        <Select value={selectedAd} onValueChange={setSelectedAd}>
          <SelectTrigger className={cn(
            "w-[200px] rounded-[35px]",
            selectedAd !== "all"
              ? "border-accent-orange bg-accent-orange text-foreground"
              : ""
          )}>
            <SelectValue placeholder="All ads" />
          </SelectTrigger>
          <SelectContent className="rounded-[20px]">
            <SelectItem value="all">All ads</SelectItem>
            {availableAds.map((ad) => (
              <SelectItem key={ad.id} value={ad.id}>
                {ad.ad_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="rounded-[35px]">
            <X className="w-4 h-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Data Source Toggles */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="show-adsets" 
            checked={showAdSets} 
            onCheckedChange={(checked) => setShowAdSets(checked === true)}
          />
          <Label htmlFor="show-adsets" className="font-medium cursor-pointer">Ad Sets</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="show-ads" 
            checked={showAds} 
            onCheckedChange={(checked) => setShowAds(checked === true)}
          />
          <Label htmlFor="show-ads" className="font-medium cursor-pointer">Ads</Label>
        </div>
      </div>

      {/* Ad Sets KPIs */}
      {adSetKPIs && (
        <div className="space-y-8">
          <div className="border-b pb-2">
            <h2 className="font-bold text-xl uppercase tracking-wide">Ad Sets</h2>
          </div>
          
          {/* Awareness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold text-lg uppercase tracking-wide">Awareness</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard title="Reach" value={formatNumber(adSetKPIs.awareness.reach)} icon={Users} accentColor="blue" />
              <KPICard title="Impressions" value={formatNumber(adSetKPIs.awareness.impressions)} icon={Eye} accentColor="blue" />
              <KPICard title="ThruPlays" value={formatNumber(adSetKPIs.awareness.thruplays)} icon={Play} accentColor="blue" />
              <KPICard title="3s Views" value={formatNumber(adSetKPIs.awareness.video3sPlays)} icon={Play} accentColor="blue" />
              <KPICard title="Frequency" value={adSetKPIs.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
            </div>
          </div>

          {/* Engagement Section */}
          <KPISection title="Engagement" icon={MessageCircle}>
            <KPICard title="Link Clicks" value={formatNumber(adSetKPIs.engagement.linkClicks)} icon={MousePointer} accentColor="green" />
            <KPICard title="Reactions" value={formatNumber(adSetKPIs.engagement.reactions)} icon={Heart} accentColor="green" />
            <KPICard title="Comments" value={formatNumber(adSetKPIs.engagement.comments)} icon={MessageCircle} accentColor="green" />
            <KPICard title="Shares" value={formatNumber(adSetKPIs.engagement.shares)} icon={Share2} accentColor="green" />
            <KPICard title="Saves" value={formatNumber(adSetKPIs.engagement.saves)} icon={Bookmark} accentColor="green" />
            <KPICard title="CTR" value={formatPercent(adSetKPIs.engagement.ctr)} icon={Target} accentColor="green" tooltip="CTR = (Link Clicks / Impressions) × 100" />
            <KPICard title="Engagement Rate" value={formatPercent(adSetKPIs.engagement.engagementRate)} icon={TrendingUp} accentColor="green" tooltip="Engagement Rate = (Interactions / Impressions) × 100" />
            <KPICard title="ThruPlay Rate" value={formatPercent(adSetKPIs.engagement.thruplayRate)} icon={Play} accentColor="green" tooltip="ThruPlay Rate = (ThruPlays / Impressions) × 100" />
            <KPICard title="3s View Rate" value={formatPercent(adSetKPIs.engagement.viewRate3s)} icon={Play} accentColor="green" tooltip="3s View Rate = (3s Views / Impressions) × 100" />
          </KPISection>

          {/* Effectiveness Section */}
          <KPISection title="Effectiveness" icon={BarChart3}>
            <KPICard title="Total Spend" value={formatCurrency(adSetKPIs.effectiveness.spend)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(adSetKPIs.effectiveness.cpm)} icon={DollarSign} accentColor="orange" tooltip="CPM = (Spend / Impressions) × 1000" />
            <KPICard title="CPC" value={formatCurrency(adSetKPIs.effectiveness.cpc)} icon={MousePointer} accentColor="orange" tooltip="CPC = Spend / Link Clicks" />
            <KPICard title="Cost per ThruPlay" value={formatCurrency(adSetKPIs.effectiveness.costPerThruplay)} icon={Play} accentColor="orange" tooltip="Cost per ThruPlay = Spend / ThruPlays" />
            <KPICard title="Cost per 3s View" value={formatCurrency(adSetKPIs.effectiveness.costPer3sView)} icon={Play} accentColor="orange" tooltip="Cost per 3s View = Spend / 3s Views" />
            <KPICard title="CPE" value={formatCurrency(adSetKPIs.effectiveness.cpe)} icon={Target} accentColor="orange" tooltip="CPE (Cost per Engagement) = Spend / Total Interactions" />
          </KPISection>
        </div>
      )}

      {/* Ads KPIs */}
      {adsKPIs && (
        <div className="space-y-8">
          <div className="border-b pb-2">
            <h2 className="font-bold text-xl uppercase tracking-wide">Ads</h2>
          </div>
          
          {/* Awareness Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <h3 className="font-bold text-lg uppercase tracking-wide">Awareness</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard title="Reach" value={formatNumber(adsKPIs.awareness.reach)} icon={Users} accentColor="blue" />
              <KPICard title="Impressions" value={formatNumber(adsKPIs.awareness.impressions)} icon={Eye} accentColor="blue" />
              <KPICard title="ThruPlays" value={formatNumber(adsKPIs.awareness.thruplays)} icon={Play} accentColor="blue" />
              <KPICard title="3s Views" value={formatNumber(adsKPIs.awareness.video3sPlays)} icon={Play} accentColor="blue" />
              <KPICard title="Frequency" value={adsKPIs.awareness.frequency.toFixed(2)} icon={TrendingUp} accentColor="blue" />
            </div>
          </div>

          {/* Engagement Section */}
          <KPISection title="Engagement" icon={MessageCircle}>
            <KPICard title="Link Clicks" value={formatNumber(adsKPIs.engagement.linkClicks)} icon={MousePointer} accentColor="green" />
            <KPICard title="Reactions" value={formatNumber(adsKPIs.engagement.reactions)} icon={Heart} accentColor="green" />
            <KPICard title="Comments" value={formatNumber(adsKPIs.engagement.comments)} icon={MessageCircle} accentColor="green" />
            <KPICard title="Shares" value={formatNumber(adsKPIs.engagement.shares)} icon={Share2} accentColor="green" />
            <KPICard title="Saves" value={formatNumber(adsKPIs.engagement.saves)} icon={Bookmark} accentColor="green" />
            <KPICard title="CTR" value={formatPercent(adsKPIs.engagement.ctr)} icon={Target} accentColor="green" tooltip="CTR = (Link Clicks / Impressions) × 100" />
            <KPICard title="Engagement Rate" value={formatPercent(adsKPIs.engagement.engagementRate)} icon={TrendingUp} accentColor="green" tooltip="Engagement Rate = (Interactions / Impressions) × 100" />
            <KPICard title="ThruPlay Rate" value={formatPercent(adsKPIs.engagement.thruplayRate)} icon={Play} accentColor="green" tooltip="ThruPlay Rate = (ThruPlays / Impressions) × 100" />
            <KPICard title="3s View Rate" value={formatPercent(adsKPIs.engagement.viewRate3s)} icon={Play} accentColor="green" tooltip="3s View Rate = (3s Views / Impressions) × 100" />
          </KPISection>

          {/* Effectiveness Section */}
          <KPISection title="Effectiveness" icon={BarChart3}>
            <KPICard title="Total Spend" value={formatCurrency(adsKPIs.effectiveness.spend)} icon={DollarSign} accentColor="orange" />
            <KPICard title="CPM" value={formatCurrency(adsKPIs.effectiveness.cpm)} icon={DollarSign} accentColor="orange" tooltip="CPM = (Spend / Impressions) × 1000" />
            <KPICard title="CPC" value={formatCurrency(adsKPIs.effectiveness.cpc)} icon={MousePointer} accentColor="orange" tooltip="CPC = Spend / Link Clicks" />
            <KPICard title="Cost per ThruPlay" value={formatCurrency(adsKPIs.effectiveness.costPerThruplay)} icon={Play} accentColor="orange" tooltip="Cost per ThruPlay = Spend / ThruPlays" />
            <KPICard title="Cost per 3s View" value={formatCurrency(adsKPIs.effectiveness.costPer3sView)} icon={Play} accentColor="orange" tooltip="Cost per 3s View = Spend / 3s Views" />
            <KPICard title="CPE" value={formatCurrency(adsKPIs.effectiveness.cpe)} icon={Target} accentColor="orange" tooltip="CPE (Cost per Engagement) = Spend / Total Interactions" />
          </KPISection>
        </div>
      )}

      {/* No data selected message */}
      {!showAdSets && !showAds && (
        <Card className="p-8 rounded-[35px] border-foreground">
          <p className="text-muted-foreground text-center">
            Vyber alespoň jednu kategorii (Ad Sets nebo Ads) pro zobrazení KPI.
          </p>
        </Card>
      )}
    </div>
  );
};
