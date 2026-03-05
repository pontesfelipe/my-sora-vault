
-- 1. editorial_content table
CREATE TABLE public.editorial_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  url text,
  image_url text,
  content_type text NOT NULL DEFAULT 'news',
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view editorial content"
  ON public.editorial_content FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert editorial content"
  ON public.editorial_content FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update editorial content"
  ON public.editorial_content FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete editorial content"
  ON public.editorial_content FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Platform most worn this week (aggregated, anonymous)
CREATE OR REPLACE FUNCTION public.get_platform_most_worn_this_week()
RETURNS TABLE(brand text, model text, ai_image_url text, wear_count bigint, user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.brand,
    w.model,
    w.ai_image_url,
    COUNT(we.id) AS wear_count,
    COUNT(DISTINCT we.user_id) AS user_count
  FROM wear_entries we
  JOIN watches w ON w.id = we.watch_id
  WHERE we.wear_date >= date_trunc('week', CURRENT_DATE)
    AND we.wear_date <= CURRENT_DATE
  GROUP BY w.brand, w.model, w.ai_image_url
  ORDER BY wear_count DESC
  LIMIT 20;
$$;

-- 3. Friends most worn this week
CREATE OR REPLACE FUNCTION public.get_friends_most_worn_this_week(_user_id uuid)
RETURNS TABLE(brand text, model text, ai_image_url text, wear_count bigint, user_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.brand,
    w.model,
    w.ai_image_url,
    COUNT(we.id) AS wear_count,
    COUNT(DISTINCT we.user_id) AS user_count
  FROM wear_entries we
  JOIN watches w ON w.id = we.watch_id
  JOIN friendships f ON f.friend_id = we.user_id AND f.user_id = _user_id
  WHERE we.wear_date >= date_trunc('week', CURRENT_DATE)
    AND we.wear_date <= CURRENT_DATE
  GROUP BY w.brand, w.model, w.ai_image_url
  ORDER BY wear_count DESC
  LIMIT 20;
$$;

-- 4. Home feed function
CREATE OR REPLACE FUNCTION public.get_home_feed(
  _user_id uuid,
  _filter text DEFAULT 'all',
  _limit int DEFAULT 10,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  feed_id text,
  feed_type text,
  title text,
  content text,
  image_url text,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  like_count bigint,
  comment_count bigint,
  created_at timestamptz,
  external_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Friends' posts
  SELECT
    'post_' || up.id AS feed_id,
    'friends' AS feed_type,
    COALESCE(LEFT(up.content, 80), 'Shared a post') AS title,
    up.content,
    up.image_url,
    up.user_id AS author_id,
    p.username AS author_username,
    p.avatar_url AS author_avatar_url,
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = up.id) AS like_count,
    (SELECT COUNT(*) FROM user_post_comments upc WHERE upc.post_id = up.id) AS comment_count,
    up.created_at,
    NULL AS external_url
  FROM user_posts up
  JOIN friendships fr ON fr.friend_id = up.user_id AND fr.user_id = _user_id
  JOIN profiles p ON p.id = up.user_id
  WHERE (_filter IN ('all', 'friends'))

  UNION ALL

  -- Trending posts (most liked in last 7 days)
  SELECT
    'trending_' || up.id AS feed_id,
    'trending' AS feed_type,
    COALESCE(LEFT(up.content, 80), 'Trending post') AS title,
    up.content,
    up.image_url,
    up.user_id AS author_id,
    p.username AS author_username,
    p.avatar_url AS author_avatar_url,
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = up.id) AS like_count,
    (SELECT COUNT(*) FROM user_post_comments upc WHERE upc.post_id = up.id) AS comment_count,
    up.created_at,
    NULL AS external_url
  FROM user_posts up
  JOIN profiles p ON p.id = up.user_id
  WHERE up.created_at >= now() - interval '7 days'
    AND (_filter IN ('all', 'trending'))
    AND up.user_id != _user_id

  UNION ALL

  -- Editorial content
  SELECT
    'editorial_' || ec.id AS feed_id,
    ec.content_type AS feed_type,
    ec.title,
    ec.summary AS content,
    ec.image_url,
    ec.created_by AS author_id,
    'Editorial' AS author_username,
    NULL AS author_avatar_url,
    0 AS like_count,
    0 AS comment_count,
    ec.published_at AS created_at,
    ec.url AS external_url
  FROM editorial_content ec
  WHERE (_filter IN ('all', 'news', 'articles', 'videos'))
    AND (_filter = 'all' OR ec.content_type = _filter)

  ORDER BY created_at DESC
  LIMIT _limit
  OFFSET _offset;
$$;
