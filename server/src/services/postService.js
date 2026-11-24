import { Membership } from '../models/Membership.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';
import { getUserVoteMap } from './voteService.js';
import { serializePost } from '../utils/serializers.js';

export const AUTHOR_FIELDS = 'username displayName avatarUrl postKarma commentKarma createdAt';
export const COMMUNITY_FIELDS = 'name iconUrl description memberCount createdAt';

export const postPopulate = [
  { path: 'authorId', select: AUTHOR_FIELDS },
  { path: 'communityId', select: COMMUNITY_FIELDS },
];

const HOUR = 60 * 60 * 1000;

export function timeWindow(time) {
  const now = Date.now();
  switch (time) {
    case 'today':
      return new Date(now - 24 * HOUR);
    case 'week':
      return new Date(now - 7 * 24 * HOUR);
    case 'month':
      return new Date(now - 30 * 24 * HOUR);
    case 'year':
      return new Date(now - 365 * 24 * HOUR);
    default:
      return null;
  }
}

export function hotScore(post) {
  const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / HOUR);
  return (Math.max(post.score, 0) + 1) / Math.pow(ageHours + 2, 1.2);
}

/** Attach the caller's vote + saved state to a list or single post. */
export async function decoratePosts(posts, userId) {
  const list = Array.isArray(posts) ? posts : [posts];
  const ids = list.map((post) => post._id);
  const voteMap = await getUserVoteMap(userId, 'post', ids);

  let saved = new Set();
  if (userId) {
    const user = await User.findById(userId).select('savedPosts').lean();
    saved = new Set((user?.savedPosts || []).map(String));
  }

  const serialized = list.map((post) =>
    serializePost(post, {
      userVote: voteMap.get(String(post._id)) || 0,
      saved: saved.has(String(post._id)),
    }),
  );
  return Array.isArray(posts) ? serialized : serialized[0];
}

export function postMatch(extra = {}) {
  return { isDeleted: false, isRemovedByMod: false, ...extra };
}

export async function homeCommunityIds(userId) {
  if (!userId) return null;
  const memberships = await Membership.find({ userId }).select('communityId').lean();
  return memberships.map((membership) => membership.communityId);
}

/**
 * Paginated feed. `hot` needs an age-decayed ranking that MongoDB can't index,
 * so a bounded candidate window is scored in memory (fine at project scale).
 */
export async function fetchPostPage({
  match = {},
  sort = 'new',
  time = 'all',
  page = 1,
  limit = 10,
  userId,
  flareLabel,
}) {
  const filter = { ...match };
  const since = timeWindow(time);
  if (since && sort === 'top') filter.createdAt = { $gte: since };
  if (flareLabel) filter['flair.label'] = flareLabel;

  if (sort === 'hot') {
    const candidates = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(300, page * limit + 100))
      .populate(postPopulate);
    candidates.sort((a, b) => hotScore(b) - hotScore(a));
    const total = await Post.countDocuments(filter);
    const items = candidates.slice((page - 1) * limit, page * limit);
    return { items, total };
  }

  const sortSpec = sort === 'top' ? { score: -1, createdAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Post.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(postPopulate),
    Post.countDocuments(filter),
  ]);
  return { items, total };
}
