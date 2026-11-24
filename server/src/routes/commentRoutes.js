import { Router } from 'express';
import {
  deleteComment,
  removeComment,
  reportComment,
  updateComment,
} from '../controllers/commentController.js';
import { voteOnComment } from '../controllers/voteController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportSchema, updateCommentSchema, voteSchema } from '../validators/schemas.js';

const router = Router();

router.patch('/:commentId', requireAuth, validate({ body: updateCommentSchema }), updateComment);
router.delete('/:commentId', requireAuth, deleteComment);
router.post('/:commentId/remove', requireAuth, removeComment);
router.put('/:commentId/vote', requireAuth, validate({ body: voteSchema }), voteOnComment);
router.post('/:commentId/report', requireAuth, validate({ body: reportSchema }), reportComment);

export default router;
