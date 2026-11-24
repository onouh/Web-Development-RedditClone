import { Router } from 'express';
import {
  getProfile,
  getSavedPosts,
  getUserComments,
  getUserPosts,
  updateMe,
} from '../controllers/userController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateMeSchema } from '../validators/schemas.js';

const router = Router();

// Static paths must come before /:username.
router.get('/me/saved', requireAuth, getSavedPosts);
router.patch('/me', requireAuth, validate({ body: updateMeSchema }), updateMe);

router.get('/:username', optionalAuth, getProfile);
router.get('/:username/posts', optionalAuth, getUserPosts);
router.get('/:username/comments', optionalAuth, getUserComments);

export default router;
