import type { PostComment } from '../data/mockData';

export type CommentNode = PostComment & {
  replies?: CommentNode[];
  likes?: number;
  likedBy?: string[];
  deleted?: boolean;
};

export function countVisibleComments(comments: CommentNode[] = []): number {
  return comments.reduce((total, comment) => {
    const childCount = countVisibleComments(comment.replies ?? []);
    const visibleSelf = !comment.deleted || childCount > 0;
    return total + (visibleSelf ? 1 : 0) + childCount;
  }, 0);
}

export function getPostCommentCount(post: { commentItems?: PostComment[]; comments?: number }) {
  return countVisibleComments((post.commentItems ?? []) as CommentNode[]);
}
