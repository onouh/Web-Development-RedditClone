import mongoose from 'mongoose';
import { Community } from '../models/Community.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { ApiError, asyncHandler, escapeRegex } from '../utils/http.js';
import { serializeCommunity, serializeUser } from '../utils/serializers.js';

const findCommunity = async (name) => {
  const community = await Community.findOne({ name: String(name).toLowerCase() }).populate(
    'moderators',
    'username displayName avatarUrl postKarma commentKarma createdAt',
  );
  if (!community) throw new ApiError(404, 'Community not found');
  return community;
};

const isModerator = (community, userId) =>
  Boolean(userId) && community.moderators.some((mod) => String(mod._id || mod) === String(userId));

export const createCommunity = asyncHandler(async (req, res) => {
  const { name, title, description, iconUrl, bannerUrl, rules, flairs } = req.body;

  const exists = await Community.exists({ name });
  if (exists) throw new ApiError(409, 'That community name is already taken');

  const session = await mongoose.startSession();
  let community;
  try {
    await session.withTransaction(async () => {
      const [created] = await Community.create(
        [
          {
            name,
            title: title || name,
            description: description || '',
            iconUrl: iconUrl || '',
            bannerUrl: bannerUrl || '',
            rules: rules || [],
            flairs: flairs || [],
            creatorId: req.user._id,
            moderators: [req.user._id],
            memberCount: 1,
          },
        ],
        { session },
      );
      community = created;
      await Membership.create([{ userId: req.user._id, communityId: created._id }], { session });
    });
  } finally {
    await session.endSession();
  }

  await community.populate('moderators', 'username displayName avatarUrl postKarma commentKarma createdAt');
  res.status(201).json({
    community: serializeCommunity(community, {
      isMember: true,
      isModerator: true,
      moderators: community.moderators.map(serializeUser),
    }),
  });
});

export const listCommunities = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const query = {};

  if (req.query.mine === 'true' && req.user) {
    const memberships = await Membership.find({ userId: req.user._id }).select('communityId').lean();
    query._id = { $in: memberships.map((membership) => membership.communityId) };
  }
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), 'i');
    query.$or = [{ name: regex }, { description: regex }];
  }

  const communities = await Community.find(query)
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(limit)
    .select('name title description iconUrl bannerUrl memberCount createdAt');

  res.json({ items: communities.map((community) => serializeCommunity(community)) });
});

export const getCommunity = asyncHandler(async (req, res) => {
  const community = await findCommunity(req.params.name);
  const [member, moderator] = await Promise.all([
    req.user ? Membership.exists({ userId: req.user._id, communityId: community._id }) : false,
    Promise.resolve(isModerator(community, req.user?.id)),
  ]);

  res.json({
    community: serializeCommunity(community, {
      isMember: Boolean(member),
      isModerator: Boolean(moderator),
      moderators: community.moderators.map(serializeUser),
      isBanned: req.user
        ? community.bannedUsers.some((id) => String(id) === String(req.user._id))
        : false,
    }),
  });
});

export const updateCommunity = asyncHandler(async (req, res) => {
  const community = await findCommunity(req.params.name);
  if (!isModerator(community, req.user._id)) {
    throw new ApiError(403, 'Only moderators can edit this community');
  }

  const { title, description, iconUrl, bannerUrl, rules, flairs } = req.body;
  if (title !== undefined) community.title = title;
  if (description !== undefined) community.description = description;
  if (iconUrl !== undefined) community.iconUrl = iconUrl;
  if (bannerUrl !== undefined) community.bannerUrl = bannerUrl;
  if (rules !== undefined) community.rules = rules;
  if (flairs !== undefined) community.flairs = flairs;
  await community.save();
  await community.populate('moderators', 'username displayName avatarUrl postKarma commentKarma createdAt');

  res.json({
    community: serializeCommunity(community, {
      isMember: true,
      isModerator: true,
      moderators: community.moderators.map(serializeUser),
    }),
  });
});

export const joinCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findOne({ name: req.params.name.toLowerCase() });
  if (!community) throw new ApiError(404, 'Community not found');
  if (community.bannedUsers.some((id) => String(id) === String(req.user._id))) {
    throw new ApiError(403, 'You are banned from this community');
  }

  const session = await mongoose.startSession();
  let memberCount = community.memberCount;
  try {
    await session.withTransaction(async () => {
      await Membership.create([{ userId: req.user._id, communityId: community._id }], { session });
      const updated = await Community.findOneAndUpdate(
        { _id: community._id },
        { $inc: { memberCount: 1 } },
        { new: true, session, projection: { memberCount: 1 } },
      );
      memberCount = updated.memberCount;
    });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'You are already a member');
    throw error;
  } finally {
    await session.endSession();
  }

  res.json({ isMember: true, memberCount });
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findOne({ name: req.params.name.toLowerCase() });
  if (!community) throw new ApiError(404, 'Community not found');

  const session = await mongoose.startSession();
  let memberCount = community.memberCount;
  try {
    await session.withTransaction(async () => {
      const removed = await Membership.deleteOne(
        { userId: req.user._id, communityId: community._id },
        { session },
      );
      if (removed.deletedCount === 0) throw new ApiError(400, 'You are not a member');
      const updated = await Community.findOneAndUpdate(
        { _id: community._id, memberCount: { $gt: 0 } },
        { $inc: { memberCount: -1 } },
        { new: true, session, projection: { memberCount: 1 } },
      );
      memberCount = updated?.memberCount ?? 0;
    });
  } finally {
    await session.endSession();
  }

  res.json({ isMember: false, memberCount });
});

export const banUser = asyncHandler(async (req, res) => {
  const community = await findCommunity(req.params.name);
  if (!isModerator(community, req.user._id)) throw new ApiError(403, 'Only moderators can ban users');

  const target = await User.findOne({ username: req.body.username.toLowerCase() });
  if (!target) throw new ApiError(404, 'User not found');
  if (isModerator(community, target._id)) throw new ApiError(400, 'Cannot ban a moderator');

  await Community.updateOne({ _id: community._id }, { $addToSet: { bannedUsers: target._id } });

  // Removing the membership keeps memberCount consistent with banned access.
  const removed = await Membership.deleteOne({ userId: target._id, communityId: community._id });
  if (removed.deletedCount) {
    await Community.updateOne(
      { _id: community._id, memberCount: { $gt: 0 } },
      { $inc: { memberCount: -1 } },
    );
  }

  res.json({ message: `${target.username} has been banned`, banned: true });
});

export const unbanUser = asyncHandler(async (req, res) => {
  const community = await findCommunity(req.params.name);
  if (!isModerator(community, req.user._id)) throw new ApiError(403, 'Only moderators can unban users');

  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) throw new ApiError(404, 'User not found');

  await Community.updateOne({ _id: community._id }, { $pull: { bannedUsers: target._id } });
  res.json({ message: `${target.username} has been unbanned`, banned: false });
});
