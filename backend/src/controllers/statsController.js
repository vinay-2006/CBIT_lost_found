import { ItemService } from '../services/itemService.js';

export async function getStats(req, res, next) {
  try {
    const stats = await ItemService.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}
