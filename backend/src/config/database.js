import mongoose from 'mongoose';
import { env } from './env.js';

let isConnecting = false;

export async function connectDatabase(uri = env.MONGODB_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', (err) => reject(err));
    });
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    if (env.NODE_ENV !== 'test') {
      console.log(`[MongoDB] Connected to database: ${conn.connection.name}`);
    }

    isConnecting = false;
    return conn;
  } catch (err) {
    isConnecting = false;
    if (env.NODE_ENV !== 'test') {
      console.error('[MongoDB] Connection error:', err.message);
    }
    throw err;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    if (env.NODE_ENV !== 'test') {
      console.log('[MongoDB] Disconnected from database.');
    }
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function pingDatabase() {
  if (!isDatabaseConnected() || !mongoose.connection.db) {
    return { connected: false, error: 'Not connected' };
  }

  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}
