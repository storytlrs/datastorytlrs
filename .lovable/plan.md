

# Plán: Přidání filtrů Creator a Campaign do Influencers tabu

## Přehled změn

Přidáme dva nové filtry specifické pro Influencers tab:
- **Creator** - filtr podle influencera (handle)
- **Campaign** - filtr podle názvu reportu (kampaně)

---

## Vizuální náhled

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Content]  [Ads]  [Influencers]  [Insights]  [Reports]                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Shared: [Start Date] [End Date] [Platform ▼]                               │
│  Influencers only: [Creator ▼] [Campaign ▼] [Clear]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Dashboard content...                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### Možnost A: Filtry uvnitř BrandInfluencersDashboard

Přidáme filtry přímo do komponenty `BrandInfluencersDashboard.tsx`, aby byly specifické pouze pro tento tab. Toto je čistší řešení, protože:
- Creator a Campaign filtry nedávají smysl pro Content a Ads taby
- Držíme logiku pohromadě

### Změny v `BrandInfluencersDashboard.tsx`:

1. **Přidat nové states pro filtry**:
   ```typescript
   const [selectedCreator, setSelectedCreator] = useState<string>("all");
   const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
   ```

2. **Rozšířit fetchData o načtení reportů**:
   - Potřebujeme načíst i názvy reportů pro Campaign filtr
   
   ```typescript
   interface Report {
     id: string;
     name: string;
   }
   
   const [reports, setReports] = useState<Report[]>([]);
   ```

3. **Vytvořit seznamy pro filtry**:
   ```typescript
   // Unique creators for filter dropdown (sorted alphabetically)
   const creatorOptions = useMemo(() => {
     return [...new Set(creators.map(c => c.handle))]
       .sort((a, b) => a.localeCompare(b, "cs"));
   }, [creators]);
   
   // Report options for campaign filter (sorted alphabetically)
   const campaignOptions = useMemo(() => {
     return reports.sort((a, b) => a.name.localeCompare(b.name, "cs"));
   }, [reports]);
   ```

4. **Filtrovat data podle vybraných filtrů**:
   ```typescript
   const filteredContent = useMemo(() => {
     return content.filter(c => {
       // Filter by creator
       if (selectedCreator !== "all") {
         const creator = creatorMap.get(c.creator_id);
         if (creator?.handle !== selectedCreator) return false;
       }
       // Filter by campaign (report)
       if (selectedCampaign !== "all" && c.report_id !== selectedCampaign) {
         return false;
       }
       return true;
     });
   }, [content, selectedCreator, selectedCampaign, creatorMap]);
   
   const filteredCreators = useMemo(() => {
     if (selectedCampaign === "all" && selectedCreator === "all") return creators;
     return creators.filter(c => {
       if (selectedCampaign !== "all" && c.report_id !== selectedCampaign) return false;
       if (selectedCreator !== "all" && c.handle !== selectedCreator) return false;
       return true;
     });
   }, [creators, selectedCampaign, selectedCreator]);
   ```

5. **Přidat UI pro filtry**:
   ```tsx
   {/* Influencer-specific filters */}
   <div className="flex flex-wrap gap-3 mb-6">
     <Select value={selectedCreator} onValueChange={setSelectedCreator}>
       <SelectTrigger className={cn(
         "w-[200px] rounded-[35px]",
         selectedCreator !== "all"
           ? "border-accent-orange bg-accent-orange text-foreground"
           : ""
       )}>
         <SelectValue placeholder="Creator" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="all">All creators</SelectItem>
         {creatorOptions.map((handle) => (
           <SelectItem key={handle} value={handle}>{handle}</SelectItem>
         ))}
       </SelectContent>
     </Select>
     
     <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
       <SelectTrigger className={cn(
         "w-[200px] rounded-[35px]",
         selectedCampaign !== "all"
           ? "border-accent-orange bg-accent-orange text-foreground"
           : ""
       )}>
         <SelectValue placeholder="Campaign" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="all">All campaigns</SelectItem>
         {campaignOptions.map((report) => (
           <SelectItem key={report.id} value={report.id}>{report.name}</SelectItem>
         ))}
       </SelectContent>
     </Select>
     
     {(selectedCreator !== "all" || selectedCampaign !== "all") && (
       <Button
         variant="ghost"
         onClick={() => {
           setSelectedCreator("all");
           setSelectedCampaign("all");
         }}
         className="rounded-[35px]"
       >
         Clear
       </Button>
     )}
   </div>
   ```

6. **Aktualizovat všechny výpočty (kpis, chartData, topContent)**:
   - Použít `filteredContent` a `filteredCreators` místo `content` a `creators`

---

## Potřebné importy

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

---

## Dotčený soubor

| Soubor | Akce |
|--------|------|
| `src/components/brands/BrandInfluencersDashboard.tsx` | Přidat Creator a Campaign filtry |

---

## Výsledek

- Creator filtr - dropdown s abecedně seřazenými handly influencerů
- Campaign filtr - dropdown s abecedně seřazenými názvy kampaní (reportů)
- Filtry jsou specifické pouze pro Influencers tab
- Konzistentní styling s ostatními filtry (orange accent když aktivní)
- Všechny metriky, graf i Top 5 content se aktualizují podle vybraných filtrů

