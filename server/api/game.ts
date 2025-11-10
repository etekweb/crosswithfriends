import {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';
import {CreateGameRequest, InfoJson, GetGameResponse} from '@shared/types';

import {addInitialGameEvent} from '../model/game';
import {getPuzzleSolves} from '../model/puzzle_solve';
import {getPuzzleInfo} from '../model/puzzle';
import {createHttpError} from './errors';

interface CreateGameResponseWithGid {
  gid: string;
}

async function gameRouter(fastify: FastifyInstance) {
  fastify.post<{Body: CreateGameRequest; Reply: CreateGameResponseWithGid}>(
    '/',
    async (request: FastifyRequest<{Body: CreateGameRequest}>, _reply: FastifyReply) => {
      request.log.debug({headers: request.headers, body: request.body}, 'got req');
      const gid = await addInitialGameEvent(request.body.gid, request.body.pid);
      return {gid};
    }
  );

  fastify.get<{Params: {gid: string}; Reply: GetGameResponse}>(
    '/:gid',
    async (request: FastifyRequest<{Params: {gid: string}}>, _reply: FastifyReply) => {
      request.log.debug({headers: request.headers, params: request.params}, 'got req');
      const {gid} = request.params;

      const puzzleSolves = await getPuzzleSolves([gid]);

      if (puzzleSolves.length === 0) {
        throw createHttpError('Game not found', 404);
      }

      // After the length check, puzzleSolves[0] is guaranteed to exist
      const gameState = puzzleSolves[0]!;
      const puzzleInfo = (await getPuzzleInfo(gameState.pid)) as InfoJson;

      return {
        gid,
        title: gameState.title,
        author: puzzleInfo?.author || 'Unknown',
        duration: gameState.time_taken_to_solve,
        size: gameState.size,
      };
    }
  );
}

export default gameRouter;
