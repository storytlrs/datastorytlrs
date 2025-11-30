import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "./KPICard";
import { TrendingUp, Eye, MousePointer, DollarSign, Users } from "lucide-react";

const mockCampaigns = [
  { id: 1, name: "Summer Collection 2024", spend: 15420, impressions: 2450000, clicks: 48500, conversions: 1240, frequency: 2.8, ctr: 1.98, roas: 4.2, status: "active" },
  { id: 2, name: "Brand Awareness Q4", spend: 22100, impressions: 4200000, clicks: 63000, conversions: 980, frequency: 3.2, ctr: 1.5, roas: 2.8, status: "active" },
  { id: 3, name: "Holiday Campaign", spend: 8900, impressions: 1800000, clicks: 32400, conversions: 720, frequency: 2.1, ctr: 1.8, roas: 5.1, status: "paused" },
];

const mockAdsets = [
  { id: 1, campaignName: "Summer Collection 2024", name: "Women 25-34 Urban", spend: 8200, impressions: 1200000, clicks: 26400, conversions: 680, frequency: 2.6, ctr: 2.2, roas: 4.8 },
  { id: 2, campaignName: "Summer Collection 2024", name: "Men 18-24 Interest", spend: 7220, impressions: 1250000, clicks: 22100, conversions: 560, frequency: 3.0, ctr: 1.77, roas: 3.6 },
  { id: 3, campaignName: "Brand Awareness Q4", name: "Lookalike Audience", spend: 12500, impressions: 2400000, clicks: 36000, conversions: 580, frequency: 3.5, ctr: 1.5, roas: 2.9 },
  { id: 4, campaignName: "Brand Awareness Q4", name: "Retargeting Pool", spend: 9600, impressions: 1800000, clicks: 27000, conversions: 400, frequency: 2.9, ctr: 1.5, roas: 2.7 },
];

const mockAds = [
  { id: 1, adsetName: "Women 25-34 Urban", name: "Creative A - Video", spend: 4100, impressions: 620000, clicks: 14200, conversions: 380, frequency: 2.4, ctr: 2.29, roas: 5.2 },
  { id: 2, adsetName: "Women 25-34 Urban", name: "Creative B - Carousel", spend: 4100, impressions: 580000, clicks: 12200, conversions: 300, frequency: 2.8, ctr: 2.1, roas: 4.4 },
  { id: 3, adsetName: "Men 18-24 Interest", name: "Creative C - Static", spend: 3600, impressions: 650000, clicks: 11700, conversions: 290, frequency: 3.2, ctr: 1.8, roas: 3.8 },
  { id: 4, adsetName: "Lookalike Audience", name: "Creative D - UGC Video", spend: 6200, impressions: 1200000, clicks: 18600, conversions: 320, frequency: 3.6, ctr: 1.55, roas: 3.1 },
];

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatRatio = (value: number) => value.toFixed(1);

export const AdsTab = () => {
  const totalSpend = mockCampaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalImpressions = mockCampaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = mockCampaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgCTR = (totalClicks / totalImpressions) * 100;
  const avgROAS = (totalConversions * 65) / totalSpend;
  const avgFrequency = mockCampaigns.reduce((sum, c) => sum + c.frequency, 0) / mockCampaigns.length;

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          icon={DollarSign}
          accentColor="orange"
        />
        <KPICard
          title="Impressions"
          value={formatNumber(totalImpressions)}
          icon={Eye}
          accentColor="blue"
        />
        <KPICard
          title="Clicks"
          value={formatNumber(totalClicks)}
          icon={MousePointer}
          accentColor="default"
        />
        <KPICard
          title="Avg CTR"
          value={formatPercent(avgCTR)}
          icon={TrendingUp}
          accentColor="green"
        />
        <KPICard
          title="Avg ROAS"
          value={`${avgROAS.toFixed(1)}x`}
          icon={TrendingUp}
          accentColor="green"
        />
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="rounded-[35px] border border-foreground">
          <TabsTrigger value="campaigns" className="rounded-[35px]">
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="adsets" className="rounded-[35px]">
            Ad Sets
          </TabsTrigger>
          <TabsTrigger value="ads" className="rounded-[35px]">
            Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card className="rounded-[35px] border-foreground">
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={campaign.status === "active" ? "default" : "secondary"}
                          className="rounded-[35px]"
                        >
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                      <TableCell className="text-right">{formatPercent(campaign.ctr)}</TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                      <TableCell className="text-right font-medium">{campaign.roas.toFixed(1)}x</TableCell>
                      <TableCell className="text-right">{formatRatio(campaign.frequency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adsets">
          <Card className="rounded-[35px] border-foreground">
            <CardHeader>
              <CardTitle>Ad Set Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Set Name</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAdsets.map((adset) => (
                    <TableRow key={adset.id}>
                      <TableCell className="font-medium">{adset.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{adset.campaignName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(adset.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(adset.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(adset.clicks)}</TableCell>
                      <TableCell className="text-right">{formatPercent(adset.ctr)}</TableCell>
                      <TableCell className="text-right">{formatNumber(adset.conversions)}</TableCell>
                      <TableCell className="text-right font-medium">{adset.roas.toFixed(1)}x</TableCell>
                      <TableCell className="text-right">{formatRatio(adset.frequency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card className="rounded-[35px] border-foreground">
            <CardHeader>
              <CardTitle>Individual Ad Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Name</TableHead>
                    <TableHead>Ad Set</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-right">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{ad.adsetName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ad.spend)}</TableCell>
                      <TableCell className="text-right">{formatNumber(ad.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(ad.clicks)}</TableCell>
                      <TableCell className="text-right">{formatPercent(ad.ctr)}</TableCell>
                      <TableCell className="text-right">{formatNumber(ad.conversions)}</TableCell>
                      <TableCell className="text-right font-medium">{ad.roas.toFixed(1)}x</TableCell>
                      <TableCell className="text-right">{formatRatio(ad.frequency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
