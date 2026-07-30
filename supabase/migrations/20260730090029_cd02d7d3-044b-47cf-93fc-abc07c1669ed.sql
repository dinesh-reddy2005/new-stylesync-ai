CREATE UNIQUE INDEX IF NOT EXISTS favorite_outfits_user_generation_uidx
  ON public.favorite_outfits (user_id, generation_id)
  WHERE generation_id IS NOT NULL;
ALTER TABLE public.favorite_outfits
  ADD CONSTRAINT favorite_outfits_user_generation_key UNIQUE (user_id, generation_id);