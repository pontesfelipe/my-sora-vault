
DROP FUNCTION IF EXISTS public.get_home_feed(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_home_feed(_user_id uuid, _filter text DEFAULT 'all'::text, _limit integer DEFAULT 10, _offset integer DEFAULT 0)
 RETURNS TABLE(feed_id text, feed_type text, title text, content text, image_url text, author_id uuid, author_username text, author_avatar_url text, like_count bigint, comment_count bigint, created_at timestamp with time zone, external_url text, author_trust_level text, watch_authenticated boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    NULL::text AS external_url,
    utl.trust_level::text AS author_trust_level,
    COALESCE(w.metadata_analyzed_at IS NOT NULL, false) AS watch_authenticated
  FROM user_posts up
  JOIN friendships fr ON fr.friend_id = up.user_id AND fr.user_id = _user_id
  JOIN profiles p ON p.id = up.user_id
  LEFT JOIN user_trust_levels utl ON utl.user_id = up.user_id
  LEFT JOIN watches w ON w.id = up.watch_id
  WHERE (_filter IN ('all', 'friends'))

  UNION ALL

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
    NULL::text AS external_url,
    utl.trust_level::text AS author_trust_level,
    COALESCE(w.metadata_analyzed_at IS NOT NULL, false) AS watch_authenticated
  FROM user_posts up
  JOIN profiles p ON p.id = up.user_id
  LEFT JOIN user_trust_levels utl ON utl.user_id = up.user_id
  LEFT JOIN watches w ON w.id = up.watch_id
  WHERE up.created_at >= now() - interval '7 days'
    AND (_filter IN ('all', 'trending'))
    AND up.user_id != _user_id

  UNION ALL

  SELECT
    'editorial_' || ec.id AS feed_id,
    ec.content_type AS feed_type,
    ec.title,
    ec.summary AS content,
    ec.image_url,
    ec.created_by AS author_id,
    'Editorial' AS author_username,
    NULL::text AS author_avatar_url,
    0::bigint AS like_count,
    0::bigint AS comment_count,
    ec.published_at AS created_at,
    ec.url AS external_url,
    NULL::text AS author_trust_level,
    false AS watch_authenticated
  FROM editorial_content ec
  WHERE (_filter IN ('all', 'news', 'articles', 'videos'))
    AND (_filter = 'all' OR ec.content_type = _filter)

  ORDER BY created_at DESC
  LIMIT _limit
  OFFSET _offset;
$function$;
