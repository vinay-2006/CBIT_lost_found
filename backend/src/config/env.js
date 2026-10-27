import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbit_lost_found';
const JWT_SECRET = process.env.JWT_SECRET || 'cbit_lost_found_dev_secret_key_2026';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 5 * 1024 * 1024; // 5 MB

/**
 * Checks whether MongoDB URI is configured.
 */
function isMongoConfigured() {
  if (!MONGODB_URI) return false;
  if (MONGODB_URI.includes('your_mongodb_uri') || MONGODB_URI.includes('<username>')) return false;
  return true;
}

export const env = {
  PORT,
  NODE_ENV,
  CORS_ORIGIN,
  MONGODB_URI,
  JWT_SECRET,
  UPLOAD_DIR,
  MAX_FILE_SIZE_BYTES,
  isMongoConfigured
};
