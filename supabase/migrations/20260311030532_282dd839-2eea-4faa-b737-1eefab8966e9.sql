-- Create missing profiles for users who signed up without trigger
INSERT INTO public.profiles (id, email, full_name, username)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  'User' || substr(u.id::text, 1, 6)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create missing user_roles for users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Create missing user_trust_levels
INSERT INTO public.user_trust_levels (user_id, trust_level)
SELECT u.id, 'observer'
FROM auth.users u
LEFT JOIN public.user_trust_levels utl ON utl.user_id = u.id
WHERE utl.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Recreate the trigger on auth.users for new signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();