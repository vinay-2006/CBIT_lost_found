import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Item } from '../models/Item.js';
import { isDatabaseConnected } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { StorageService } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load seed items for fallback mode or seeding
export function loadSeedData() {
  try {
    const seedPath = path.resolve(__dirname, '../../../public/data/items.json');
    if (fs.existsSync(seedPath)) {
      const content = fs.readFileSync(seedPath, 'utf8');
      const items = JSON.parse(content);
      return items.map((item) => ({
        ...item,
        rollNo: item.rollNo || '',
        image: item.image || '',
        status: item.status || 'active',
        userId: null,
        claimedBy: item.claimedBy || null,
        createdAt: new Date(item.date).toISOString(),
        updatedAt: new Date(item.date).toISOString()
      }));
    }
  } catch (err) {
    // Return empty if not found
  }
  return [];
}

// In-memory fallback dataset for development/testing when MongoDB is not connected
let memoryStore = loadSeedData();
let nextMemoryId = memoryStore.length > 0 ? Math.max(...memoryStore.map((i) => i.id)) + 1 : 1;

/**
 * Asserts fallback is allowed (forbidden in production).
 */
function assertFallbackAllowed() {
  if (env.NODE_ENV === 'production' && !isDatabaseConnected()) {
    throw new AppError(
      'MongoDB database is not connected in production environment. In-memory fallback is disabled in production.',
      503
    );
  }
}

export class ItemService {
  /**
   * Reset in-memory store (used for isolated unit tests).
   */
  static resetMemoryStore() {
    memoryStore = loadSeedData();
    nextMemoryId = memoryStore.length > 0 ? Math.max(...memoryStore.map((i) => i.id)) + 1 : 1;
  }

