INSERT INTO public.change_control_log (created_by, title, description, category, status, is_breaking_change, version, author)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Fix missing profiles for Apple/new OAuth users',
  'The on_auth_user_created trigger was missing from auth.users, causing new signups (especially Apple OAuth) to not get profiles, roles, or trust levels created. Backfilled missing profiles, user_roles, and trust_levels for existing users. Recreated the trigger to prevent future occurrences.',
  'bugfix',
  'deployed',
  false,
  '2.14.5',
  'Lovable AI'
);