import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { serializeComment } from '../utils/serializers.js';
import { buildCommentTree } from '../services/commentTree.js';
import { getUserVoteMap } from '../services/voteService.js';
import { createNotification, notifyMentions } from '../services/notificationService.js';
import { Report } from '../models/Report.js';

const AUTHOR_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';

const canModerate = async (postId, userId) => {
  const post = await Post.findById(postId).select('communityId');
  if (!post) return false;
  const community = await Community.exists({ _id: post.communityId, moderators: userId });
  return Boolean(community);
};

export const listComments = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('_id commentCount');
  if (!post) throw new ApiError(404, 'Post not found');

  const comments = await Comment.find({ postId: post._id })
    .sort({ createdAt: 1 })
    .populate('authorId', AUTHOR_FIELDS);

  const votes = await getUserVoteMap(
    req.user?.id,
    'comment',
    comments.map((comment) => comment._id),
  );

  res.json({
    items: buildCommentTree(comments, votes),
    total: post.commentCount,
  });
});

export const createComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('authorId communityId title');
  if (!post) throw new ApiError(404, 'Post not found');
  if (post.isDeleted) throw new ApiError(400, 'Cannot comment on a deleted post');

  const community = await Community.findById(post.communityId).select('name moderators bannedUsers');
  if (community?.bannedUsers?.some((id) => String(id) === String(req.user._id))) {
    throw new ApiError(403, 'You are banned from this community');
  }

  let parent = null;
  if (req.body.parentCommentId) {
    parent = await Comment.findOne({ _id: req.body.parentCommentId, postId: post._id });
    if (!parent) throw new ApiError(404, 'Parent comment not found');
    if (parent.depth >= 25) throw new ApiError(400, 'Maximum reply depth reached');
  }

  const body = req.body.body.trim();
  if (!body) throw new ApiError(400, 'Comment cannot be empty');

  const session = await mongoose.startSession();
  let comment;
  try {
    await session.withTransaction(async () => {
      const docs = await Comment.create(
        [
          {
            postId: post._id,
            authorId: req.user._id,
            parentCommentId: parent?._id || null,
            ancestors: parent ? [...parent.ancestors, parent._id] : [],
            depth: parent ? parent.depth + 1 : 0,
            body,
          },
        ],
        { session },
      );
      comment = docs[0];
      await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }, { session });
    });
  } finally {
    await session.endSession();
  }

  await comment.populate('authorId', AUTHOR_FIELDS);
  const link = `/r/${community?.name || 'all'}/comments/${post._id}?comment=${comment._id}`;

  if (parent) {
    await createNotification({
      recipientId: parent.authorId,
      actorId: req.user._id,
      type: 'comment_reply',
      message: `${req.user.username} replied to your comment`,
      link,
      postId: post._id,
    });
  } else if (String(post.authorId) !== String(req.user._id)) {
    await createNotification({
      recipientId: post.authorId,
      actorId: req.user._id,
      type: 'post_reply',
      message: `${req.user.username} commented on your post`,
      link,
      postId: post._id,
    });
  }

  await notifyMentions({
    text: body,
    actorId: req.user._id,
    postId: post._id,
    link,
    messagePrefix: 'mentioned you in a comment',
  });

  res.status(201).json({
    comment: { ...serializeComment(comment), userVote: 0, replies: [] },
  });
});

export const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (String(comment.authorId) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own comments');
  }
  if (comment.isDeleted || comment.isRemovedByMod) {
    throw new ApiError(400, 'Cannot edit a deleted or removed comment');
  }

  comment.body = req.body.body;
  comment.isEdited = true;
  await comment.save();
  await comment.populate('authorId', AUTHOR_FIELDS);
  res.json({ comment: serializeComment(comment) });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');

  const isAuthor = String(comment.authorId) === String(req.user._id);
  const isMod = await canModerate(comment.postId, req.user._id);

  if (isAuthor) {
    comment.isDeleted = true;
  } else if (isMod) {
    comment.isRemovedByMod = true;
    comment.removalReason = req.body?.reason || 'Removed by moderator';
    comment.removedBy = req.user._id;
  } else {
    throw new ApiError(403, 'Not allowed to delete this comment');
  }

  await comment.save();
  res.json({ message: isAuthor ? 'Comment deleted' : 'Comment removed' });
});

export const removeComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (!(await canModerate(comment.postId, req.user._id))) {
    throw new ApiError(403, 'Only community moderators can remove comments');
  }

  comment.isRemovedByMod = true;
  comment.removalReason = req.body.reason || 'Removed by moderator';
  comment.removedBy = req.user._id;
  await comment.save();

  const post = await Post.findById(comment.postId)
    .select('title communityId')
    .populate('communityId', 'name');
  await createNotification({
    recipientId: comment.authorId,
    actorId: req.user._id,
    type: 'mod_action',
    message: 'A moderator removed your comment',
    link: post
      ? `/r/${post.communityId?.name || 'all'}/comments/${comment.postId}?comment=${comment._id}`
      : '/',
    postId: comment.postId,
  });

  res.json({ message: 'Comment removed', removalReason: comment.removalReason });
});

export const reportComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');
  const post = await Post.findById(comment.postId).select('communityId');
  try {
    await Report.create({
      reporterId: req.user._id,
      targetId: comment._id,
      targetType: 'comment',
      communityId: post.communityId,
      reason: req.body.reason,
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You already reported this comment');
    throw error;
  }
  res.status(201).json({ message: 'Report submitted' });
});
