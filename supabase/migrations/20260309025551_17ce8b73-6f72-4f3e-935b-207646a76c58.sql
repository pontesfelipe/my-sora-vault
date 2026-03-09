
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS is_collection_public boolean NOT NULL DEFAULT false;
