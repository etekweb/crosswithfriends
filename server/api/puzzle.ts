import {FastifyInstance} from 'fastify';
import {AddPuzzleResponse, AddPuzzleRequest} from '@shared/types';

import {addPuzzle} from '../model/puzzle';

async function puzzleRouter(fastify: FastifyInstance) {
  fastify.post<{Body: AddPuzzleRequest; Reply: AddPuzzleResponse}>('/', async (request) => {
    request.log.debug({headers: request.headers, body: request.body}, 'got req');
    const pid = await addPuzzle(request.body.puzzle, request.body.isPublic, request.body.pid);
    return {pid};
  });
}

export default puzzleRouter;
