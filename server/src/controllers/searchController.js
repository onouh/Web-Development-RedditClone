import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { asyncHandler, escapeRegex, paginated, parsePagination } from '../utils/http.js';
import { decoratePosts, postPopulate } from '../services/postService.js';

const USER_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';
const COMMUNITY_FIELDS = 'name title description iconUrl bannerUrl memberCount createdAt';

export const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = req.query.type || 'all';
  const limit = Math.min(20, Number(req.query.limit) || 8);
  if (!q) return res.json({ communities: [], users: [], posts: [] });

  const regex = new RegExp(escapeRegex(q), 'i');
  const result = { communities: [], users: [], posts: [] };

  if (type === 'all' || type === 'communities') {
    const communities = await Community.find({ $or: [{ name: regex }, { title: regex }, { description: regex }] })
      .sort({ memberCount: -1 })
      .limit(limit)
      .select(COMMUNITY_FIELDS);
    result.communities = communities.map((community) => ({
      id: String(community._id),
      name: community.name,
      title: community.title,
      description: community.description,
      iconUrl: community.iconUrl,
      memberCount: community.memberCount,
    }));
  }

  if (type === 'all' || type === 'users') {
    const users = await User.find({ $or: [{ username: regex }, { displayName: regex }] })
      .limit(limit)
      .select(USER_FIELDS);
    result.users = users.map((user) => ({
      id: String(user._id),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      karma: (user.postKarma || 0) + (user.commentKarma || 0),
    }));
  }

  if (type === 'all' || type === 'posts') {
    const posts = await Post.find({
      isDeleted: false,
      isRemovedByMod: false,
      $or: [{ title: regex }, { body: regex }],
    })
      .sort({ score: -1, createdAt: -1 })
      .limit(limit)
      .populate(postPopulate);
    result.posts = await decoratePosts(posts, req.user?.id);
  }

  res.json(result);
});

/** Compact typeahead payload for the navbar search dropdown. */
export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ communities: [], users: [] });
  const regex = new RegExp(`^${escapeRegex(q)}`, 'i');

  const [communities, users] = await Promise.all([
    Community.find({ name: regex }).sort({ memberCount: -1 }).limit(5).select('name iconUrl memberCount'),
    User.find({ $or: [{ username: regex }, { displayName: regex }] }).limit(5).select(USER_FIELDS),
  ]);

  res.json({
    communities: communities.map((community) => ({
      name: community.name,
      iconUrl: community.iconUrl,
      memberCount: community.memberCount,
    })),
    users: users.map((user) => ({
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      karma: (user.postKarma || 0) + (user.commentKarma || 0),
    })),
  });
});

export const searchPosts = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const { page, limit } = parsePagination(req.query);
  const regex = new RegExp(escapeRegex(q), 'i');
  const match = {
    isDeleted: false,
    isRemovedByMod: false,
    ...(q ? { $or: [{ title: regex }, { body: regex }] } : {}),
  };

  const [posts, total] = await Promise.all([
    Post.find(match)
      .sort({ score: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(postPopulate),
    Post.countDocuments(match),
  ]);

  res.json(paginated(await decoratePosts(posts, req.user?.id), total, page, limit));
});
