
-- Trust level enum
CREATE TYPE public.trust_level AS ENUM ('observer', 'collector', 'verified_collector', 'trusted_trader');

-- User trust levels table
CREATE TABLE public.user_trust_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  trust_level public.trust_level NOT NULL DEFAULT 'observer',
  assigned_by UUID, -- NULL = auto-assigned, non-null = admin override
  reason TEXT,
  completed_trades INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_trust_levels ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view trust levels (public trust signals)
CREATE POLICY "Anyone can view trust levels"
  ON public.user_trust_levels FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update trust levels
CREATE POLICY "Admins can manage trust levels"
  ON public.user_trust_levels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own (redundant with above but explicit)
CREATE POLICY "Users can view own trust level"
  ON public.user_trust_levels FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-create trust level entry for new users
CREATE OR REPLACE FUNCTION public.create_default_trust_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_trust_levels (user_id, trust_level)
  VALUES (NEW.id, 'observer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_trust_level
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_trust_level();

-- Trade guidelines acknowledgment tracking
CREATE TABLE public.trade_guidelines_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL DEFAULT '1.0'
);

ALTER TABLE public.trade_guidelines_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acknowledgments"
  ON public.trade_guidelines_acknowledgments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own acknowledgments"
  ON public.trade_guidelines_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Timestamp trigger for trust levels
CREATE TRIGGER update_user_trust_levels_updated_at
  BEFORE UPDATE ON public.user_trust_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add to user deletion cleanup
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;
