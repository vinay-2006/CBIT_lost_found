import { ItemService } from '../services/itemService.js';

export async function getItems(req, res, next) {
  try {
    const result = await ItemService.getItems(req.query);

    // Support raw array format for 100% transparent frontend backward compatibility
    if (req.query.format === 'raw' || req.headers['x-response-format'] === 'raw') {
      return res.status(200).json(result.items);
    }

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyReports(req, res, next) {
  try {
    const result = await ItemService.getMyReports(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        total: result.total
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getItemById(req, res, next) {
  try {
    const item = await ItemService.getItemById(req.params.id);
    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
}

export async function createItem(req, res, next) {
  try {
    const newItem = await ItemService.createItem(req.body, req.user);
    res.status(201).json({
      success: true,
      message: 'Item report created successfully.',
      data: newItem
    });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const updated = await ItemService.updateItem(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Item report updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteItem(req, res, next) {
  try {
    const result = await ItemService.deleteItem(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id }
    });
  } catch (err) {
    next(err);
  }
}

export async function claimItem(req, res, next) {
  try {
    const updated = await ItemService.claimItem(req.params.id, req.user);
    res.status(200).json({
      success: true,
      message: 'Item claimed successfully. Status updated to Resolved.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
