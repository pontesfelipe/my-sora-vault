
-- Create user_tags table (user-scoped tags, max 15 per user enforced in app)
CREATE TABLE public.user_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT 'default',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Create watch_tags junction table
CREATE TABLE public.watch_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid NOT NULL REFERENCES public.watches(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.user_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (watch_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_tags ENABLE ROW LEVEL SECURITY;

-- RLS for user_tags
CREATE POLICY "Users can view own tags" ON public.user_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.user_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.user_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.user_tags FOR DELETE USING (auth.uid() = user_id);

-- RLS for watch_tags
CREATE POLICY "Users can view own watch tags" ON public.watch_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_tags ut WHERE ut.id = watch_tags.tag_id AND ut.user_id = auth.uid()));
CREATE POLICY "Users can insert own watch tags" ON public.watch_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_tags ut WHERE ut.id = watch_tags.tag_id AND ut.user_id = auth.uid()));
CREATE POLICY "Users can delete own watch tags" ON public.watch_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_tags ut WHERE ut.id = watch_tags.tag_id AND ut.user_id = auth.uid()));

-- Add cleanup to user deletion function
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.watch_tags WHERE tag_id IN (SELECT id FROM public.user_tags WHERE user_id = OLD.id);
  DELETE FROM public.user_tags WHERE user_id = OLD.id;
  DELETE FROM public.trade_guidelines_acknowledgments WHERE user_id = OLD.id;
  DELETE FROM public.user_trust_levels WHERE user_id = OLD.id;
  DELETE FROM public.messages WHERE sender_id = OLD.id;
  DELETE FROM public.conversations WHERE user1_id = OLD.id OR user2_id = OLD.id;
  DELETE FROM public.friendships WHERE user_id = OLD.id OR friend_id = OLD.id;
  DELETE FROM public.friend_requests WHERE from_user_id = OLD.id OR to_user_id = OLD.id;
  DELETE FROM public.trade_match_notifications WHERE user_id = OLD.id OR trade_owner_id = OLD.id;
  DELETE FROM public.wear_entries WHERE user_id = OLD.id;
  DELETE FROM public.water_usage WHERE user_id = OLD.id;
  DELETE FROM public.watch_specs WHERE user_id = OLD.id;
  DELETE FROM public.watches WHERE user_id = OLD.id;
  DELETE FROM public.trips WHERE user_id = OLD.id;
  DELETE FROM public.events WHERE user_id = OLD.id;
  DELETE FROM public.wishlist WHERE user_id = OLD.id;
  DELETE FROM public.collection_insights WHERE user_id = OLD.id;
  DELETE FROM public.collection_gap_suggestions WHERE user_id = OLD.id;
  DELETE FROM public.user_preferences WHERE user_id = OLD.id;
  DELETE FROM public.ai_feature_usage WHERE user_id = OLD.id;
  DELETE FROM public.user_collections WHERE user_id = OLD.id;
  DELETE FROM public.collections WHERE created_by = OLD.id;
  DELETE FROM public.user_roles WHERE user_id = OLD.id;
  DELETE FROM public.profiles WHERE id = OLD.id;
  DELETE FROM public.allowed_users WHERE lower(email) = lower(OLD.email);
  RETURN OLD;
END;
$function$;
