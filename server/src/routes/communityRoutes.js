import { Router } from 'express';
import {
  banUser,
  createCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  unbanUser,
  updateCommunity,
} from '../controllers/communityController.js';
import { createPost, getCommunityPosts } from '../controllers/postController.js';
import { listReports, resolveReport } from '../controllers/moderationController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  banSchema,
  createCommunitySchema,
  createPostSchema,
  resolveReportSchema,
  updateCommunitySchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/', optionalAuth, listCommunities);
router.post('/', requireAuth, validate({ body: createCommunitySchema }), createCommunity);

router.get('/:name', optionalAuth, getCommunity);
router.patch('/:name', requireAuth, validate({ body: updateCommunitySchema }), updateCommunity);

router.post('/:name/join', requireAuth, joinCommunity);
router.delete('/:name/leave', requireAuth, leaveCommunity);

router.get('/:name/posts', optionalAuth, getCommunityPosts);
router.post('/:name/posts', requireAuth, validate({ body: createPostSchema }), createPost);

router.post('/:name/bans', requireAuth, validate({ body: banSchema }), banUser);
router.delete('/:name/bans/:username', requireAuth, unbanUser);

router.get('/:name/reports', requireAuth, listReports);
router.patch('/:name/reports/:reportId', requireAuth, validate({ body: resolveReportSchema }), resolveReport);

export default router;
