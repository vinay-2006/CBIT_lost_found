import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

// SVG ('image/svg+xml') is intentionally excluded to eliminate Stored XSS vectors.
// Matches frontend ReportItem.jsx: accept=".jpg,.jpeg,.png,.webp"
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type (${file.mimetype}). Only JPG, PNG, and WebP images are allowed. SVG uploads are prohibited for security.`,
        400
      ),
      false
    );
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter
});
