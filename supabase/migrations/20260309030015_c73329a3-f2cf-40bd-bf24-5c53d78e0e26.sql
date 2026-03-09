
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS canvas_widgets jsonb NOT NULL DEFAULT '{"collection_stats": true, "usage_trends": true, "usage_chart": true, "depreciation": true}'::jsonb;
