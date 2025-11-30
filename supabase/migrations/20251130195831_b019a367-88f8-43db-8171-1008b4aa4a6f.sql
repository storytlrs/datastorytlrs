-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'client');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create spaces table (clients/organizations)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- Create space_users table (many-to-many relationship)
CREATE TABLE public.space_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);

ALTER TABLE public.space_users ENABLE ROW LEVEL SECURITY;

-- Create report_type enum
CREATE TYPE public.report_type AS ENUM ('influencer', 'social', 'ads');

-- Create report_status enum
CREATE TYPE public.report_status AS ENUM ('draft', 'active', 'archived');

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type report_type NOT NULL,
  status report_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign analyst role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'analyst');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for spaces
CREATE POLICY "Users can view spaces they belong to"
  ON public.spaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_users
      WHERE space_users.space_id = spaces.id
      AND space_users.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins and analysts can create spaces"
  ON public.spaces FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Admins and analysts can update spaces"
  ON public.spaces FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Admins can delete spaces"
  ON public.spaces FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for space_users
CREATE POLICY "Users can view space assignments"
  ON public.space_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and analysts can manage space users"
  ON public.space_users FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analyst')
  );

-- RLS Policies for reports
CREATE POLICY "Users can view reports in their spaces"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.space_users
      WHERE space_users.space_id = reports.space_id
      AND space_users.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins and analysts can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Admins and analysts can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analyst')
  );

CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));