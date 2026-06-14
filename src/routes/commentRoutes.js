import { Router } from 'express';
import { remove } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.delete('/:id', verifyToken, remove);

export default router;