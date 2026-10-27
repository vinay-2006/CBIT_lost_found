import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './config/database.js';

const PORT = env.PORT;

async function startServer() {
  // Connect to MongoDB
  try {
    if (env.isMongoConfigured()) {
      await connectDatabase();
    }
  } catch (err) {
    if (env.NODE_ENV === 'production') {
      console.error('[FATAL] Failed to connect to MongoDB in production:', err.message);
      process.exit(1);
    } else {
      console.warn('[WARN] MongoDB not available. Starting server in local fallback mode.');
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` CBIT Lost & Found Backend Server (MongoDB Edition)`);
    console.log(` Environment  : ${env.NODE_ENV}`);
    console.log(` Listening on : http://localhost:${PORT}`);
    console.log(` Health check : http://localhost:${PORT}/api/health`);
    console.log(` Database     : ${isDatabaseConnected() ? 'MongoDB (CONNECTED)' : 'FALLBACK (In-Memory/Mock Mode)'}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown handling
  async function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await disconnectDatabase();
      } catch (err) {
        // ignore
      }
      console.log('Exiting process.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forcefully terminating server after timeout.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return server;
}

startServer();
