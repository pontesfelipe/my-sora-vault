
-- Create change_control_log table
CREATE TABLE public.change_control_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'feature',
  version text,
  author text,
  status text NOT NULL DEFAULT 'done',
  affected_components text[] DEFAULT '{}',
  is_breaking_change boolean NOT NULL DEFAULT false,
  rollback_notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.change_control_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can manage change log"
ON public.change_control_log
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_change_control_log_updated_at
BEFORE UPDATE ON public.change_control_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
