import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { ItemService } from '../src/services/itemService.js';
import { env } from '../src/config/env.js';

// Ensure test environment
process.env.NODE_ENV = 'test';

describe('CBIT Lost & Found API Endpoints', () => {
  beforeEach(() => {
    // Reset in-memory store before each test block
    ItemService.resetMemoryStore();
  });

  // --------------------------------------------------------------------------
  // 1. Health & Root Endpoints
  // --------------------------------------------------------------------------
  describe('GET /api/health and Root', () => {
    test('GET / should return API metadata and online status', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'online');
      assert.ok(res.body.endpoints);
    });

    test('GET /api/health should return 200 with health details in local test mode', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'healthy');
      assert.ok(res.body.data.timestamp);
      assert.ok(typeof res.body.data.uptimeSeconds === 'number');
      assert.equal(res.body.data.database.mode, 'local-fallback');
    });

    test('GET /data/items.json should return raw array for frontend compatibility', async () => {
      const res = await request(app).get('/data/items.json');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.equal(res.body.length, 20);
      assert.ok(res.body[0].itemName);
      assert.ok(res.body[0].location);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Item Creation (POST /api/items)
  // --------------------------------------------------------------------------
  describe('POST /api/items (Creation & Validation)', () => {
    test('should successfully create a valid lost item report with rollNo', async () => {
      const payload = {
        type: 'lost',
        itemName: 'HP Scientific Calculator',
        category: 'Electronics',
        description: 'Silver HP scientific calculator left in seminar room',
        location: 'Seminar Hall 2',
        date: '2026-08-25',
        reportedBy: 'Vikas Rao',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 'vikas.rao@cbit.ac.in',
        image: '/images/calculator.jpg'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.itemName, payload.itemName);
      assert.equal(res.body.data.type, 'lost');
      assert.equal(res.body.data.rollNo, '23A91A0511');
      assert.equal(res.body.data.status, 'active');
    });

    test('should successfully create a valid found item report without rollNo', async () => {
      const payload = {
        type: 'found',
        itemName: 'Water Flask',
        category: 'Accessories',
        description: 'Blue metal water bottle found on bench',
        location: 'Library Lawn',
        date: '2026-08-26',
        reportedBy: 'Anita Sen',
        contact: '8976543210',
        email: 'anita.sen@gmail.com'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.type, 'found');
      assert.equal(res.body.data.rollNo, '');
    });

    test('should reject lost item if roll number is missing', async () => {
      const payload = {
        type: 'lost',
        itemName: 'Lost Wallet',
        category: 'Accessories',
        description: 'Black leather wallet',
        location: 'Canteen',
        date: '2026-08-25',
        reportedBy: 'Kiran K',
        rollNo: '', // Missing
        contact: '9848012345',
        email: 'kiran@cbit.ac.in'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const rollErr = res.body.error.details.find((d) => d.field === 'rollNo');
      assert.ok(rollErr, 'Expected rollNo error in validation details');
    });

    test('should reject invalid 10-digit Indian mobile number', async () => {
      const payload = {
        type: 'found',
        itemName: 'Keys',
        category: 'Others',
        description: 'Set of bike keys',
        location: 'Parking',
        date: '2026-08-25',
        reportedBy: 'Staff',
        contact: '1234567890', // Invalid prefix (must start with 6-9)
        email: 'staff@cbit.ac.in'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const contactErr = res.body.error.details.find((d) => d.field === 'contact');
      assert.ok(contactErr);
    });

    test('should reject invalid email syntax', async () => {
      const payload = {
        type: 'found',
        itemName: 'Keys',
        category: 'Others',
        description: 'Set of bike keys',
        location: 'Parking',
        date: '2026-08-25',
        reportedBy: 'Staff',
        contact: '9876543210',
        email: 'not-an-email'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const emailErr = res.body.error.details.find((d) => d.field === 'email');
      assert.ok(emailErr);
    });

    test('should reject invalid category', async () => {
      const payload = {
        type: 'found',
        itemName: 'Keys',
        category: 'InvalidCategory',
        description: 'Set of bike keys',
        location: 'Parking',
        date: '2026-08-25',
        reportedBy: 'Staff',
        contact: '9876543210',
        email: 'staff@cbit.ac.in'
      };

      const res = await request(app).post('/api/items').send(payload);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Item Retrieval & Filtering (GET /api/items, GET /api/items/:id)
  // --------------------------------------------------------------------------
  describe('GET /api/items and GET /api/items/:id', () => {
    test('should retrieve all items with metadata', async () => {
      const res = await request(app).get('/api/items');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.meta.total > 0);
    });

    test('should filter items by type=lost', async () => {
      const res = await request(app).get('/api/items?type=lost');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every((i) => i.type === 'lost'));
    });

    test('should filter items by type=found', async () => {
      const res = await request(app).get('/api/items?type=found');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every((i) => i.type === 'found'));
    });

    test('should filter items by category', async () => {
      const res = await request(app).get('/api/items?category=Electronics');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every((i) => i.category === 'Electronics'));
    });

    test('should filter items by keyword search', async () => {
      const res = await request(app).get('/api/items?search=Calculator');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length > 0);
      assert.ok(
        res.body.data.some((i) => i.itemName.toLowerCase().includes('calculator'))
      );
    });

    test('should return empty array for non-matching search without error', async () => {
      const res = await request(app).get('/api/items?search=NonExistentSuperItem12345');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 0);
      assert.equal(res.body.meta.total, 0);
    });

    test('should support pagination (limit and page)', async () => {
      const res = await request(app).get('/api/items?limit=3&page=1');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 3);
      assert.equal(res.body.meta.limit, 3);
      assert.equal(res.body.meta.page, 1);
    });

    test('should retrieve a specific item by ID', async () => {
      const res = await request(app).get('/api/items/1');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, 1);
      assert.equal(res.body.data.itemName, 'Casio Scientific Calculator');
    });

    test('should return 404 for non-existent item ID', async () => {
      const res = await request(app).get('/api/items/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('not found'));
    });

    test('should return 400 for invalid item ID format', async () => {
      const res = await request(app).get('/api/items/invalid-id');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Item Updates (PATCH /api/items/:id)
  // --------------------------------------------------------------------------
  describe('PATCH /api/items/:id', () => {
    test('should update guest item status to resolved', async () => {
      const res = await request(app)
        .patch('/api/items/1')
        .send({ status: 'resolved' });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'resolved');
    });

    test('should reject modifying guest content without admin or reporter verification (403)', async () => {
      // Trying to tamper with description of guest item without verification
      const res = await request(app)
        .patch('/api/items/1')
        .send({ description: 'Tampered description by stranger' });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Guest reports can only be modified'));
    });

    test('should update guest item content when reporter email verification is provided', async () => {
      const res = await request(app)
        .patch('/api/items/1')
        .send({
          email: 'rahul.sharma@cbit.ac.in',
          description: 'Updated description by verified reporter'
        });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.description, 'Updated description by verified reporter');
    });

    test('should reject empty update body', async () => {
      const res = await request(app).patch('/api/items/1').send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test('should return 404 when updating non-existent item', async () => {
      const res = await request(app)
        .patch('/api/items/99999')
        .send({ status: 'resolved' });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Item Deletion (DELETE /api/items/:id)
  // --------------------------------------------------------------------------
  describe('DELETE /api/items/:id', () => {
    test('should reject anonymous deletion of guest reports (403)', async () => {
      const res = await request(app).delete('/api/items/2');
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Guest reports can only be deleted by an administrator'));
    });

    test('should allow administrator to delete a guest report', async () => {
      // Simulate admin call
      const admin = { id: 'admin-1', email: 'admin@cbit.ac.in', role: 'admin' };
      const delResult = await ItemService.deleteItem(2, admin);
      assert.equal(delResult.id, 2);

      // Verify item 2 no longer exists
      const verifyRes = await request(app).get('/api/items/2');
      assert.equal(verifyRes.status, 404);
    });

    test('should return 404 when deleting non-existent item', async () => {
      const res = await request(app).delete('/api/items/99999');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Analytics Stats (GET /api/stats)
  // --------------------------------------------------------------------------
  describe('GET /api/stats', () => {
    test('should return dashboard summary metrics matching frontend expectations', async () => {
      const res = await request(app).get('/api/stats');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.summary);
      assert.ok(typeof res.body.data.summary.total === 'number');
      assert.ok(typeof res.body.data.summary.lost === 'number');
      assert.ok(typeof res.body.data.summary.found === 'number');
      assert.ok(typeof res.body.data.summary.resolved === 'number');
      assert.ok(Array.isArray(res.body.data.categoryBreakdown));
      assert.ok(Array.isArray(res.body.data.monthlyDistribution));
      assert.ok(Array.isArray(res.body.data.recentItems));
      assert.equal(
        res.body.data.summary.total,
        res.body.data.summary.lost + res.body.data.summary.found
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Image Upload (POST /api/upload)
  // --------------------------------------------------------------------------
  describe('POST /api/upload', () => {
    test('should accept valid PNG image upload', async () => {
      const fakePngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/upload')
        .attach('image', fakePngBuffer, 'test.png');

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.url);
      assert.equal(res.body.data.mimetype, 'image/png');
    });

    test('should reject SVG image upload for XSS prevention (400)', async () => {
      const fakeSvgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>'
      );

      const res = await request(app)
        .post('/api/upload')
        .attach('image', fakeSvgBuffer, 'exploit.svg');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('SVG uploads are prohibited'));
    });

    test('should reject non-image file upload (400)', async () => {
      const fakeTxtBuffer = Buffer.from('plain text content');

      const res = await request(app)
        .post('/api/upload')
        .attach('image', fakeTxtBuffer, 'test.txt');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Invalid file type'));
    });

    test('should reject upload when no file is attached (400)', async () => {
      const res = await request(app).post('/api/upload');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Error Handling & Edge Cases
  // --------------------------------------------------------------------------
  describe('Error Handling and Edge Cases', () => {
    test('should return 404 JSON for undefined routes', async () => {
      const res = await request(app).get('/api/undefined-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Resource not found'));
    });

    test('should return 400 for malformed JSON request body', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Content-Type', 'application/json')
        .send('{ "itemName": "Unclosed string ...');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.message.includes('Malformed JSON'));
    });
  });

  // --------------------------------------------------------------------------
  // 9. Production Fallback Safety
  // --------------------------------------------------------------------------
  describe('Production Fallback Safety Guard', () => {
    test('should refuse in-memory fallback in production when MongoDB is disconnected', async () => {
      const originalEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      try {
        await assert.rejects(
          async () => {
            await ItemService.getItems();
          },
          (err) => {
            assert.equal(err.statusCode, 503);
            assert.ok(err.message.includes('In-memory fallback is disabled in production'));
            return true;
          }
        );
      } finally {
        env.NODE_ENV = originalEnv;
      }
    });
  });
});
