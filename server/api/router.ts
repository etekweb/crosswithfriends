import { FastifyInstance } from 'fastify';
import puzzleListRouter from './puzzle_list';
import puzzleRouter from './puzzle';
import gameRouter from './game';
import recordSolveRouter from './record_solve';
import statsRouter from './stats';
import oEmbedRouter from './oembed';
import linkPreviewRouter from './link_preview';
import countersRouter from './counters';
import healthRouter from './health';
// import statsRouter from './stats';

async function apiRouter(fastify: FastifyInstance) {
  await fastify.register(healthRouter, { prefix: '/health' });
  await fastify.register(puzzleListRouter, { prefix: '/puzzle_list' });
  await fastify.register(puzzleRouter, { prefix: '/puzzle' });
  await fastify.register(gameRouter, { prefix: '/game' });
  await fastify.register(recordSolveRouter, { prefix: '/record_solve' });
  await fastify.register(statsRouter, { prefix: '/stats' });
  await fastify.register(oEmbedRouter, { prefix: '/oembed' });
  await fastify.register(linkPreviewRouter, { prefix: '/link_preview' });
  await fastify.register(countersRouter, { prefix: '/counters' });
  // await fastify.register(statsRouter, { prefix: '/stats' }); // disabled for perf reasons -- getPuzzleSolves took 5301ms for 62 gids overall /api/stats took 5355ms for 62 solves
}

export default apiRouter;
