-- Create enum types for content and platforms
CREATE TYPE content_type AS ENUM ('story', 'reel', 'post', 'video', 'short');
CREATE TYPE platform_type AS ENUM ('instagram', 'tiktok', 'youtube', 'facebook', 'twitter');
CREATE TYPE import_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE import_source AS ENUM ('birell', 'carl', 'hypeauditor', 'xlsx', 'csv');
CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral');

-- Data imports tracking table
CREATE TABLE public.data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  source import_source NOT NULL,
  status import_status NOT NULL DEFAULT 'pending',
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  rows_total INTEGER,
  rows_imported INTEGER,
  rows_failed INTEGER,
  errors JSONB,
  warnings JSONB,
  mapping_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creators/Influencers table
CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  platform platform_type NOT NULL,
  followers INTEGER,
  profile_url TEXT,
  avatar_url TEXT,
  audience_breakdown JSONB,
  sentiment_summary JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, handle, platform)
);

-- Content/Posts table
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  platform platform_type NOT NULL,
  url TEXT,
  thumbnail_url TEXT,
  published_date TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  views INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  watch_time INTEGER, -- in seconds
  
  -- Cost metrics
  cost DECIMAL(10,2),
  cpm DECIMAL(10,2),
  cpv DECIMAL(10,4),
  cpe DECIMAL(10,4),
  
  -- Quality metrics
  is_branded BOOLEAN DEFAULT false,
  brand_minutes DECIMAL(10,2),
  main_usp TEXT,
  sentiment sentiment_type,
  aqs DECIMAL(5,2), -- Ad Quality Score
  
  -- Exposure breakdown
  organic_views INTEGER DEFAULT 0,
  paid_views INTEGER DEFAULT 0,
  branded_views INTEGER DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- KPI Targets table (planned vs actual)
CREATE TABLE public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  planned_value DECIMAL(15,2) NOT NULL,
  actual_value DECIMAL(15,2),
  unit TEXT, -- e.g., 'views', '$', '%', 'minutes'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, kpi_name)
);

-- Tags table (for USPs, themes, content types, creator types)
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'usp', 'theme', 'content_type', 'creator_type'
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, type)
);

-- Content-Tags junction table
CREATE TABLE public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_id, tag_id)
);

-- Promo codes table (for e-commerce tracking)
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.creators(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, code)
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'import', 'update', 'delete', 'export', 'share'
  user_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_data_imports_report_id ON public.data_imports(report_id);
CREATE INDEX idx_data_imports_status ON public.data_imports(status);
CREATE INDEX idx_creators_report_id ON public.creators(report_id);
CREATE INDEX idx_creators_platform ON public.creators(platform);
CREATE INDEX idx_content_report_id ON public.content(report_id);
CREATE INDEX idx_content_creator_id ON public.content(creator_id);
CREATE INDEX idx_content_platform ON public.content(platform);
CREATE INDEX idx_content_published_date ON public.content(published_date);
CREATE INDEX idx_kpi_targets_report_id ON public.kpi_targets(report_id);
CREATE INDEX idx_content_tags_content_id ON public.content_tags(content_id);
CREATE INDEX idx_content_tags_tag_id ON public.content_tags(tag_id);
CREATE INDEX idx_promo_codes_report_id ON public.promo_codes(report_id);
CREATE INDEX idx_audit_log_report_id ON public.audit_log(report_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_targets_updated_at
  BEFORE UPDATE ON public.kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for data_imports
CREATE POLICY "Users can view imports in their spaces"
  ON public.data_imports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = data_imports.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can create imports"
  ON public.data_imports FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

CREATE POLICY "Admins and analysts can update imports"
  ON public.data_imports FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for creators
CREATE POLICY "Users can view creators in their spaces"
  ON public.creators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = creators.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can manage creators"
  ON public.creators FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for content
CREATE POLICY "Users can view content in their spaces"
  ON public.content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = content.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can manage content"
  ON public.content FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for kpi_targets
CREATE POLICY "Users can view KPI targets in their spaces"
  ON public.kpi_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = kpi_targets.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can manage KPI targets"
  ON public.kpi_targets FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for tags (shared across all reports)
CREATE POLICY "Everyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins and analysts can manage tags"
  ON public.tags FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for content_tags
CREATE POLICY "Users can view content tags in their spaces"
  ON public.content_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content c
      JOIN public.reports r ON c.report_id = r.id
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE c.id = content_tags.content_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can manage content tags"
  ON public.content_tags FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for promo_codes
CREATE POLICY "Users can view promo codes in their spaces"
  ON public.promo_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = promo_codes.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can manage promo codes"
  ON public.promo_codes FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs in their spaces"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.space_users su ON r.space_id = su.space_id
      WHERE r.id = audit_log.report_id 
      AND su.user_id = auth.uid()
    ) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins and analysts can create audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'analyst'::app_role)
  );