import { ZodError } from 'zod';
import multer from 'multer';

/**
 * Custom error class with HTTP status code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler for undefined routes.
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    }
  });
}

/**
 * Centralized error handling middleware.
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details
      }
    });
  }

  // 2. Multer file upload errors
  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed size (5MB).';
    }
    return res.status(400).json({
      success: false,
      error: {
        message,
        code: err.code
      }
    });
  }

  // 3. JSON body parser syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON payload in request body'
      }
    });
  }

  // 4. Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // 5. MongoDB & Mongoose error handling
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        message: 'Database validation failed',
        details
      }
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { message: 'A record with these details already exists in MongoDB.' }
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { message: `Invalid identifier or data type for field: ${err.path}` }
    });
  }

  // 6. Generic unhandled errors
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'An unexpected error occurred';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message
    }
  });
}
