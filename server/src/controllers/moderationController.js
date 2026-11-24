import { Comment } from '../models/Comment.js';
import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { Report } from '../models/Report.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { serializeComment, serializePost } from '../utils/serializers.js';
import { postPopulate } from '../services/postService.js';
import { checkModeration } from '../services/aiService.js';

const requireModerator = async (name, userId) => {
  const community = await Community.findOne({ name: String(name).toLowerCase() });
  if (!community) throw new ApiError(404, 'Community not found');
  const isMod = community.moderators.some((id) => String(id) === String(userId));
  if (!isMod) throw new ApiError(403, 'Moderator access required');
  return community;
};

export const listReports = asyncHandler(async (req, res) => {
  const community = await requireModerator(req.params.name, req.user._id);
  const reports = await Report.find({ communityId: community._id, status: 'open' })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('reporterId', 'username displayName avatarUrl createdAt')
    .lean();

  const postIds = reports.filter((r) => r.targetType === 'post').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId);

  const [posts, comments] = await Promise.all([
    Post.find({ _id: { $in: postIds } }).populate(postPopulate),
    Comment.find({ _id: { $in: commentIds } }).populate(
      'authorId',
      'username displayName avatarUrl createdAt',
    ),
  ]);

  const postMap = new Map(posts.map((post) => [String(post._id), serializePost(post)]));
  const commentMap = new Map(
    comments.map((comment) => [String(comment._id), serializeComment(comment)]),
  );

  res.json({
    items: reports.map((report) => ({
      id: String(report._id),
      targetType: report.targetType,
      reason: report.reason,
      createdAt: report.createdAt,
      reporter: report.reporterId
        ? { username: report.reporterId.username, displayName: report.reporterId.displayName }
        : null,
      content:
        report.targetType === 'post'
          ? postMap.get(String(report.targetId)) || null
          : commentMap.get(String(report.targetId)) || null,
    })),
  });
});

export const resolveReport = asyncHandler(async (req, res) => {
  const community = await requireModerator(req.params.name, req.user._id);
  const report = await Report.findOne({ _id: req.params.reportId, communityId: community._id });
  if (!report) throw new ApiError(404, 'Report not found');

  report.status = req.body.status;
  report.resolvedBy = req.user._id;
  await report.save();
  res.json({ message: 'Report updated', status: report.status });
});

export const modCheck = asyncHandler(async (req, res) => {
  const community = await requireModerator(req.body.communityName, req.user._id);
  const result = await checkModeration({ community, content: req.body.content });
  res.json(result);
});
