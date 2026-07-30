CREATE TABLE public.user_body_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_path TEXT,
  photo_hash TEXT,
  body_type TEXT,
  height_cm NUMERIC,
  recommended_size TEXT,
  fit_style TEXT,
  skin_tone TEXT,
  hair_color TEXT,
  face_shape TEXT,
  gender TEXT,
  landmarks JSONB NOT NULL DEFAULT '{}'::jsonb,
  proportions JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_body_profiles TO authenticated;
GRANT ALL ON public.user_body_profiles TO service_role;

ALTER TABLE public.user_body_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body profile"
  ON public.user_body_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body profile"
  ON public.user_body_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body profile"
  ON public.user_body_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body profile"
  ON public.user_body_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_body_profiles_updated_at
  BEFORE UPDATE ON public.user_body_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();