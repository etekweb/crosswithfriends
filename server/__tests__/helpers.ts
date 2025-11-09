import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import apiRouter from '../api/router';

/**
 * Creates a test Fastify instance with API routes registered
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Disable logging in tests
  });

  // Register CORS plugin
  await app.register(cors, {
    origin: true,
  });

  // Set custom error handler (same as production)
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    
    if (error.validation) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error',
        validation: error.validation,
      });
      return;
    }
    
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      statusCode,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An error occurred',
    });
  });

  // Register API routes
  await app.register(apiRouter, { prefix: '/api' });

  return app;
}

/**
 * Helper to wait for app to be ready
 */
export async function waitForApp(app: FastifyInstance): Promise<void> {
  await app.ready();
}

/**
 * Helper to close app after tests
 */
export async function closeApp(app: FastifyInstance): Promise<void> {
  await app.close();
}

