
CREATE TABLE public.watch_id_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rejected_brand text NOT NULL,
  rejected_model text NOT NULL,
  image_context text, -- optional: what image led to this rejection
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_id_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own rejections"
  ON public.watch_id_rejections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own rejections"
  ON public.watch_id_rejections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rejections"
  ON public.watch_id_rejections FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_watch_id_rejections_user ON public.watch_id_rejections(user_id);
