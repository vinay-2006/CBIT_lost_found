import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { ItemService } from './services/itemService.js';
import { StorageService } from './services/storageService.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS configuration restricted to frontend origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Response-Format'],
    credentials: true
  })
);

// 3. HTTP Request Logging (disabled during automated test runs)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. Request Body & Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Serve dedicated uploaded images statically
app.use('/uploads', express.static(StorageService.getUploadsDir()));

// 6. Root status check
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'CBIT Lost & Found Portal API',
    version: '2.0.0',
    database: 'MongoDB',
    status: 'online',
    documentation: '/api/health',
    endpoints: {
      health: 'GET /api/health',
      items: 'GET /api/items',
      itemById: 'GET /api/items/:id',
      createItem: 'POST /api/items',
      updateItem: 'PATCH /api/items/:id',
      deleteItem: 'DELETE /api/items/:id',
      stats: 'GET /api/stats',
      upload: 'POST /api/upload',
      compatRawItems: 'GET /data/items.json'
    }
  });
});

// 7. Direct compatibility endpoint matching frontend fetch('/data/items.json')
app.get('/data/items.json', async (req, res, next) => {
  try {
    const result = await ItemService.getItems({ limit: 100 });
    res.status(200).json(result.items);
  } catch (err) {
    next(err);
  }
});

// 8. Mount API Routes
app.use('/api', apiRoutes);

// 9. 404 Route Handler
app.use(notFoundHandler);

// 10. Centralized Error Handler
app.use(errorHandler);

export default app;
