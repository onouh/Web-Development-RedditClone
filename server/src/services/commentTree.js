import { serializeComment } from '../utils/serializers.js';

/**
 * Build a nested comment tree from a flat, createdAt-ascending list.
 * Materialised-path reads keep this to one query; tree assembly is O(n).
 */
export function buildCommentTree(comments, userVoteMap = new Map()) {
  const nodes = new Map();
  const roots = [];

  for (const comment of comments) {
    const node = {
      ...serializeComment(comment, { userVote: userVoteMap.get(String(comment._id)) || 0 }),
      replies: [],
    };
    nodes.set(node.id, node);
  }

  for (const comment of comments) {
    const node = nodes.get(String(comment._id));
    const parentId = comment.parentCommentId ? String(comment.parentCommentId) : null;
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  // Deleted leaf comments are hidden entirely; deleted parents stay as [deleted]
  // so replies keep their place in the thread.
  const prune = (list) =>
    list.filter((node) => {
      node.replies = prune(node.replies);
      return !(node.isDeleted && node.replies.length === 0);
    });

  return prune(roots);
}
