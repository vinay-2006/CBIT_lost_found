import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { ItemService } from '../src/services/itemService.js';
import { AuthService } from '../src/services/authService.js';

test.describe('Found Item Claim Endpoint & Data Integrity', () => {
  let studentCookie;
  let studentToken;
  let studentUser;
  let testFoundItemId;
  let testLostItemId;

  test.beforeEach(async () => {
    ItemService.resetMemoryStore();
    AuthService.resetMemoryStore();

    // Login default demo student
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@cbit.ac.in',
        password: 'Password123'
      });

    assert.equal(loginRes.status, 200);
    studentUser = loginRes.body.data.student;
    studentToken = loginRes.body.data.token;
    studentCookie = loginRes.headers['set-cookie'];

    // Create an active found item for testing
    const foundRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'found',
        itemName: 'Apple AirPods Pro Case',
        category: 'Electronics',
        description: 'White charging case found in CBIT Library reading room.',
        location: 'Library 1st Floor',
        date: '2026-08-20',
        reportedBy: 'Staff Member',
        contact: '9876543210',
        email: 'staff@cbit.ac.in'
      });

    assert.equal(foundRes.status, 201);
    testFoundItemId = foundRes.body.data.id;

    // Create a lost item for testing type restriction
    const lostRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'lost',
        itemName: 'Casio Calculator',
        category: 'Electronics',
        description: 'Scientific calculator lost in exam hall.',
        location: 'Exam Hall 2',
        date: '2026-08-21',
        reportedBy: 'Rahul',
        rollNo: '23A91A0501',
        contact: '9876543210',
        email: 'student@cbit.ac.in'
      });

    assert.equal(lostRes.status, 201);
    testLostItemId = lostRes.body.data.id;
  });

  test('POST /api/items/:id/claim should reject unauthenticated requests with 401', async () => {
    const res = await request(app).post(`/api/items/${testFoundItemId}/claim`);
    assert.equal(res.status, 401);
  });

  test('POST /api/items/:id/claim should allow authenticated student to claim active found item', async () => {
    const res = await request(app)
      .post(`/api/items/${testFoundItemId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'resolved');
    assert.ok(res.body.data.claimedBy);
    assert.equal(res.body.data.claimedBy.userId, studentUser.id);
    assert.equal(res.body.data.claimedBy.email, studentUser.email);
    assert.equal(res.body.data.claimedBy.rollNo, studentUser.rollNo);

    // Verify item is now resolved in GET /api/items/:id
    const verifyRes = await request(app).get(`/api/items/${testFoundItemId}`);
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.status, 'resolved');
    assert.equal(verifyRes.body.data.claimedBy.userId, studentUser.id);
  });

  test('POST /api/items/:id/claim should work with session cookie authentication', async () => {
    const res = await request(app)
      .post(`/api/items/${testFoundItemId}/claim`)
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'resolved');
  });

  test('POST /api/items/:id/claim should reject claiming an already-resolved item (400)', async () => {
    // Claim first time
    await request(app)
      .post(`/api/items/${testFoundItemId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Try claiming second time
    const secondRes = await request(app)
      .post(`/api/items/${testFoundItemId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(secondRes.status, 400);
    assert.match(secondRes.body.error.message, /already been (marked as )?resolved|claimed/i);
  });

  test('POST /api/items/:id/claim should reject claiming a lost item (400)', async () => {
    const res = await request(app)
      .post(`/api/items/${testLostItemId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /only (items listed as )?found/i);
  });

  test('POST /api/items/:id/claim should return 404 for non-existent item ID', async () => {
    const res = await request(app)
      .post('/api/items/999999/claim')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 404);
  });

  test('Claimed items should appear in student My Reports portal', async () => {
    // Claim the found item
    await request(app)
      .post(`/api/items/${testFoundItemId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);

    const myReportsRes = await request(app)
      .get('/api/items/my-reports')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(myReportsRes.status, 200);
    const claimedItemInReports = myReportsRes.body.data.find((i) => i.id === testFoundItemId);
    assert.ok(claimedItemInReports, 'Claimed item should be returned in My Reports');
    assert.equal(claimedItemInReports.status, 'resolved');
  });
});
