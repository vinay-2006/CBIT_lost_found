import { Router } from 'express';
import {
  getItems,
  getMyReports,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  claimItem
} from '../controllers/itemController.js';
import {
  validate,
  createItemSchema,
  updateItemSchema,
  idParamSchema,
  itemQuerySchema
} from '../middleware/validator.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/items - Retrieve reports with filtering, search & pagination
router.get('/', validate(itemQuerySchema, 'query'), getItems);

// GET /api/items/my-reports - Retrieve current authenticated student's reports
router.get('/my-reports', requireAuth, getMyReports);

// GET /api/items/:id - Retrieve specific report
router.get('/:id', validate(idParamSchema, 'params'), getItemById);

// POST /api/items - Create a lost or found report
router.post('/', optionalAuth, validate(createItemSchema, 'body'), createItem);

// POST /api/items/:id/claim & PATCH /api/items/:id/claim - Claim a found item (Student only)
router.post('/:id/claim', requireAuth, validate(idParamSchema, 'params'), claimItem);
router.patch('/:id/claim', requireAuth, validate(idParamSchema, 'params'), claimItem);

// PATCH /api/items/:id - Update permitted item fields or status
router.patch(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  validate(updateItemSchema, 'body'),
  updateItem
);

// DELETE /api/items/:id - Delete an item report
router.delete('/:id', optionalAuth, validate(idParamSchema, 'params'), deleteItem);

export default router;
