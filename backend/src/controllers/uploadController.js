import { StorageService } from '../services/storageService.js';

export async function uploadImage(req, res, next) {
  try {
    const result = await StorageService.uploadImage(req.file);
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}
