import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/authService.js';
import { ItemService } from '../src/services/itemService.js';

process.env.NODE_ENV = 'test';

describe('Item Status Lifecycle & Ownership Authorization', () => {
  let student1Token;
  let student1Id;
  let student2Token;
  let student2Id;

  beforeEach(async () => {
    ItemService.resetMemoryStore();
    await AuthService.resetMemoryStore();

    // Student 1
    const s1 = await AuthService.register({
      name: 'Student One',
      email: 's1@cbit.ac.in',
      rollNo: '23A91A0511',
      password: 'Password123!'
    });
    student1Token = s1.token;
    student1Id = s1.student.id;

    // Student 2
    const s2 = await AuthService.register({
      name: 'Student Two',
      email: 's2@cbit.ac.in',
      rollNo: '23A91A0522',
      password: 'Password123!'
    });
    student2Token = s2.token;
    student2Id = s2.student.id;
  });

  test('Authenticated student can report an item and ownership (userId) is recorded', async () => {
    const payload = {
      type: 'lost',
      itemName: 'Scientific Calculator fx-991',
      category: 'Electronics',
      description: 'Black calculator left in mechanical seminar hall',
      location: 'Mechanical Block 2nd Floor',
      date: '2026-08-25',
      reportedBy: 'Student One',
      rollNo: '23A91A0511',
      contact: '9848012345',
      email: 's1@cbit.ac.in'
    };

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.userId, student1Id);
  });

  test('GET /api/items/my-reports returns only reports submitted by authenticated student', async () => {
    // S1 creates 2 reports
    await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'S1 Lost Keys',
        category: 'Accessories',
        description: 'Bike keys',
        location: 'Gate 1',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'found',
        itemName: 'S1 Found Pen',
        category: 'Others',
        description: 'Parker pen',
        location: 'Library',
        date: '2026-08-25',
        reportedBy: 'Student One',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    // S2 creates 1 report
    await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        type: 'lost',
        itemName: 'S2 Lost Book',
        category: 'Books',
        description: 'Math textbook',
        location: 'Room 201',
        date: '2026-08-25',
        reportedBy: 'Student Two',
        rollNo: '23A91A0522',
        contact: '9848012346',
        email: 's2@cbit.ac.in'
      });

    // Fetch S1 reports
    const s1Res = await request(app)
      .get('/api/items/my-reports')
      .set('Authorization', `Bearer ${student1Token}`);

    assert.equal(s1Res.status, 200);
    assert.equal(s1Res.body.success, true);
    assert.equal(s1Res.body.data.length, 2);
    assert.ok(s1Res.body.data.every((i) => i.userId === student1Id));

    // Fetch S2 reports
    const s2Res = await request(app)
      .get('/api/items/my-reports')
      .set('Authorization', `Bearer ${student2Token}`);

    assert.equal(s2Res.status, 200);
    assert.equal(s2Res.body.success, true);
    assert.equal(s2Res.body.data.length, 1);
    assert.equal(s2Res.body.data[0].itemName, 'S2 Lost Book');
  });

  test('Owner student can change status from active to resolved', async () => {
    // S1 creates report
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'Lost Wallet',
        category: 'Accessories',
        description: 'Brown leather wallet',
        location: 'Canteen',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    const itemId = createRes.body.data.id;

    // S1 resolves report
    const updateRes = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ status: 'resolved' });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.status, 'resolved');

    // Verify persisted via GET
    const getRes = await request(app).get(`/api/items/${itemId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.status, 'resolved');
  });

  test('Owner student can reopen report from resolved back to active', async () => {
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'Lost Watch',
        category: 'Accessories',
        description: 'Titan black watch',
        location: 'Sports Ground',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in',
        status: 'resolved'
      });

    const itemId = createRes.body.data.id;

    // S1 reopens report
    const reopenRes = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ status: 'active' });

    assert.equal(reopenRes.status, 200);
    assert.equal(reopenRes.body.data.status, 'active');
  });

  test('Non-owner student CANNOT change status or modify report (403)', async () => {
    // S1 creates report
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'Personal Umbrella',
        category: 'Accessories',
        description: 'Red umbrella',
        location: 'Bus Stop',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    const itemId = createRes.body.data.id;

    // S2 attempts to resolve S1's report
    const updateRes = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ status: 'resolved' });

    assert.equal(updateRes.status, 403);
    assert.equal(updateRes.body.success, false);
    assert.ok(updateRes.body.error.message.includes('only update your own reports'));

    // S2 attempts to delete S1's report
    const deleteRes = await request(app)
      .delete(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student2Token}`);

    assert.equal(deleteRes.status, 403);
    assert.equal(deleteRes.body.success, false);
  });

  test('Unauthenticated user CANNOT modify or delete an authenticated student report (401)', async () => {
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'Private Bag',
        category: 'Accessories',
        description: 'Backpack',
        location: 'Lab 1',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    const itemId = createRes.body.data.id;

    // Anonymous update attempt
    const anonRes = await request(app)
      .patch(`/api/items/${itemId}`)
      .send({ status: 'resolved' });

    assert.equal(anonRes.status, 401);
    assert.equal(anonRes.body.success, false);
  });

  test('Invalid status value is rejected by validator (400)', async () => {
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'lost',
        itemName: 'USB Drive',
        category: 'Electronics',
        description: '64GB SanDisk',
        location: 'Library',
        date: '2026-08-25',
        reportedBy: 'Student One',
        rollNo: '23A91A0511',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    const itemId = createRes.body.data.id;

    const invalidRes = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ status: 'unsupported_status' });

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.success, false);
  });

  test('GET /api/stats reflects dynamic resolved and total counts correctly', async () => {
    const statsBefore = await request(app).get('/api/stats');
    const initialResolved = statsBefore.body.data.summary.resolved;
    const initialTotal = statsBefore.body.data.summary.total;

    // Create and resolve an item
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        type: 'found',
        itemName: 'Water Bottle',
        category: 'Others',
        description: 'Milton steel bottle',
        location: 'Sports Block',
        date: '2026-08-25',
        reportedBy: 'Student One',
        contact: '9848012345',
        email: 's1@cbit.ac.in'
      });

    const itemId = createRes.body.data.id;

    await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ status: 'resolved' });

    const statsAfter = await request(app).get('/api/stats');
    assert.equal(statsAfter.body.data.summary.total, initialTotal + 1);
    assert.equal(statsAfter.body.data.summary.resolved, initialResolved + 1);
  });
});
