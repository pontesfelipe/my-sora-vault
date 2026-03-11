INSERT INTO public.change_control_log (created_by, title, description, category, status, is_breaking_change, version, author)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Add bulk regenerate images button to Collection page',
  'Added a "Regenerate All Images" button that re-generates all watch AI images using the existing stored image as a reference URL. This ensures the new standardized sizing (IWC Mark XX calibration) is applied while preserving watch identity. Shows progress counter during processing with 3s delay between calls to avoid rate limiting.',
  'feature',
  'deployed',
  false,
  '2.14.4',
  'Lovable AI'
);