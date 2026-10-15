-- ===== Reviews =====
CREATE TYPE public.review_target_type AS ENUM ('product', 'store');
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.review_target_type NOT NULL,
  target_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  status public.review_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Users insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own review" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own review" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_target_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_table text;
  target_type_value public.review_target_type;
  target_id_value uuid;
  target_avg numeric(2,1);
BEGIN
  target_type_value := COALESCE(NEW.target_type, OLD.target_type);
  target_id_value := COALESCE(NEW.target_id, OLD.target_id);
  target_table := CASE target_type_value WHEN 'product' THEN 'products' ELSE 'stores' END;

  SELECT AVG(r.rating)::numeric(2,1)
  INTO target_avg
  FROM public.reviews r
  WHERE r.target_type = target_type_value
    AND r.target_id = target_id_value
    AND r.status = 'approved';

  EXECUTE format(
    'UPDATE public.%I SET rating = COALESCE($1, 0) WHERE id = $2',
    target_table
  ) USING target_avg, target_id_value;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.create_review(_target_type public.review_target_type, _target_id uuid, _rating int, _comment text DEFAULT NULL)
RETURNS public.reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  review public.reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  INSERT INTO public.reviews (user_id, target_type, target_id, rating, comment)
  VALUES (auth.uid(), _target_type, _target_id, _rating, _comment)
  RETURNING * INTO review;

  RETURN review;
END $$;

CREATE TRIGGER reviews_update_target_rating
AFTER INSERT OR UPDATE OF rating, status OR DELETE
ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_target_rating();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating numeric(2,1) NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.product_has_reviews(_product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reviews WHERE target_type = 'product' AND target_id = _product_id AND status = 'approved');
$$;
