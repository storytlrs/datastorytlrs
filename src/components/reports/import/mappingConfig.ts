// Configuration for column mapping in the import wizard

export type TargetTable = "creators" | "content" | "promo_codes" | "media_plan_items";

export interface MappingField {
  key: string;
  label: string;
  table: TargetTable;
  required: boolean;
  type: "text" | "number" | "date" | "enum";
  enumValues?: string[];
}

// All available fields for mapping organized by table
export const MAPPING_FIELDS: MappingField[] = [
  // Creators fields
  { key: "handle", label: "Handle", table: "creators", required: true, type: "text" },
  { key: "platform", label: "Platform", table: "creators", required: true, type: "enum", enumValues: ["instagram", "tiktok", "youtube", "facebook", "twitter"] },
  { key: "followers", label: "Followers", table: "creators", required: false, type: "number" },
  { key: "posts_count", label: "Posts Count", table: "creators", required: false, type: "number" },
  { key: "posts_cost", label: "Posts Cost", table: "creators", required: false, type: "number" },
  { key: "reels_count", label: "Reels Count", table: "creators", required: false, type: "number" },
  { key: "reels_cost", label: "Reels Cost", table: "creators", required: false, type: "number" },
  { key: "stories_count", label: "Stories Count", table: "creators", required: false, type: "number" },
  { key: "stories_cost", label: "Stories Cost", table: "creators", required: false, type: "number" },
  { key: "currency", label: "Currency", table: "creators", required: false, type: "enum", enumValues: ["CZK", "EUR", "USD", "GBP", "PLN"] },
  { key: "avg_reach", label: "Avg Reach", table: "creators", required: false, type: "number" },
  { key: "avg_views", label: "Avg Views", table: "creators", required: false, type: "number" },
  { key: "avg_engagement_rate", label: "Avg Engagement Rate", table: "creators", required: false, type: "number" },
  { key: "profile_url", label: "Profile URL", table: "creators", required: false, type: "text" },
  { key: "notes", label: "Notes", table: "creators", required: false, type: "text" },

  // Content fields
  { key: "creator_handle", label: "Creator Handle", table: "content", required: true, type: "text" },
  { key: "content_platform", label: "Platform", table: "content", required: true, type: "enum", enumValues: ["instagram", "tiktok", "youtube", "facebook", "twitter"] },
  { key: "content_type", label: "Content Type", table: "content", required: true, type: "enum", enumValues: ["post", "reel", "story", "video", "short"] },
  { key: "url", label: "URL", table: "content", required: false, type: "text" },
  { key: "published_date", label: "Published Date", table: "content", required: false, type: "date" },
  { key: "reach", label: "Reach", table: "content", required: false, type: "number" },
  { key: "impressions", label: "Impressions", table: "content", required: false, type: "number" },
  { key: "views", label: "Views", table: "content", required: false, type: "number" },
  { key: "likes", label: "Likes", table: "content", required: false, type: "number" },
  { key: "comments", label: "Comments", table: "content", required: false, type: "number" },
  { key: "shares", label: "Shares", table: "content", required: false, type: "number" },
  { key: "saves", label: "Saves", table: "content", required: false, type: "number" },
  { key: "reposts", label: "Reposts", table: "content", required: false, type: "number" },
  { key: "sticker_clicks", label: "Sticker Clicks", table: "content", required: false, type: "number" },
  { key: "link_clicks", label: "Link Clicks", table: "content", required: false, type: "number" },
  { key: "watch_time", label: "Watch Time (seconds)", table: "content", required: false, type: "number" },
  { key: "avg_watch_time", label: "Avg Watch Time (seconds)", table: "content", required: false, type: "number" },

  // Promo Codes fields
  { key: "promo_creator_handle", label: "Creator Handle", table: "promo_codes", required: false, type: "text" },
  { key: "code", label: "Promo Code", table: "promo_codes", required: true, type: "text" },
  { key: "clicks", label: "Clicks", table: "promo_codes", required: false, type: "number" },
  { key: "purchases", label: "Purchases", table: "promo_codes", required: false, type: "number" },
  { key: "revenue", label: "Revenue", table: "promo_codes", required: false, type: "number" },
  { key: "conversion_rate", label: "Conversion Rate", table: "promo_codes", required: false, type: "number" },

  // Media Plan fields
  { key: "type", label: "Type", table: "media_plan_items", required: false, type: "text" },
  { key: "placements", label: "Placements", table: "media_plan_items", required: false, type: "text" },
  { key: "media_buying_type", label: "Media Buying Type / Optimization", table: "media_plan_items", required: false, type: "text" },
  { key: "creatives", label: "Creatives", table: "media_plan_items", required: false, type: "text" },
  { key: "mp_impressions", label: "Impressions", table: "media_plan_items", required: false, type: "number" },
  { key: "mp_reach", label: "Reach", table: "media_plan_items", required: false, type: "number" },
  { key: "mp_frequency", label: "Frequency", table: "media_plan_items", required: false, type: "number" },
  { key: "mp_cpm", label: "CPM", table: "media_plan_items", required: false, type: "number" },
  { key: "budget", label: "Budget", table: "media_plan_items", required: false, type: "number" },
  { key: "mp_platform", label: "Platform", table: "media_plan_items", required: false, type: "text" },
  { key: "target_group", label: "Target Group", table: "media_plan_items", required: false, type: "text" },
];

