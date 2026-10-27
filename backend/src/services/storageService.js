import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dedicated uploads folder on disk (outside MongoDB database)
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class StorageService {
  /**
   * Get the absolute path to the uploads directory.
   */
  static getUploadsDir() {
    return UPLOADS_DIR;
  }

  /**
   * Upload an item image to dedicated disk storage.
   * Keeps large binary image files completely out of MongoDB.
   */
  static async uploadImage(file) {
    if (!file) {
      throw new AppError('No image file provided for upload.', 400);
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `item_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const destinationPath = path.join(UPLOADS_DIR, filename);

    try {
      await fs.promises.writeFile(destinationPath, file.buffer);

      // Relative public URL served by Express static middleware
      const publicUrl = `/uploads/${filename}`;

      return {
        url: publicUrl,
        filename,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (err) {
      throw new AppError(`Failed to save uploaded image: ${err.message}`, 500);
    }
  }

  /**
   * Helper to delete an image file from storage if an item is deleted.
   */
  static async deleteImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    const filename = path.basename(imageUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      // Non-critical cleanup error
    }
  }
}
