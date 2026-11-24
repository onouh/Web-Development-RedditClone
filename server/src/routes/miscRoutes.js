import { Router } from 'express';
import { suggest, search, searchPosts } from '../controllers/searchController.js';
import { listNotifications, markAllRead, markNotificationRead } from '../controllers/notificationController.js';
import { modCheck } from '../controllers/moderationController.js';
import { handleUpload, uploadImage } from '../middleware/upload.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { modCheckSchema, searchQuerySchema } from '../validators/schemas.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/search', optionalAuth, validate({ query: searchQuerySchema }), search);
router.get('/search/suggest', optionalAuth, suggest);
router.get('/search/posts', optionalAuth, validate({ query: searchQuerySchema }), searchPosts);

router.get('/notifications', requireAuth, listNotifications);
router.post('/notifications/read-all', requireAuth, markAllRead);
router.patch('/notifications/:notificationId/read', requireAuth, markNotificationRead);

router.post('/ai/mod-check', requireAuth, aiLimiter, validate({ body: modCheckSchema }), modCheck);

router.post('/uploads', requireAuth, uploadImage, asyncHandler(async (req, res) => handleUpload(req, res)));

export default router;
