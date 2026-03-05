import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const FORUM_CATEGORY_KEYS = [
  "general", "watches", "collecting", "trading", "reviews", "news", "showcase",
] as const;

export const FORUM_CATEGORIES = FORUM_CATEGORY_KEYS.map((value) => ({
  value,
  labelKey: `feed.categories.${value}`,
}));

export type ForumCategory = typeof FORUM_CATEGORIES[number]["value"];

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    username: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
  };
  vote_score: number;
  comments_count: number;
  user_vote: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    username: string | null;
    avatar_url: string | null;
    avatar_color: string | null;
  };
  vote_score: number;
  user_vote: number;
}

interface UseForumDataOptions {
  searchQuery?: string;
  category?: string;
}

export function useForumData(options: UseForumDataOptions = {}) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery, category } = options;

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }
      
      const { data: postsData, error: postsError } = await query;
      
      if (postsError) throw postsError;

      // Fetch public profiles for authors (only non-sensitive data)
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, avatar_url, avatar_color')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch all post votes
      const { data: votesData } = await supabase
        .from('post_votes')
        .select('post_id, vote_type, user_id');
      
      const voteScores = new Map<string, number>();
      const userVotes = new Map<string, number>();
      
      votesData?.forEach(v => {
        voteScores.set(v.post_id, (voteScores.get(v.post_id) || 0) + v.vote_type);
        if (user && v.user_id === user.id) {
          userVotes.set(v.post_id, v.vote_type);
        }
      });

      // Fetch comments counts
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select('post_id');
      
      const commentsCount = new Map<string, number>();
      commentsData?.forEach(c => {
        commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1);
      });

      const enrichedPosts: Post[] = (postsData || []).map(post => ({
        ...post,
        category: post.category || 'general',
        is_pinned: post.is_pinned || false,
        author: profileMap.get(post.user_id),
        vote_score: voteScores.get(post.id) || 0,
        comments_count: commentsCount.get(post.id) || 0,
        user_vote: userVotes.get(post.id) || 0
      }));

      setPosts(enrichedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, category]);

  const createPost = async (title: string, content: string, category: string, imageFile?: File) => {
    if (!user) {
      toast.error("You must be logged in to create a post");
      return false;
    }

    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title,
          content,
          category,
          image_url: imageUrl
        });

      if (error) throw error;

      toast.success("Post created successfully");
      fetchPosts();
      return true;
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
      return false;
    }
  };

  const updatePost = async (postId: string, title: string, content: string, category: string) => {
    if (!user) {
      toast.error("You must be logged in to edit a post");
      return false;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ title, content, category })
        .eq('id', postId);

      if (error) throw error;

      toast.success("Post updated successfully");
      fetchPosts();
      return true;
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
      return false;
    }
  };

  const togglePinPost = async (postId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !isPinned })
        .eq('id', postId);

      if (error) throw error;

      toast.success(isPinned ? "Post unpinned" : "Post pinned");
      fetchPosts();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast.error("Failed to update post");
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success("Post deleted");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const votePost = async (postId: string, voteType: 1 | -1) => {
    if (!user) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.user_vote === voteType) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else if (post.user_vote !== 0) {
        await supabase
          .from('post_votes')
          .update({ vote_type: voteType })
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_votes')
          .insert({ post_id: postId, user_id: user.id, vote_type: voteType });
      }

      fetchPosts();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    createPost,
    updatePost,
    deletePost,
    togglePinPost,
    votePost,
    refetch: fetchPosts
  };
}

export function usePostComments(postId: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, avatar_url, avatar_color')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const commentIds = commentsData?.map(c => c.id) || [];
      const { data: votesData } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type, user_id')
        .in('comment_id', commentIds);

      const voteScores = new Map<string, number>();
      const userVotes = new Map<string, number>();
      
      votesData?.forEach(v => {
        voteScores.set(v.comment_id, (voteScores.get(v.comment_id) || 0) + v.vote_type);
        if (user && v.user_id === user.id) {
          userVotes.set(v.comment_id, v.vote_type);
        }
      });

      const enrichedComments: PostComment[] = (commentsData || []).map(comment => ({
        ...comment,
        author: profileMap.get(comment.user_id),
        vote_score: voteScores.get(comment.id) || 0,
        user_vote: userVotes.get(comment.id) || 0
      }));

      setComments(enrichedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  const addComment = async (content: string, parentCommentId?: string): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in to comment");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId || null
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success("Comment added");
      fetchComments();
      return data.id;
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      return null;
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!user) {
      toast.error("You must be logged in to edit a comment");
      return false;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content })
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Comment updated");
      fetchComments();
      return true;
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
      return false;
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success("Comment deleted");
      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const voteComment = async (commentId: string, voteType: 1 | -1) => {
    if (!user) {
      toast.error("You must be logged in to vote");
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.user_vote === voteType) {
        await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else if (comment.user_vote !== 0) {
        await supabase
          .from('comment_votes')
          .update({ vote_type: voteType })
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('comment_votes')
          .insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
      }

      fetchComments();
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    addComment,
    updateComment,
    deleteComment,
    voteComment,
    refetch: fetchComments
  };
}
