import {FastifyInstance} from 'fastify';

/**
 * Health check endpoint for Docker and monitoring
 */
async function healthRouter(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}

export default healthRouter;