// Get fields grouped by table
export const getFieldsByTable = () => {
  const grouped: Record<TargetTable, MappingField[]> = {
    creators: [],
    content: [],
    promo_codes: [],
    media_plan_items: [],
  };

  MAPPING_FIELDS.forEach((field) => {
    grouped[field.table].push(field);
  });

  return grouped;
};

// Auto-suggestion mapping based on column names (case-insensitive)
export const AUTO_SUGGESTIONS: Record<string, string> = {
  // Creators
  "handle": "creators.handle",
  "username": "creators.handle",
  "account": "creators.handle",
  "influencer": "creators.handle",
  "creator": "creators.handle",
  "název účtu": "creators.handle",
  "jméno": "creators.handle",
  "followers": "creators.followers",
  "sledující": "creators.followers",
  "počet sledujících": "creators.followers",
  "platform": "creators.platform",
  "platforma": "creators.platform",
  "posts count": "creators.posts_count",
  "počet postů": "creators.posts_count",
  "posts cost": "creators.posts_cost",
  "cena za post": "creators.posts_cost",
  "reels count": "creators.reels_count",
  "počet reels": "creators.reels_count",
  "reels cost": "creators.reels_cost",
  "cena za reel": "creators.reels_cost",
  "stories count": "creators.stories_count",
  "počet stories": "creators.stories_count",
  "stories cost": "creators.stories_cost",
  "cena za story": "creators.stories_cost",
  "currency": "creators.currency",
  "měna": "creators.currency",
  "avg reach": "creators.avg_reach",
  "průměrný reach": "creators.avg_reach",
  "avg views": "creators.avg_views",
  "průměrné views": "creators.avg_views",
  "avg engagement": "creators.avg_engagement_rate",
  "průměrné er": "creators.avg_engagement_rate",
  "profile url": "creators.profile_url",
  "url profilu": "creators.profile_url",
  "notes": "creators.notes",
  "poznámky": "creators.notes",

  // Content
  "post url": "content.url",
  "url": "content.url",
  "link": "content.url",
  "odkaz": "content.url",
  "type": "content.content_type",
  "content type": "content.content_type",
  "post type": "content.content_type",
  "typ": "content.content_type",
  "typ obsahu": "content.content_type",
  "date": "content.published_date",
  "published": "content.published_date",
  "post date": "content.published_date",
  "datum": "content.published_date",
  "datum publikace": "content.published_date",
  "reach": "content.reach",
  "dosah": "content.reach",
  "impressions": "content.impressions",
  "zobrazení": "content.impressions",
  "views": "content.views",
  "zhlédnutí": "content.views",
  "likes": "content.likes",
  "lajky": "content.likes",
  "to se mi líbí": "content.likes",
  "comments": "content.comments",
  "komentáře": "content.comments",
  "shares": "content.shares",
  "sdílení": "content.shares",
  "saves": "content.saves",
  "uložení": "content.saves",
  "reposts": "content.reposts",
  "sticker clicks": "content.sticker_clicks",
  "link clicks": "content.link_clicks",
  "watch time": "content.watch_time",
  "doba sledování": "content.watch_time",
  "avg watch time": "content.avg_watch_time",
  "průměrná doba sledování": "content.avg_watch_time",

  // Promo Codes
  "promo code": "promo_codes.code",
  "promocode": "promo_codes.code",
  "code": "promo_codes.code",
  "coupon": "promo_codes.code",
  "kód": "promo_codes.code",
  "slevový kód": "promo_codes.code",
  "clicks": "promo_codes.clicks",
  "kliknutí": "promo_codes.clicks",
  "purchases": "promo_codes.purchases",
  "nákupy": "promo_codes.purchases",
  "revenue": "promo_codes.revenue",
  "tržby": "promo_codes.revenue",
  "příjmy": "promo_codes.revenue",
  "conversion": "promo_codes.conversion_rate",
  "conversion rate": "promo_codes.conversion_rate",
  "konverze": "promo_codes.conversion_rate",

  // Media Plan
  "placements": "media_plan_items.placements",
  "umístění": "media_plan_items.placements",
  "placement": "media_plan_items.placements",
  "media buying": "media_plan_items.media_buying_type",
  "media buying type": "media_plan_items.media_buying_type",
  "media buying typ": "media_plan_items.media_buying_type",
  "optimization": "media_plan_items.media_buying_type",
  "optimalizace": "media_plan_items.media_buying_type",
  "typ optimalizace": "media_plan_items.media_buying_type",
  "media buying type optimization": "media_plan_items.media_buying_type",
  "media buying typ optimization": "media_plan_items.media_buying_type",
  "creatives": "media_plan_items.creatives",
  "kreativy": "media_plan_items.creatives",
  "kreativa": "media_plan_items.creatives",
  "budget": "media_plan_items.budget",
  "rozpočet": "media_plan_items.budget",
  "cpm": "media_plan_items.mp_cpm",
  "frequency": "media_plan_items.mp_frequency",
  "frekvence": "media_plan_items.mp_frequency",
  "target group": "media_plan_items.target_group",
  "cílová skupina": "media_plan_items.target_group",
  "cílovka": "media_plan_items.target_group",
  "targeting": "media_plan_items.target_group",
  // Media plan context-aware keys (used via preferTable matching)
  "mp_type": "media_plan_items.type",
  "mp_platform": "media_plan_items.mp_platform",
  "mp_impressions": "media_plan_items.mp_impressions",
  "mp_reach": "media_plan_items.mp_reach",
  "mp_frequency": "media_plan_items.mp_frequency",
  "mp_cpm": "media_plan_items.mp_cpm",
  "mp_budget": "media_plan_items.budget",
};

