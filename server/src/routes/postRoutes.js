import { Router } from 'express';
import {
  deletePost,
  getFeed,
  getPost,
  removePost,
  reportPost,
  summarize,
  toggleSavePost,
  updatePost,
} from '../controllers/postController.js';
import { createComment, listComments } from '../controllers/commentController.js';
import { voteOnPost } from '../controllers/voteController.js';
import { summarizePostThread } from '../controllers/aiController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  createCommentSchema,
  feedQuerySchema,
  reportSchema,
  updatePostSchema,
  voteSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/feed', optionalAuth, validate({ query: feedQuerySchema }), getFeed);

router.get('/posts/:postId', optionalAuth, getPost);
router.patch('/posts/:postId', requireAuth, validate({ body: updatePostSchema }), updatePost);
router.delete('/posts/:postId', requireAuth, deletePost);
router.post('/posts/:postId/remove', requireAuth, removePost);
router.put('/posts/:postId/vote', requireAuth, validate({ body: voteSchema }), voteOnPost);
router.put('/posts/:postId/save', requireAuth, toggleSavePost);
router.post('/posts/:postId/report', requireAuth, validate({ body: reportSchema }), reportPost);

router.get('/posts/:postId/comments', optionalAuth, listComments);
router.post('/posts/:postId/comments', requireAuth, validate({ body: createCommentSchema }), createComment);

router.post('/posts/:postId/summarize', requireAuth, aiLimiter, summarize);
router.post('/posts/:postId/comments/summarize', requireAuth, aiLimiter, summarizePostThread);

export default router;
