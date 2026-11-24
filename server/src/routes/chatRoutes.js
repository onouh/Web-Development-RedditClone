import { Router } from 'express';
import {
  createConversation,
  getMessages,
  listConversations,
  postMessage,
  readConversation,
} from '../controllers/chatController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createConversationSchema, messageSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', listConversations);
router.post('/', validate({ body: createConversationSchema }), createConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', validate({ body: messageSchema }), postMessage);
router.post('/:id/read', readConversation);

export default router;
