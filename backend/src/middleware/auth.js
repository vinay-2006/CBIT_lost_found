import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const TOKEN_COOKIE_NAME = 'cbit_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * Generate a signed JWT token (useful for testing and user sessions).
 */
export function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

/**
 * Extract token from cookie or Authorization Bearer header.
 */
export function extractToken(req) {
  if (req.cookies && req.cookies[TOKEN_COOKIE_NAME]) {
    return req.cookies[TOKEN_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1] || null;
  }
  return null;
}

/**
 * Optional authentication middleware.
 * If an Authorization Bearer token or HttpOnly cookie is provided, validates it
 * and attaches user info to req.user. If no token is provided, continues as guest.
 */
export function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        rollNo: decoded.rollNo || '',
        name: decoded.name || '',
        role: decoded.role || 'authenticated'
      };
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Enforced authentication middleware.
 * Rejects requests without a valid Bearer token or valid session cookie.
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next(new AppError('Authentication required. Missing Bearer token.', 401));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      rollNo: decoded.rollNo || '',
      name: decoded.name || '',
      role: decoded.role || 'authenticated'
    };
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }
}
