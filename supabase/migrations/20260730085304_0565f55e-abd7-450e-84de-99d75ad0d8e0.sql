-- ============ user_generations ============
CREATE TABLE public.user_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('recommendation','tryon','body_analysis','wardrobe','ai_studio')),
  prompt TEXT,
  occasion TEXT,
  weather TEXT,
  style TEXT,
  body_type TEXT,
  recommended_size TEXT,
  outfit_name TEXT,
  product_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  confidence_score INTEGER,
  image_url TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending' CHECK (image_status IN ('pending','ready','failed','none')),
  result_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_generations TO authenticated;
GRANT ALL ON public.user_generations TO service_role;
ALTER TABLE public.user_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own generations" ON public.user_generations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_user_generations_user_created ON public.user_generations (user_id, created_at DESC);
CREATE INDEX idx_user_generations_type ON public.user_generations (user_id, generation_type);

-- ============ generation_images ============
CREATE TABLE public.generation_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES public.user_generations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'preview' CHECK (kind IN ('preview','tryon','outfit','wardrobe')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_images TO authenticated;
GRANT ALL ON public.generation_images TO service_role;
ALTER TABLE public.generation_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own generation images" ON public.generation_images FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_generation_images_gen ON public.generation_images (generation_id);

-- ============ saved_outfits ============
CREATE TABLE public.saved_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.user_generations(id) ON DELETE SET NULL,
  outfit_name TEXT NOT NULL,
  generation_type TEXT NOT NULL,
  image_url TEXT,
  image_status TEXT NOT NULL DEFAULT 'ready',
  confidence_score INTEGER,
  product_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_outfits TO authenticated;
GRANT ALL ON public.saved_outfits TO service_role;
ALTER TABLE public.saved_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved outfits" ON public.saved_outfits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_saved_outfits_user_created ON public.saved_outfits (user_id, created_at DESC);

-- ============ favorite_outfits ============
CREATE TABLE public.favorite_outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.user_generations(id) ON DELETE CASCADE,
  saved_outfit_id UUID REFERENCES public.saved_outfits(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_outfits TO authenticated;
GRANT ALL ON public.favorite_outfits TO service_role;
ALTER TABLE public.favorite_outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorite_outfits FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_favorite_outfits_gen ON public.favorite_outfits (user_id, generation_id) WHERE generation_id IS NOT NULL;
CREATE UNIQUE INDEX idx_favorite_outfits_saved ON public.favorite_outfits (user_id, saved_outfit_id) WHERE saved_outfit_id IS NOT NULL;

-- ============ user_statistics ============
CREATE TABLE public.user_statistics (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_generations INTEGER NOT NULL DEFAULT 0,
  saved_looks INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  average_confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_statistics TO authenticated;
GRANT ALL ON public.user_statistics TO service_role;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own statistics" ON public.user_statistics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own statistics" ON public.user_statistics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own statistics" ON public.user_statistics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_user_generations_updated BEFORE UPDATE ON public.user_generations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_generation_images_updated BEFORE UPDATE ON public.generation_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_saved_outfits_updated BEFORE UPDATE ON public.saved_outfits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_favorite_outfits_updated BEFORE UPDATE ON public.favorite_outfits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_statistics_updated BEFORE UPDATE ON public.user_statistics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ statistics recompute ============
CREATE OR REPLACE FUNCTION public.recompute_user_statistics(_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_statistics (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_statistics s SET
    total_generations = COALESCE(g.cnt, 0),
    average_confidence = COALESCE(g.avg_conf, 0),
    download_count = COALESCE(g.dl, 0),
    share_count = COALESCE(g.sh, 0),
    saved_looks = COALESCE(sv.cnt, 0),
    favorite_count = COALESCE(f.cnt, 0),
    updated_at = now()
  FROM (SELECT 1) AS _dummy
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt, avg(confidence_score) FILTER (WHERE confidence_score IS NOT NULL) AS avg_conf,
           COALESCE(sum(download_count),0) AS dl, COALESCE(sum(share_count),0) AS sh
    FROM public.user_generations WHERE user_id = _user_id
  ) g ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.saved_outfits WHERE user_id = _user_id
  ) sv ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.favorite_outfits WHERE user_id = _user_id
  ) f ON true
  WHERE s.user_id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_statistics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_user_statistics(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_stats_generations AFTER INSERT OR UPDATE OR DELETE ON public.user_generations FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_statistics();
CREATE TRIGGER trg_stats_saved AFTER INSERT OR UPDATE OR DELETE ON public.saved_outfits FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_statistics();
CREATE TRIGGER trg_stats_favorites AFTER INSERT OR UPDATE OR DELETE ON public.favorite_outfits FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_statistics();

-- ============ create stats row on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user_statistics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_statistics (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_statistics
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_statistics();

-- ============ realtime ============
ALTER TABLE public.user_generations REPLICA IDENTITY FULL;
ALTER TABLE public.generation_images REPLICA IDENTITY FULL;
ALTER TABLE public.saved_outfits REPLICA IDENTITY FULL;
ALTER TABLE public.favorite_outfits REPLICA IDENTITY FULL;
ALTER TABLE public.user_statistics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_outfits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorite_outfits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_statistics;