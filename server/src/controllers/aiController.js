import { Post } from '../models/Post.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { summarizeThread } from '../services/aiService.js';

export const summarizePostThread = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId).select('title threadSummary commentCount');
  if (!post) throw new ApiError(404, 'Post not found');
  const digest = await summarizeThread(post);
  res.json({ digest });
});
