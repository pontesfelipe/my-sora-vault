INSERT INTO public.change_control_log (created_by, title, description, category, status, is_breaking_change, version, author)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Standardize dial colors to simple names',
  'Updated all existing watch dial colors from verbose descriptions to simple standardized names (e.g., Blue, Green, Gray). Replaced free-text dial color input with a dropdown select in Add Watch, Edit Watch, and Add Wishlist dialogs. Updated AI edge functions (search-watch-info, identify-watch-from-photo) to return only standardized color names.',
  'improvement',
  'deployed',
  false,
  '2.15.1',
  'Lovable AI'
);