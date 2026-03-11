
-- Update handle_new_user_signup to always grant 'user' role (no allowed_users check)
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_first_name TEXT;
  user_last_name TEXT;
  random_username TEXT;
  adjectives TEXT[] := ARRAY['Swift', 'Bold', 'Calm', 'Bright', 'Quick', 'Noble', 'Wise', 'Cool', 'Epic', 'Keen', 'Wild', 'True', 'Pure', 'Lucky', 'Happy'];
  nouns TEXT[] := ARRAY['Hawk', 'Wolf', 'Bear', 'Fox', 'Eagle', 'Tiger', 'Lion', 'Owl', 'Falcon', 'Raven', 'Phoenix', 'Dragon', 'Knight', 'Pilot', 'Sailor'];
BEGIN
  user_first_name := NEW.raw_user_meta_data->>'first_name';
  user_last_name := NEW.raw_user_meta_data->>'last_name';
  
  random_username := adjectives[1 + floor(random() * array_length(adjectives, 1))::int] 
                  || nouns[1 + floor(random() * array_length(nouns, 1))::int]
                  || lpad(floor(random() * 1000)::text, 3, '0');
  
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    CONCAT(COALESCE(user_first_name, ''), ' ', COALESCE(user_last_name, '')),
    random_username,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(profiles.username, EXCLUDED.username);

  -- Always grant user role on signup (no approval required)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Also backfill any existing users missing user role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'user'
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