  /**
   * Retrieve reports with search, filtering, sorting, and pagination.
   */
  static async getItems(query = {}) {
    const {
      type,
      category,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      order = 'desc'
    } = query;

    // Use MongoDB when connected
    if (isDatabaseConnected()) {
      const filter = {};

      if (type) {
        filter.type = type;
      }
      if (category && category !== 'All') {
        filter.category = category;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search && search.trim().length > 0) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        filter.$or = [
          { itemName: regex },
          { description: regex },
          { location: regex }
        ];
      }

      // Map sortBy
      const sortColumnMap = {
        date: 'date',
        createdAt: 'createdAt',
        created_at: 'createdAt',
        itemName: 'itemName',
        item_name: 'itemName',
        id: 'id'
      };
      const sortField = sortColumnMap[sortBy] || 'date';
      const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
      const sortObj = { [sortField]: sortDirection };

      const offset = (page - 1) * limit;
      const [items, total] = await Promise.all([
        Item.find(filter)
          .sort(sortObj)
          .skip(offset)
          .limit(limit)
          .lean(),
        Item.countDocuments(filter)
      ]);

      return {
        items: items.map((doc) => {
          const { _id, __v, ...rest } = doc;
          return rest;
        }),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }

    assertFallbackAllowed();

    // Fallback: In-memory store
    let filtered = [...memoryStore];

    if (type) {
      filtered = filtered.filter((i) => i.type === type);
    }
    if (category && category !== 'All') {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (status && status !== 'all') {
      filtered = filtered.filter((i) => i.status === status);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.itemName && i.itemName.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.location && i.location.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => {
      let valA = a[sortBy] !== undefined ? a[sortBy] : a.date;
      let valB = b[sortBy] !== undefined ? b[sortBy] : b.date;
      if (typeof valA === 'string') {
        return order.toLowerCase() === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return order.toLowerCase() === 'asc' ? valA - valB : valB - valA;
    });

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Retrieve reports submitted by a specific student.
   */
  static async getMyReports(userId, query = {}) {
    if (!userId) {
      throw new AppError('Authentication required to view your reports.', 401);
    }

    const { type, status } = query;

    if (isDatabaseConnected()) {
      const filter = {
        $or: [{ userId: String(userId) }, { 'claimedBy.userId': String(userId) }]
      };
      if (type && type !== 'all') {
        filter.type = type;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      const docs = await Item.find(filter).sort({ createdAt: -1, date: -1 }).lean();
      const items = docs.map((doc) => {
        const { _id, __v, ...rest } = doc;
        return rest;
      });
      return { items, total: items.length };
    }

    assertFallbackAllowed();

    let userItems = memoryStore.filter(
      (i) =>
        (i.userId && String(i.userId) === String(userId)) ||
        (i.claimedBy && String(i.claimedBy.userId) === String(userId))
    );
    if (type && type !== 'all') {
      userItems = userItems.filter((i) => i.type === type);
    }
    if (status && status !== 'all') {
      userItems = userItems.filter((i) => i.status === status);
    }

    return {
      items: userItems,
      total: userItems.length
    };
  }

  /**
   * Retrieve a specific item by ID.
   */
  static async getItemById(id) {
    const numericId = parseInt(id, 10);

    if (isDatabaseConnected()) {
      const doc = await Item.findOne({ id: numericId }).lean();
      if (!doc) {
        throw new AppError(`Item with ID ${id} not found.`, 404);
      }
      const { _id, __v, ...rest } = doc;
      return rest;
    }

    assertFallbackAllowed();

    const item = memoryStore.find((i) => i.id === numericId);
    if (!item) {
      throw new AppError(`Item with ID ${id} not found.`, 404);
    }
    return item;
  }

  /**
   * Create a new item report.
   */
  static async createItem(itemData, user = null) {
    const userId = user ? user.id : null;

    if (isDatabaseConnected()) {
      // Find highest id to generate monotonic numeric identifier
      const lastItem = await Item.findOne().sort({ id: -1 }).select('id').lean();
      const newId = lastItem && typeof lastItem.id === 'number' ? lastItem.id + 1 : 1;

      const created = await Item.create({
        ...itemData,
        id: newId,
        userId
      });

      return created.toJSON();
    }

    assertFallbackAllowed();

    const newItem = {
      id: nextMemoryId++,
      type: itemData.type,
      itemName: itemData.itemName,
      category: itemData.category,
      description: itemData.description,
      location: itemData.location,
      date: itemData.date,
      reportedBy: itemData.reportedBy,
      rollNo: itemData.rollNo || '',
      contact: itemData.contact,
      email: itemData.email,
      image: itemData.image || '',
      status: itemData.status || 'active',
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStore.unshift(newItem);
    return newItem;
  }

  /**
   * Update permitted item fields or status.
   */
  static async updateItem(id, updates, user = null) {
    const numericId = parseInt(id, 10);
    const existing = await this.getItemById(numericId);

    // 1. Authorization check
    if (existing.userId) {
      if (!user) {
        throw new AppError('Authentication required to modify this report.', 401);
      }
      if (user.id !== existing.userId && user.role !== 'admin') {
        throw new AppError('Unauthorized: You can only update your own reports.', 403);
      }
    } else {
      // Guest-created report (created without an authenticated user account)
      // Note: Contact/email matching is a lightweight attribution check, NOT cryptographic
      // authentication. Status resolution ('resolved') is open to campus members to mark found items.
      // Modifying report core content requires administrator privileges or matching reporter contact.
      const isAdmin = user && user.role === 'admin';
      if (!isAdmin) {
        const updateKeys = Object.keys(updates);
        const isStatusOnly = updateKeys.length === 1 && updateKeys[0] === 'status';
        const hasVerification =
          (updates.contact && updates.contact === existing.contact) ||
          (updates.email && updates.email.toLowerCase() === existing.email.toLowerCase());

        if (!isStatusOnly && !hasVerification) {
          throw new AppError(
            'Unauthorized: Guest reports can only be modified by an administrator or by matching the reporter contact/email.',
            403
          );
        }
      }
    }

    if (isDatabaseConnected()) {
      const updatedDoc = await Item.findOneAndUpdate(
        { id: numericId },
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedDoc) {
        throw new AppError(`Item with ID ${id} not found.`, 404);
      }

      const { _id, __v, ...rest } = updatedDoc;
      return rest;
    }

    assertFallbackAllowed();

    const itemIndex = memoryStore.findIndex((i) => i.id === numericId);
    if (itemIndex === -1) {
      throw new AppError(`Item with ID ${id} not found.`, 404);
    }

    const updated = {
      ...memoryStore[itemIndex],
      ...updates,
      id: numericId,
      updatedAt: new Date().toISOString()
    };

    memoryStore[itemIndex] = updated;
    return updated;
  }

  /**
   * Claim a found item by an authenticated student.
   * Atomically marks status as 'resolved' and records claimant identity.
   */
  static async claimItem(id, user) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new AppError('Invalid item ID format.', 400);
    }
    if (!user || !user.id) {
      throw new AppError('Authentication required to claim an item.', 401);
    }

    const claimedBy = {
      userId: String(user.id),
      name: user.name || 'CBIT Student',
      rollNo: user.rollNo || '',
      email: user.email || '',
      claimedAt: new Date().toISOString()
    };

    if (isDatabaseConnected()) {
      const existing = await Item.findOne({ id: numericId }).lean();
      if (!existing) {
        throw new AppError(`Item with ID ${id} not found.`, 404);
      }
      if (existing.status === 'resolved') {
        throw new AppError('This item has already been marked as resolved or claimed.', 400);
      }
      if (existing.type !== 'found') {
        throw new AppError('Only items listed as found can be claimed by students.', 400);
      }

      // Atomic update conditional on status being not resolved
      const updatedDoc = await Item.findOneAndUpdate(
        { id: numericId, status: { $ne: 'resolved' } },
        {
          $set: {
            status: 'resolved',
            claimedBy: {
              ...claimedBy,
              claimedAt: new Date()
            }
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedDoc) {
        throw new AppError('This item has already been marked as resolved or claimed.', 400);
      }

      const { _id, __v, ...rest } = updatedDoc;
      return rest;
    }

    assertFallbackAllowed();

    const itemIndex = memoryStore.findIndex((i) => i.id === numericId);
    if (itemIndex === -1) {
      throw new AppError(`Item with ID ${id} not found.`, 404);
    }

    const existing = memoryStore[itemIndex];
    if (existing.status === 'resolved') {
      throw new AppError('This item has already been marked as resolved or claimed.', 400);
    }
    if (existing.type !== 'found') {
      throw new AppError('Only items listed as found can be claimed by students.', 400);
    }

    const updated = {
      ...existing,
      status: 'resolved',
      claimedBy,
      updatedAt: new Date().toISOString()
    };

    memoryStore[itemIndex] = updated;
    return updated;
  }

  /**
   * Delete an item.
   */
  static async deleteItem(id, user = null) {
    const numericId = parseInt(id, 10);
    const existing = await this.getItemById(numericId);

    // Authorization check
    if (existing.userId) {
      if (!user) {
        throw new AppError('Authentication required to delete this report.', 401);
      }
      if (user.id !== existing.userId && user.role !== 'admin') {
        throw new AppError('Unauthorized: You can only delete your own reports.', 403);
      }
    } else {
      if (!user || user.role !== 'admin') {
        throw new AppError('Unauthorized: Guest reports can only be deleted by an administrator.', 403);
      }
    }

    if (isDatabaseConnected()) {
      await Item.findOneAndDelete({ id: numericId });
      // Clean up uploaded image file if present
      if (existing.image) {
        await StorageService.deleteImage(existing.image);
      }
      return { id: numericId, message: 'Item deleted successfully.' };
    }

    assertFallbackAllowed();

    const itemIndex = memoryStore.findIndex((i) => i.id === numericId);
    if (itemIndex === -1) {
      throw new AppError(`Item with ID ${id} not found.`, 404);
    }

    memoryStore.splice(itemIndex, 1);
    return { id: numericId, message: 'Item deleted successfully.' };
  }

  /**
   * Compute dashboard analytics and metrics matching Dashboard.jsx.
   */
  static async getStats() {
    let allItems = [];

    if (isDatabaseConnected()) {
      allItems = await Item.find().sort({ date: -1 }).lean();
      allItems = allItems.map((doc) => {
        const { _id, __v, ...rest } = doc;
        return rest;
      });
    } else {
      assertFallbackAllowed();
      allItems = [...memoryStore];
    }

    const lostCount = allItems.filter((i) => i.type === 'lost').length;
    const foundCount = allItems.filter((i) => i.type === 'found').length;
    const resolvedCount = allItems.filter((i) => i.status === 'resolved').length;
    const activeCount = allItems.filter((i) => i.status === 'active').length;
    const totalCount = allItems.length;

    const categories = ['Electronics', 'Documents', 'Books', 'Accessories', 'Others'];
    const categoryCounts = categories.map((cat) => ({
      name: cat,
      count: allItems.filter((i) => i.category === cat).length
    }));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthMap = {};
    allItems.forEach((item) => {
      if (!item.date) return;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthMap[sortKey]) {
        monthMap[sortKey] = { key: sortKey, label, count: 0 };
      }
      monthMap[sortKey].count++;
    });

    const monthlyDistribution = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);

    // 5 most recent reports
    const recentItems = [...allItems]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return {
      summary: {
        total: totalCount,
        lost: lostCount,
        found: foundCount,
        resolved: resolvedCount,
        active: activeCount
      },
      categoryBreakdown: categoryCounts,
      monthlyDistribution,
      recentItems
    };
  }
}
