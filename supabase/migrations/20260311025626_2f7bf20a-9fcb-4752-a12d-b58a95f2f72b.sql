INSERT INTO public.change_control_log (created_by, title, description, category, status, is_breaking_change, version, author)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Standardize AI watch image sizing with IWC Mark XX calibration',
  'Added pixel-based size calibration (580-620px case width in 1024x1024 output) anchored to IWC Pilot Mark XX 40mm as the universal size reference. All watches now render at identical visual size regardless of actual case diameter. Updated all prompt paths: system messages, composition rules, photo enhancement, and pure generation.',
  'enhancement',
  'deployed',
  false,
  '2.14.3',
  'Lovable AI'
);