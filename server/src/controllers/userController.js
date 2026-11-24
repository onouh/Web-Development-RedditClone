import { Comment } from '../models/Comment.js';
import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler, paginated, parsePagination } from '../utils/http.js';
import { serializeComment, serializeUser } from '../utils/serializers.js';
import { decoratePosts, postPopulate } from '../services/postService.js';
import { getPostIds } from '../services/savedService.js';

export const getProfile = asyncHandler(async (req, res) => {
  const username = req.params.username.toLowerCase();
  const user = await User.findOne({ username });
  if (!user) throw new ApiError(404, 'User not found');

  const [postCount, commentCount, moderated] = await Promise.all([
    Post.countDocuments({ authorId: user._id, isDeleted: false, isRemovedByMod: false }),
    Comment.countDocuments({ authorId: user._id, isDeleted: false, isRemovedByMod: false }),
    Community.find({ moderators: user._id }).select('name iconUrl memberCount'),
  ]);

  res.json({
    user: serializeUser(user),
    stats: { postCount, commentCount },
    moderated: moderated.map((community) => ({
      name: community.name,
      iconUrl: community.iconUrl,
      memberCount: community.memberCount,
    })),
  });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const username = req.params.username.toLowerCase();
  const user = await User.findOne({ username }).select('_id');
  if (!user) throw new ApiError(404, 'User not found');

  const { page, limit } = parsePagination(req.query);
  const match = { authorId: user._id, isDeleted: false, isRemovedByMod: false };
  const [posts, total] = await Promise.all([
    Post.find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(postPopulate),
    Post.countDocuments(match),
  ]);

  res.json(paginated(await decoratePosts(posts, req.user?.id), total, page, limit));
});

export const getUserComments = asyncHandler(async (req, res) => {
  const username = req.params.username.toLowerCase();
  const user = await User.findOne({ username }).select('_id');
  if (!user) throw new ApiError(404, 'User not found');

  const { page, limit } = parsePagination(req.query);
  const match = { authorId: user._id, isDeleted: false, isRemovedByMod: false };
  const [comments, total] = await Promise.all([
    Comment.find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('postId', 'title communityId')
      .populate('postId.communityId', 'name')
      .populate('authorId', 'username displayName avatarUrl postKarma commentKarma createdAt'),
    Comment.countDocuments(match),
  ]);

  res.json(
    paginated(
      comments.map((comment) => ({
        ...serializeComment(comment),
        post: comment.postId
          ? {
              id: String(comment.postId._id),
              title: comment.postId.title,
              community: comment.postId.communityId?.name || '',
            }
          : null,
      })),
      total,
      page,
      limit,
    ),
  );
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  res.json({ user: serializeUser(user) });
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const ids = await getPostIds(req.user._id);
  const pageIds = ids.slice((page - 1) * limit, page * limit);
  const posts = await Post.find({ _id: { $in: pageIds }, isDeleted: false }).populate(postPopulate);
  // Keep newest-saved first, matching the order stored on the user document.
  const byId = new Map(posts.map((post) => [String(post._id), post]));
  const ordered = pageIds.map((id) => byId.get(String(id))).filter(Boolean);
  res.json(paginated(await decoratePosts(ordered, req.user.id), ids.length, page, limit));
});
