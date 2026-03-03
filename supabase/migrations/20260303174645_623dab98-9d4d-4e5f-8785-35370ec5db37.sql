
-- Add complications array to store watch functions/features for better matching
ALTER TABLE public.watches ADD COLUMN complications text[] DEFAULT '{}';

-- Add case_shape for additional matching metadata
ALTER TABLE public.watches ADD COLUMN case_shape text;
