import { FastifyInstance } from 'fastify';
import {CreateGameResponse, CreateGameRequest, InfoJson, GetGameResponse} from '../../src/shared/types';

import {addInitialGameEvent} from '../model/game';
import { getPuzzleSolves } from '../model/puzzle_solve';
import { getPuzzleInfo } from '../model/puzzle';

async function gameRouter(fastify: FastifyInstance) {
  fastify.post<{Body: CreateGameRequest, Reply: CreateGameResponse}>('/', async (request) => {
    request.log.debug({ headers: request.headers, body: request.body }, 'got req');
    const gid = await addInitialGameEvent(request.body.gid, request.body.pid);
    return { gid };
  });

  fastify.get<{Params: {gid: string}, Reply: GetGameResponse}>('/:gid', async (request) => {
    request.log.debug({ headers: request.headers, params: request.params }, 'got req');
    const { gid } = request.params;

    const puzzleSolves = await getPuzzleSolves([gid]);

    if (puzzleSolves.length === 0) {
      const error = new Error('Game not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }

    const gameState = puzzleSolves[0];
    const puzzleInfo = await getPuzzleInfo(gameState.pid) as InfoJson;

    return {
      gid,
      title: gameState.title,
      author: puzzleInfo?.author || 'Unknown',
      duration: gameState.time_taken_to_solve,
      size: gameState.size,
    };
  });
}

export default gameRouter;
