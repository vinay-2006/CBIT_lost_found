import { Router } from 'express';
import { uploadImage } from '../controllers/uploadController.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

// POST /api/upload - Upload an item image
router.post('/', uploadMiddleware.single('image'), uploadImage);

export default router;
