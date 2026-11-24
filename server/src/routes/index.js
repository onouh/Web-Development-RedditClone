import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import communityRoutes from './communityRoutes.js';
import postRoutes from './postRoutes.js';
import commentRoutes from './commentRoutes.js';
import chatRoutes from './chatRoutes.js';
import miscRoutes from './miscRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/communities', communityRoutes);
router.use('/comments', commentRoutes);
router.use('/chat', chatRoutes);
router.use('/', postRoutes);
router.use('/', miscRoutes);

export default router;
