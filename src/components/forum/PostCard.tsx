import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Trash2, ChevronDown, ChevronUp, Pencil, Pin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Post, FORUM_CATEGORIES } from "@/hooks/useForumData";
import { CommentSection } from "./CommentSection";
import { EditPostDialog } from "./EditPostDialog";
import { VoteButtons } from "./VoteButtons";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PostCardProps {
  post: Post;
  onVote: (postId: string, voteType: 1 | -1) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string, title: string, content: string, category: string) => Promise<boolean>;
  onTogglePin: (postId: string, isPinned: boolean) => void;
}

export function PostCard({ post, onVote, onDelete, onEdit, onTogglePin }: PostCardProps) {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Use username for display (privacy)
  const authorName = post.author?.username || 'Unknown';
  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isAdmin;
  const canEdit = isOwner;
  const canPin = isAdmin;

  const categoryLabel = FORUM_CATEGORIES.find(c => c.value === post.category)?.labelKey ? t(FORUM_CATEGORIES.find(c => c.value === post.category)!.labelKey) : post.category;

  return (
    <>
      <Card className={`overflow-hidden ${post.is_pinned ? 'ring-2 ring-accent/50 bg-accent/5' : ''}`}>
        <div className="flex">
          {/* Vote sidebar */}
          <div className="flex-shrink-0 bg-surfaceMuted/50 p-2 flex items-start justify-center">
            <VoteButtons
              score={post.vote_score}
              userVote={post.user_vote}
              onUpvote={() => onVote(post.id, 1)}
              onDownvote={() => onVote(post.id, -1)}
            />
          </div>
          
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    username={post.author?.username} 
                    avatarUrl={post.author?.avatar_url}
                    avatarColor={post.author?.avatar_color}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-textMain">{authorName}</p>
                      {post.is_pinned && (
                        <Badge variant="default" className="text-xs gap-1 bg-accent">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel}
                      </Badge>
                    </div>
                    <p className="text-xs text-textMuted">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canPin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${post.is_pinned ? 'text-accent' : 'text-textMuted hover:text-accent'}`}
                          onClick={() => onTogglePin(post.id, post.is_pinned)}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {post.is_pinned ? 'Unpin post' : 'Pin post'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-textMuted hover:text-textMain"
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-textMuted hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete post?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the post and all its comments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(post.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <h3 className="font-semibold text-lg text-textMain mb-2">{post.title}</h3>
              {post.content && (
                <p className="text-textSoft whitespace-pre-wrap">{post.content}</p>
              )}
              {post.image_url && (
                <div className="mt-3">
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="w-full max-h-96 object-cover rounded-lg"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-0">
              <div className="flex items-center gap-4 w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-textMuted"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                  {showComments ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showComments && (
                <div className="w-full border-t pt-3">
                  <CommentSection 
                    postId={post.id} 
                    postAuthor={post.author ? {
                      id: post.user_id,
                      username: post.author.username,
                      avatar_url: post.author.avatar_url,
                      avatar_color: post.author.avatar_color,
                    } : undefined}
                  />
                </div>
              )}
            </CardFooter>
          </div>
        </div>
      </Card>
      
      <EditPostDialog
        post={post}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={onEdit}
      />
    </>
  );
}
