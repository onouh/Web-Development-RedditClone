import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { ApiError, asyncHandler, paginated, parsePagination } from '../utils/http.js';
import {
  decoratePosts,
  fetchPostPage,
  homeCommunityIds,
  postMatch,
  postPopulate,
} from '../services/postService.js';
import { toggleSaved } from '../services/savedService.js';
import { summarizePost } from '../services/aiService.js';

const assertCommunityAccess = async (name, userId) => {
  const community = await Community.findOne({ name: name.toLowerCase() });
  if (!community) throw new ApiError(404, 'Community not found');
  if (userId && community.bannedUsers.some((id) => String(id) === String(userId))) {
    throw new ApiError(403, 'You are banned from this community');
  }
  return community;
};

export const getFeed = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.validatedQuery ?? req.query);
  const sort = (req.validatedQuery ?? req.query).sort || 'new';
  const time = (req.validatedQuery ?? req.query).time || 'all';
  const scope = (req.validatedQuery ?? req.query).scope || 'home';

  const match = postMatch();
  if (scope === 'home' && req.user) {
    const communityIds = await homeCommunityIds(req.user._id);
    if (communityIds?.length) match.communityId = { $in: communityIds };
  }

  const { items, total } = await fetchPostPage({ match, sort, time, page, limit, userId: req.user?.id });
  res.json(paginated(await decoratePosts(items, req.user?.id), total, page, limit));
});

export const getCommunityPosts = asyncHandler(async (req, res) => {
  const community = await Community.findOne({ name: req.params.name.toLowerCase() });
  if (!community) throw new ApiError(404, 'Community not found');

  const { page, limit } = parsePagination(req.query);
  const sort = req.query.sort || 'new';
  const time = req.query.time || 'all';
  const flareLabel = req.query.flair || '';

  const { items, total } = await fetchPostPage({
    match: postMatch({ communityId: community._id }),
    sort,
    time,
    page,
    limit,
    userId: req.user?.id,
    flareLabel,
  });

  res.json(paginated(await decoratePosts(items, req.user?.id), total, page, limit));
});

export const createPost = asyncHandler(async (req, res) => {
  const community = await assertCommunityAccess(req.params.name, req.user._id);
  const { title, type, body, mediaUrl, linkUrl, flair } = req.body;

  if (type === 'link' && !linkUrl) throw new ApiError(400, 'Link posts require a URL');
  if (type === 'image' && !mediaUrl) throw new ApiError(400, 'Image posts require an image');
  if (type === 'text' && !body?.trim()) throw new ApiError(400, 'Text posts need a body');

  const post = await Post.create({
    title,
    type,
    body: body || '',
    mediaUrl: mediaUrl || '',
    linkUrl: linkUrl || '',
    flair: flair || { label: '', color: '#FF4500' },
    authorId: req.user._id,
    communityId: community._id,
  });

  await post.populate(postPopulate);
  res.status(201).json({ post: await decoratePosts(post, req.user.id) });
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).populate(postPopulate);
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ post: await decoratePosts(post, req.user?.id) });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, 'Post not found');
  if (String(post.authorId) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit your own posts');
  }

  const { title, body, mediaUrl, linkUrl, flair } = req.body;
  const contentChanged =
    (title !== undefined && title !== post.title) || (body !== undefined && body !== post.body);
  if (title !== undefined) post.title = title;
  if (body !== undefined) post.body = body;
  if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
  if (linkUrl !== undefined) post.linkUrl = linkUrl;
  if (flair !== undefined) post.flair = flair;
  post.isEdited = true;
  if (contentChanged) {
    // Content hash no longer matches, so drop cached AI output immediately.
    post.aiSummary = {};
    post.threadSummary = {};
  }
  await post.save();
  await post.populate(postPopulate);

  res.json({ post: await decoratePosts(post, req.user.id) });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).populate('communityId', 'moderators');
  if (!post) throw new ApiError(404, 'Post not found');

  const isAuthor = String(post.authorId) === String(req.user._id);
  const isMod = post.communityId?.moderators?.some((id) => String(id) === String(req.user._id));

  if (isAuthor) {
    post.isDeleted = true;
  } else if (isMod) {
    post.isRemovedByMod = true;
    post.removalReason = req.body?.reason || 'Removed by moderator';
    post.removedBy = req.user._id;
  } else {
    throw new ApiError(403, 'Not allowed to delete this post');
  }

  await post.save();
  res.json({ message: isAuthor ? 'Post deleted' : 'Post removed', deleted: true });
});

export const removePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).populate('communityId', 'moderators name');
  if (!post) throw new ApiError(404, 'Post not found');

  const isMod = post.communityId?.moderators?.some((id) => String(id) === String(req.user._id));
  if (!isMod) throw new ApiError(403, 'Only community moderators can remove posts');

  post.isRemovedByMod = true;
  post.removalReason = req.body.reason || 'Removed by moderator';
  post.removedBy = req.user._id;
  await post.save();

  res.json({ message: 'Post removed', removalReason: post.removalReason });
});

export const toggleSavePost = asyncHandler(async (req, res) => {
  const post = await Post.exists({ _id: req.params.postId });
  if (!post) throw new ApiError(404, 'Post not found');
  const saved = await toggleSaved(req.user._id, req.params.postId);
  res.json({ saved });
});

export const summarize = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, 'Post not found');
  const summary = await summarizePost(post);
  res.json({ summary });
});

export const getCommentCount = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('commentCount');
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ count: post.commentCount });
});

export const reportPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, 'Post not found');
  const { Report } = await import('../models/Report.js');
  try {
    await Report.create({
      reporterId: req.user._id,
      targetId: post._id,
      targetType: 'post',
      communityId: post.communityId,
      reason: req.body.reason,
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You already reported this post');
    throw error;
  }
  res.status(201).json({ message: 'Report submitted' });
});
