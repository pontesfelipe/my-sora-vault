
INSERT INTO public.change_control_log (created_by, title, description, category, status, is_breaking_change, version, author)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Remove approval workflow - open registration',
  'Removed the allowed_users gating and registration request approval flow. Any user who signs up (email, Google, Apple) now automatically gets the user role. Removed Requests and Allowed tabs from admin. Removed Request Access tab from auth page.',
  'feature',
  'deployed',
  true,
  '2.15.0',
  'Lovable AI'
);
