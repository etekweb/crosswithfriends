import {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';

/**
 * Health check endpoint for Docker and monitoring
 */
async function healthRouter(fastify: FastifyInstance) {
  fastify.get('/', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}

export default healthRouter;
