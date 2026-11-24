import { asyncHandler } from '../utils/http.js';
import { castVote } from '../services/voteService.js';

export const voteOnPost = asyncHandler(async (req, res) => {
  const result = await castVote({
    userId: req.user._id,
    targetId: req.params.postId,
    targetType: 'post',
    value: req.body.value,
  });
  res.json(result);
});

export const voteOnComment = asyncHandler(async (req, res) => {
  const result = await castVote({
    userId: req.user._id,
    targetId: req.params.commentId,
    targetType: 'comment',
    value: req.body.value,
  });
  res.json(result);
});
