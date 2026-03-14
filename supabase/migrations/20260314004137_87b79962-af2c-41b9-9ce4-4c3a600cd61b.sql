INSERT INTO public.change_control_log (title, description, category, status, version, author, created_by, is_breaking_change, affected_components)
SELECT 
  'Implement access logging for admin Logs tab',
  'Added automatic access logging throughout the app. Page views are logged from AppLayout, login/logout events from AuthContext. All logs are written to the access_logs table and visible in the admin Logs tab.',
  'improvement',
  'deployed',
  '2.15.3',
  'Lovable AI',
  id,
  false,
  ARRAY['AppLayout', 'AuthContext', 'AccessLogsTab', 'accessLogging utility']
FROM profiles WHERE email = 'pontes.felipe@gmail.com' LIMIT 1;