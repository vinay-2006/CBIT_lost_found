import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import { requireAuth, optionalAuth, signToken } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { ItemService } from '../src/services/itemService.js';

process.env.NODE_ENV = 'test';

describe('Authentication and Authorization Middleware (MongoDB/JWT Edition)', () => {
  let authApp;

  beforeEach(() => {
    ItemService.resetMemoryStore();

    authApp = express();
    authApp.use(express.json());

    // Protected route
    authApp.get('/protected', requireAuth, (req, res) => {
      res.json({ success: true, user: req.user });
    });

    // Optional auth route
    authApp.get('/optional', optionalAuth, (req, res) => {
      res.json({ success: true, user: req.user });
    });

    authApp.use(errorHandler);
  });

  test('requireAuth should reject request with missing Authorization header (401)', async () => {
    const res = await request(authApp).get('/protected');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Authentication required'));
  });

  test('requireAuth should reject request with malformed Bearer token (401)', async () => {
    const res = await request(authApp)
      .get('/protected')
      .set('Authorization', 'Basic 123456');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('requireAuth should reject request with invalid/expired JWT token (401)', async () => {
    const res = await request(authApp)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.jwt.token');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Invalid or expired authentication token'));
  });

  test('requireAuth should accept valid signed JWT and populate req.user (200)', async () => {
    const token = signToken({ id: 'user-valid-1', email: 'student@cbit.ac.in', role: 'student' });
    const res = await request(authApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.id, 'user-valid-1');
    assert.equal(res.body.user.email, 'student@cbit.ac.in');
  });

  test('optionalAuth should allow guest request when no Authorization header is provided', async () => {
    const res = await request(authApp).get('/optional');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user, null);
  });

  test('optionalAuth should populate req.user when valid token is provided', async () => {
    const token = signToken({ id: 'user-opt-1', email: 'opt@cbit.ac.in', role: 'student' });
    const res = await request(authApp)
      .get('/optional')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, 'user-opt-1');
  });

  test('Anonymous user CANNOT modify or delete an authenticated user item (401)', async () => {
    const owner = { id: 'user-aaa', email: 'owner@cbit.ac.in', role: 'authenticated' };

    const item = await ItemService.createItem(
      {
        type: 'lost',
        itemName: 'Private Laptop',
        category: 'Electronics',
        description: 'Laptop in library',
        location: 'Library',
        date: '2026-08-25',
        reportedBy: 'Owner Student',
        rollNo: '23A91A0599',
        contact: '9848098480',
        email: 'owner@cbit.ac.in'
      },
      owner
    );

    // Anonymous delete attempt must be rejected with 401
    await assert.rejects(
      async () => {
        await ItemService.deleteItem(item.id, null);
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.ok(err.message.includes('Authentication required'));
        return true;
      }
    );

    // Anonymous update attempt must be rejected with 401
    await assert.rejects(
      async () => {
        await ItemService.updateItem(item.id, { status: 'resolved' }, null);
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.ok(err.message.includes('Authentication required'));
        return true;
      }
    );
  });

  test('User cannot update or delete an item owned by another user (403)', async () => {
    const owner = { id: 'user-aaa', email: 'owner@cbit.ac.in', role: 'authenticated' };
    const intruder = { id: 'user-bbb', email: 'intruder@cbit.ac.in', role: 'authenticated' };

    const item = await ItemService.createItem(
      {
        type: 'lost',
        itemName: 'Private Laptop',
        category: 'Electronics',
        description: 'Laptop in library',
        location: 'Library',
        date: '2026-08-25',
        reportedBy: 'Owner Student',
        rollNo: '23A91A0599',
        contact: '9848098480',
        email: 'owner@cbit.ac.in'
      },
      owner
    );

    // Intruder attempts to update owner's item
    await assert.rejects(
      async () => {
        await ItemService.updateItem(item.id, { status: 'resolved' }, intruder);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('Unauthorized'));
        return true;
      }
    );

    // Intruder attempts to delete owner's item
    await assert.rejects(
      async () => {
        await ItemService.deleteItem(item.id, intruder);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('Unauthorized'));
        return true;
      }
    );

    // Owner can update their own item
    const updated = await ItemService.updateItem(item.id, { status: 'resolved' }, owner);
    assert.equal(updated.status, 'resolved');

    // Owner can delete their own item
    const deleted = await ItemService.deleteItem(item.id, owner);
    assert.equal(deleted.id, item.id);
  });

  test('Guest reports cannot be arbitrarily deleted by anonymous users (403)', async () => {
    await assert.rejects(
      async () => {
        await ItemService.deleteItem(1, null);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('Guest reports can only be deleted by an administrator'));
        return true;
      }
    );

    // Admin can delete a guest report
    const admin = { id: 'admin-1', email: 'admin@cbit.ac.in', role: 'admin' };
    const deleted = await ItemService.deleteItem(1, admin);
    assert.equal(deleted.id, 1);
  });
});
