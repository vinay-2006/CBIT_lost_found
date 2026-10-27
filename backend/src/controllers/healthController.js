import { env } from '../config/env.js';
import { isDatabaseConnected, pingDatabase } from '../config/database.js';

export async function getHealth(req, res) {
  const isProd = env.NODE_ENV === 'production';

  if (isDatabaseConnected()) {
    const pingResult = await pingDatabase();

    if (!pingResult.connected) {
      return res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          service: 'CBIT Lost & Found Backend API',
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          environment: env.NODE_ENV,
          database: {
            provider: 'MongoDB',
            connected: false,
            error: pingResult.error
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'CBIT Lost & Found Backend API',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: {
          provider: 'MongoDB',
          connected: true,
          latencyMs: pingResult.latencyMs
        }
      }
    });
  }

  // Not connected
  if (isProd) {
    return res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        service: 'CBIT Lost & Found Backend API',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: {
          provider: 'MongoDB',
          connected: false,
          error: 'MongoDB is disconnected in production environment.'
        }
      }
    });
  }

  // Local development / test fallback mode
  return res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'CBIT Lost & Found Backend API',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        provider: 'In-Memory Mock Store',
        connected: true,
        mode: 'local-fallback'
      }
    }
  });
}
