import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/authService.js';
import { TOKEN_COOKIE_NAME } from '../src/middleware/auth.js';

process.env.NODE_ENV = 'test';

describe('Student Authentication & Session Lifecycle', () => {
  beforeEach(async () => {
    await AuthService.resetMemoryStore();
  });

  test('POST /api/auth/register should register student with valid CBIT institutional email and roll number', async () => {
    const payload = {
      name: 'Aditya Varma',
      email: 'aditya.v@cbit.ac.in',
      rollNo: '23A91A0588',
      password: 'SecurePassword123!'
    };

    const res = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.student.email, 'aditya.v@cbit.ac.in');
    assert.equal(res.body.data.student.rollNo, '23A91A0588');
    assert.equal(res.body.data.student.name, 'Aditya Varma');
    assert.equal(res.body.data.student.role, 'student');
    assert.equal(res.body.data.student.password, undefined); // password must NOT be exposed
    assert.ok(res.body.data.token);

    // Verify Set-Cookie header is sent with HttpOnly
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const cookieHeader = Array.isArray(cookies) ? cookies.join(';') : cookies;
    assert.ok(cookieHeader.includes(TOKEN_COOKIE_NAME));
    assert.ok(cookieHeader.toLowerCase().includes('httponly'));
  });

  test('POST /api/auth/register should reject non-CBIT institutional email domains (400)', async () => {
    const payload = {
      name: 'External Person',
      email: 'external@gmail.com', // Non-CBIT domain
      rollNo: '23A91A0599',
      password: 'SecurePassword123!'
    };

    const res = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error);
    assert.ok(errText.includes('CBIT institutional email'));
  });

  test('POST /api/auth/register should reject invalid roll number format (400)', async () => {
    const payload = {
      name: 'Bad Roll',
      email: 'badroll@cbit.ac.in',
      rollNo: 'XYZ', // Too short / invalid roll number
      password: 'SecurePassword123!'
    };

    const res = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error);
    assert.ok(errText.includes('roll number'));
  });

  test('POST /api/auth/register should reject weak passwords (< 8 chars or no numbers) (400)', async () => {
    const payload = {
      name: 'Weak Pass',
      email: 'weak@cbit.ac.in',
      rollNo: '23A91A0511',
      password: 'short'
    };

    const res = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const errText = JSON.stringify(res.body.error);
    assert.ok(errText.includes('Password') || errText.includes('password'));
  });

  test('POST /api/auth/register should reject duplicate institutional email (409)', async () => {
    const payload = {
      name: 'Student One',
      email: 'duplicate@cbit.ac.in',
      rollNo: '23A91A0512',
      password: 'SecurePassword123!'
    };

    const res1 = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res1.status, 201);

    const res2 = await request(app).post('/api/auth/register').send({
      ...payload,
      rollNo: '23A91A0513' // Different roll, same email
    });
    assert.equal(res2.status, 409);
    assert.equal(res2.body.success, false);
    assert.ok(res2.body.error.message.includes('email'));
  });

  test('POST /api/auth/register should reject duplicate roll number (409)', async () => {
    const payload = {
      name: 'Student Two',
      email: 'student2@cbit.ac.in',
      rollNo: '23A91A0514',
      password: 'SecurePassword123!'
    };

    const res1 = await request(app).post('/api/auth/register').send(payload);
    assert.equal(res1.status, 201);

    const res2 = await request(app).post('/api/auth/register').send({
      ...payload,
      email: 'otherstudent@cbit.ac.in' // Different email, same roll
    });
    assert.equal(res2.status, 409);
    assert.equal(res2.body.success, false);
    assert.ok(res2.body.error.message.includes('roll number'));
  });

  test('POST /api/auth/login should authenticate student and set session cookie', async () => {
    // Seed account
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'login.test@cbit.ac.in',
      rollNo: '23A91A0515',
      password: 'SecurePassword123!'
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login.test@cbit.ac.in',
      password: 'SecurePassword123!'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.student.email, 'login.test@cbit.ac.in');
    assert.ok(res.body.data.token);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const cookieHeader = Array.isArray(cookies) ? cookies.join(';') : cookies;
    assert.ok(cookieHeader.includes(TOKEN_COOKIE_NAME));
  });

  test('POST /api/auth/login should reject incorrect password (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'WrongPassword999'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Invalid'));
  });

  test('POST /api/auth/login should reject non-existent student email (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@cbit.ac.in',
      password: 'SomePassword123'
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('GET /api/auth/me should return current user when authenticated with Bearer token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'Password123'
    });
    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.email, 'student@cbit.ac.in');
    assert.equal(meRes.body.data.rollNo, '23A91A0501');
    assert.equal(meRes.body.data.password, undefined);
  });

  test('GET /api/auth/me should return current user when authenticated with session cookie', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'Password123'
    });
    const cookies = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.email, 'student@cbit.ac.in');
  });

  test('GET /api/auth/me should reject unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/logout should clear session cookie (200)', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.message.includes('Logged out'));

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    const cookieHeader = Array.isArray(cookies) ? cookies.join(';') : cookies;
    assert.ok(cookieHeader.includes(`${TOKEN_COOKIE_NAME}=;`));
  });

  test('PUT /api/auth/change-password should successfully change password when current password matches', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'Password123'
    });
    const token = loginRes.body.data.token;

    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'BrandNewPassword456!'
      });

    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.success, true);

    // Verify login with old password fails
    const oldLogin = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'Password123'
    });
    assert.equal(oldLogin.status, 401);

    // Verify login with new password succeeds
    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'BrandNewPassword456!'
    });
    assert.equal(newLogin.status, 200);
  });

  test('PUT /api/auth/change-password should reject incorrect current password (400)', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'student@cbit.ac.in',
      password: 'Password123'
    });
    const token = loginRes.body.data.token;

    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'WrongCurrentPassword999',
        newPassword: 'BrandNewPassword456!'
      });

    assert.equal(changeRes.status, 400);
    assert.equal(changeRes.body.success, false);
    assert.ok(changeRes.body.error.message.includes('Incorrect current password'));
  });
});