// Suggest mapping based on column name, optionally preferring a specific table
export const suggestMapping = (columnName: string, preferTable?: TargetTable): string | null => {
  const normalizedName = columnName.toLowerCase().trim();
  
  // Direct match
  if (AUTO_SUGGESTIONS[normalizedName]) {
    const suggestion = AUTO_SUGGESTIONS[normalizedName];
    // If we have a preferred table, check if there's a better match for that table
    if (preferTable) {
      const preferredMatch = findPreferredMatch(normalizedName, preferTable);
      if (preferredMatch) return preferredMatch;
    }
    return suggestion;
  }

  // Partial match - collect all matches
  const matches: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(AUTO_SUGGESTIONS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      matches.push({ key, value });
    }
  }

  if (matches.length > 0) {
    // If we prefer a specific table, pick a match from that table first
    if (preferTable) {
      const preferred = matches.find(m => m.value.startsWith(preferTable + "."));
      if (preferred) return preferred.value;
    }
    return matches[0].value;
  }

  return null;
};

// Find a mapping field for a given column name within a preferred table
const findPreferredMatch = (normalizedName: string, preferTable: TargetTable): string | null => {
  // Check direct match in preferred table
  for (const [key, value] of Object.entries(AUTO_SUGGESTIONS)) {
    if ((normalizedName === key || normalizedName.includes(key) || key.includes(normalizedName)) 
        && value.startsWith(preferTable + ".")) {
      return value;
    }
  }
  return null;
};

// Parse mapping string (e.g., "creators.handle") into table and field
export const parseMappingTarget = (mapping: string): { table: TargetTable; field: string } | null => {
  if (!mapping) return null;
  const [table, field] = mapping.split(".");
  if (!table || !field) return null;
  return { table: table as TargetTable, field };
};

// Get display label for a mapping
export const getMappingLabel = (mapping: string): string => {
  const parsed = parseMappingTarget(mapping);
  if (!parsed) return mapping;
  
  const field = MAPPING_FIELDS.find(
    f => f.table === parsed.table && f.key === parsed.field
  );
  
  if (!field) return mapping;
  
  const tableLabels: Record<TargetTable, string> = {
    creators: "Creators",
    content: "Content",
    promo_codes: "Promo Codes",
    media_plan_items: "Media Plan",
  };
  
  return `${tableLabels[parsed.table]}: ${field.label}`;
};

// Validate required fields for a given data type
export const validateMappings = (
  mappings: Record<string, string | null>
): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const mappedTables = new Set<TargetTable>();
  const mappedFields = new Map<string, string>();
  
  // Collect mapped tables and fields
  Object.entries(mappings).forEach(([column, mapping]) => {
    if (mapping) {
      const parsed = parseMappingTarget(mapping);
      if (parsed) {
        mappedTables.add(parsed.table);
        mappedFields.set(`${parsed.table}.${parsed.field}`, column);
      }
    }
  });
  
  // Check required fields for each mapped table
  if (mappedTables.has("creators")) {
    if (!mappedFields.has("creators.handle")) {
      errors.push("Creators: Handle is required");
    }
    if (!mappedFields.has("creators.platform")) {
      warnings.push("Creators: Platform is recommended (will default to 'instagram')");
    }
  }
  
  if (mappedTables.has("content")) {
    if (!mappedFields.has("content.creator_handle")) {
      errors.push("Content: Creator Handle is required to link content to creators");
    }
    if (!mappedFields.has("content.content_platform")) {
      warnings.push("Content: Platform is recommended (will default to 'instagram')");
    }
    if (!mappedFields.has("content.content_type")) {
      warnings.push("Content: Content Type is recommended (will default to 'post')");
    }
  }
  
  if (mappedTables.has("promo_codes")) {
    if (!mappedFields.has("promo_codes.code")) {
      errors.push("Promo Codes: Code is required");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// Get table display label
export const getTableLabel = (table: TargetTable): string => {
  const labels: Record<TargetTable, string> = {
    creators: "Creators",
    content: "Content",
    promo_codes: "Promo Codes",
    media_plan_items: "Media Plan",
  };
  return labels[table];
};
