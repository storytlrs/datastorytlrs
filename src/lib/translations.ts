import { useTranslation } from "@/contexts/TranslationContext";

const dict: Record<string, string> = {
  // Toast messages
  "Nepodařilo se načíst data": "Failed to load data",
  "Nepodařilo se vygenerovat AI Insights": "Failed to generate AI Insights",
  "AI Insights vygenerovány úspěšně!": "AI Insights generated successfully!",
  "AI Insights uloženy": "AI Insights saved",
  "Nepodařilo se uložit AI Insights": "Failed to save AI Insights",
  "PDF exportováno úspěšně!": "PDF exported successfully!",
  "Nepodařilo se exportovat PDF": "Failed to export PDF",
  "Příliš mnoho požadavků. Zkuste to prosím později.": "Too many requests. Please try again later.",
  "Nedostatek kreditů. Doplňte prosím kredity ve workspace.": "Insufficient credits. Please top up credits in workspace.",
  "Chybí kontext kampaně. Použijte 'Generate AI Insights' pro první generování.": "Missing campaign context. Use 'Generate AI Insights' for initial generation.",
  "Chybí kontext kampaně. Použijte 'Generate AI Insights'.": "Missing campaign context. Use 'Generate AI Insights'.",
  "Nepodařilo se uložit": "Failed to save",
  "Žádné změny k uložení": "No changes to save",
  "Nepodařilo se načíst prompty": "Failed to load prompts",
  "Prompt uložen": "Prompt saved",
  "Nepodařilo se uložit prompt": "Failed to save prompt",
  "AI Insights vygenerovány": "AI Insights generated",
  "Chyba při generování insights": "Error generating insights",

  // Button labels
  "Uložit změny": "Save changes",
  "Zobrazit více": "Show more",
  "Zobrazit obsah": "View content",
  "Zrušit": "Cancel",
  "Generuji...": "Generating...",
  "Vymazat": "Clear",
  "Strukturovaný náhled": "Structured view",
  "Vygenerovat AI Insights": "Generate AI Insights",
  "Přegenerovat": "Regenerate",

  // Date range filter labels
  "Tento měsíc": "This month",
  "Tento kvartál": "This quarter",
  "Tento rok": "This year",
  "Minulý měsíc": "Last month",
  "Minulý kvartál": "Last quarter",
  "Minulý rok": "Last year",
  "Příští měsíc": "Next month",
  "Příští kvartál": "Next quarter",
  "Příští rok": "Next year",
  "Vybrat datum": "Select date",
  "Od": "From",
  "Do": "To",

  // Section headers (insights)
  "Základní přehled kampaně": "Campaign Overview",
  "Inovativní a kvalitativní metriky": "Innovation & Qualitative Metrics",
  "Sentiment kampaně": "Campaign Sentiment",
  "Plnění cílů": "Goal Fulfillment",
  "Klíčové metriky": "Key Metrics",
  "Detailní metriky": "Detail Metrics",
  "Vývoj metrik v čase": "Metrics Over Time",
  "Povědomí o značce": "Brand Awareness",
  "TOP příspěvky": "Top Posts",
  "Příspěvky ke zlepšení": "Posts to Improve",
  "Komunita": "Community",
  "Sledující": "Followers",
  "Celkové shrnutí": "Overall Summary",
  "Cílová skupina": "Target Audience",

  // Platform section headers (with dash)
  "Klíčové metriky – Facebook": "Key Metrics – Facebook",
  "Klíčové metriky – Instagram": "Key Metrics – Instagram",
  "Klíčové metriky – TikTok": "Key Metrics – TikTok",
  "Detailní metriky – Facebook": "Detail Metrics – Facebook",
  "Detailní metriky – Instagram": "Detail Metrics – Instagram",
  "Detailní metriky – TikTok": "Detail Metrics – TikTok",
  "Vývoj metrik v čase – Facebook": "Metrics Over Time – Facebook",
  "Vývoj metrik v čase – Instagram": "Metrics Over Time – Instagram",
  "Vývoj metrik v čase – TikTok": "Metrics Over Time – TikTok",
  "TOP příspěvky – Facebook": "Top Posts – Facebook",
  "TOP příspěvky – Instagram": "Top Posts – Instagram",
  "TOP příspěvky – TikTok": "Top Posts – TikTok",
  "Příspěvky ke zlepšení – Facebook": "Posts to Improve – Facebook",
  "Příspěvky ke zlepšení – Instagram": "Posts to Improve – Instagram",
  "Příspěvky ke zlepšení – TikTok": "Posts to Improve – TikTok",

  // Period labels
  "Měsíční": "Monthly",
  "Kvartální": "Quarterly",
  "Roční": "Yearly",

  // Placeholders
  "AI shrnutí základních metrik kampaně...": "AI summary of campaign basic metrics...",
  "AI shrnutí inovativních a kvalitativních metrik...": "AI summary of innovation and qualitative metrics...",
  "AI shrnutí awareness metrik...": "AI summary of awareness metrics...",
  "AI shrnutí engagement metrik...": "AI summary of engagement metrics...",
  "AI shrnutí nákladové efektivity...": "AI summary of cost effectiveness...",
  "AI analýza vlivu na povědomí o značce...": "AI analysis of brand awareness impact...",
  "Stručný popis obsahu...": "Brief content description...",
  "Zadejte prompt...": "Enter prompt...",

  // Dialog labels
  "Odpovězte na následující otázky pro vygenerování AI analýzy kampaně.": "Answer the following questions to generate AI campaign analysis.",
  "Co bylo hlavním cílem kampaně?": "What was the main goal of the campaign?",
  "Co jsme udělali pro dosažení cíle?": "What did we do to achieve the goal?",
  "Co se povedlo nejvíce?": "What was the biggest success?",
  "Např. Zvýšení povědomí o značce, launch nového produktu, zvýšení prodejů...": "E.g. Brand awareness increase, new product launch, sales increase...",
  "Např. Spolupráce s 10 influencery, vytvoření video obsahu, promo kódy...": "E.g. Collaboration with 10 influencers, video content creation, promo codes...",
  "Např. Virální video od @influencer, vysoká engagement rate, překročení cílů...": "E.g. Viral video from @influencer, high engagement rate, exceeding targets...",

  // Empty states
  "Klikněte na \"Generate AI Insights\" pro vygenerování AI analýzy kampaně.": "Click \"Generate AI Insights\" to generate AI campaign analysis.",
  "Klikněte na \"Generate AI Insights\" pro vygenerování AI analýzy ads kampaně.": "Click \"Generate AI Insights\" to generate AI ads campaign analysis.",
  "Obsah AI Insights (raw)": "AI Insights Content (raw)",
  "Žádné AI Insights": "No AI Insights",
  "AI Insights budou automaticky generovány po publikaci reportu, nebo je můžete vygenerovat ručně.": "AI Insights will be automatically generated after report publication, or you can generate them manually.",
  "Žádné prompty nenalezeny": "No prompts found",
  "Poslední aktualizace:": "Last updated:",

  // Admin
  "AI Prompty": "AI Prompts",
  "Zde můžete upravit prompty používané pro AI analýzy": "Here you can edit prompts used for AI analyses",
  "Neuloženo": "Unsaved",
  "Klíč:": "Key:",

  // Sentiment labels
  "Pozitivní": "Positive",
  "Negativní": "Negative",
  "Neutrální": "Neutral",

  // Tooltip labels
  "Regenerovat AI Insights s existujícím kontextem": "Regenerate AI Insights with existing context",

  // Creator performance - relevance explanations
  "značce": "brand",

  // Community management labels
  "Zodpovězené komentáře": "Answered Comments",
  "Zodpovězené DM": "Answered DMs",
  "Response rate (24h)": "Response rate (24h)",

  // Monthly/Quarterly/Yearly section titles
  "Co funguje": "What Works",
  "Hrozby a příležitosti": "Threats & Opportunities",
  "Zlepšení": "Improvements",
  "Co se zlepšuje": "What's Improving",
  "Oblasti k zaměření": "Focus Areas",
  "Změny": "Changes",
  "Co se dařilo": "What Worked",
  "Klíčové výsledky": "Key Results",
  "Co se stalo": "What Happened",
  "Co jsme vyřešili": "What We Solved",
  "Příležitosti a hrozby": "Opportunities & Threats",
  "Vývoj metrik": "Metrics Over Time",

  // Yearly specific
  "Analýza konkurence": "Competition Analysis",
  "TOP Reach": "TOP Reach",
  "TOP Engagement": "TOP Engagement",
  "TOP Video": "TOP Video",
  "Ke zlepšení – Reach": "To Improve – Reach",
  "Ke zlepšení – Engagement": "To Improve – Engagement",
  "Ke zlepšení – Video": "To Improve – Video",

  // Campaign specific
  "Klíčové metriky – Meta": "Key Metrics – Meta",
  "Klíčové metriky – TikTok (campaign)": "Key Metrics – TikTok",
  "Detailní metriky – Meta": "Detail Metrics – Meta",
  "Detailní metriky – TikTok (campaign)": "Detail Metrics – TikTok",
  "Nejlepší obsah": "Best Content",
  "Co fungovalo": "What Worked",
  "Co zlepšit": "What to Improve",
  "Co vyzkoušet": "What to Test",
};

export const useT = () => {
  const { isEnglish } = useTranslation();
  return (czech: string) => isEnglish ? (dict[czech] || czech) : czech;
};
