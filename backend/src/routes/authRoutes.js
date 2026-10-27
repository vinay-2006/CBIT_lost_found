import { Router } from 'express';
import { register, login, logout, getMe, changePassword } from '../controllers/authController.js';
import { validate, registerSchema, loginSchema, changePasswordSchema } from '../middleware/validator.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register - Register a new CBIT student account
router.post('/register', validate(registerSchema, 'body'), register);

// POST /api/auth/login - Authenticate student and issue session/token
router.post('/login', validate(loginSchema, 'body'), login);

// POST /api/auth/logout - Invalidate session cookie
router.post('/logout', logout);

// GET /api/auth/me - Retrieve current authenticated student profile
router.get('/me', requireAuth, getMe);

// PUT /api/auth/change-password - Change current student password
router.put('/change-password', requireAuth, validate(changePasswordSchema, 'body'), changePassword);

export default router;
