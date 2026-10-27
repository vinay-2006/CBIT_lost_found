import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected, pingDatabase } from '../src/config/database.js';
import { seedDatabase } from '../scripts/seed.js';
import { Item } from '../src/models/Item.js';
import { signToken } from '../src/middleware/auth.js';

const TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/cbit_lost_found_test';
process.env.NODE_ENV = 'test';

describe('Live MongoDB Database & CRUD Integration Tests', () => {
  let isMongoLive = false;

  before(async () => {
    try {
      // Attempt connection to real local MongoDB test database
      await connectDatabase(TEST_MONGODB_URI);
      await seedDatabase(TEST_MONGODB_URI);
      isMongoLive = true;
    } catch (err) {
      console.warn(`[INFO] Local MongoDB service not running at ${TEST_MONGODB_URI}. Skipping live MongoDB tests.`);
      isMongoLive = false;
    }
  });

  after(async () => {
    if (isMongoLive && mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.dropDatabase();
      } catch (err) {
        // ignore
      }
      await disconnectDatabase();
    }
  });

  test('MongoDB connection state should be active (readyState === 1)', (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    assert.equal(isDatabaseConnected(), true);
    assert.equal(mongoose.connection.readyState, 1);
  });

  test('GET /api/health should verify real MongoDB connection with ping latency', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.database.provider, 'MongoDB');
    assert.equal(res.body.data.database.connected, true);
    assert.ok(typeof res.body.data.database.latencyMs === 'number');
  });

  test('GET /api/items should query real MongoDB items with pagination', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const res = await request(app).get('/api/items?limit=5&page=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 5);
    assert.ok(res.body.meta.total >= 20);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 5);
  });

  test('GET /api/items?type=found should filter MongoDB collection for found items', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const res = await request(app).get('/api/items?type=found');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((i) => i.type === 'found'));
  });

  test('GET /api/items?category=Books should filter MongoDB collection for Books', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const res = await request(app).get('/api/items?category=Books');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((i) => i.category === 'Books'));
  });

  test('POST /api/items should insert a new report into live MongoDB', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const adminToken = signToken({ id: 'admin-live-1', email: 'admin@cbit.ac.in', role: 'admin' });
    const payload = {
      type: 'lost',
      itemName: 'Dell XPS 15 Laptop',
      category: 'Electronics',
      description: 'Silver 15-inch Dell laptop left on lab table',
      location: 'CAD Lab 2',
      date: '2026-08-27',
      reportedBy: 'Kavitha Devi',
      rollNo: '23A91A0589',
      contact: '9849012345',
      email: 'kavitha.d@cbit.ac.in'
    };

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id > 20);
    assert.equal(res.body.data.itemName, payload.itemName);
    assert.equal(res.body.data.userId, 'admin-live-1');

    // Verify document actually exists in MongoDB
    const mongoDoc = await Item.findOne({ id: res.body.data.id }).lean();
    assert.ok(mongoDoc);
    assert.equal(mongoDoc.itemName, payload.itemName);
    assert.equal(mongoDoc.location, 'CAD Lab 2');
  });

  test('PATCH /api/items/:id should update a report in live MongoDB', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    // Update item 1 (status: resolved)
    const res = await request(app)
      .patch('/api/items/1')
      .send({ status: 'resolved' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'resolved');

    // Verify in MongoDB directly
    const doc = await Item.findOne({ id: 1 }).lean();
    assert.equal(doc.status, 'resolved');
  });

  test('GET /api/stats should compute aggregation directly from live MongoDB', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const res = await request(app).get('/api/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.summary.total >= 21);
    assert.ok(res.body.data.summary.resolved >= 1);
    assert.ok(Array.isArray(res.body.data.categoryBreakdown));
    assert.ok(Array.isArray(res.body.data.monthlyDistribution));
  });

  test('DELETE /api/items/:id should delete from live MongoDB when authorized', async (t) => {
    if (!isMongoLive) {
      t.skip('Local MongoDB service not running');
      return;
    }
    const adminToken = signToken({ id: 'admin-live-1', email: 'admin@cbit.ac.in', role: 'admin' });

    // Delete item 1 using admin token
    const res = await request(app)
      .delete('/api/items/1')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify document is deleted from MongoDB
    const doc = await Item.findOne({ id: 1 });
    assert.equal(doc, null);

    // Verify GET /api/items/1 returns 404
    const getRes = await request(app).get('/api/items/1');
    assert.equal(getRes.status, 404);
  });
});
