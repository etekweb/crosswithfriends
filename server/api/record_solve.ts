import { FastifyInstance } from 'fastify';
import {RecordSolveRequest, RecordSolveResponse} from '../../src/shared/types';
import {recordSolve} from '../model/puzzle';

async function recordSolveRouter(fastify: FastifyInstance) {
  fastify.post<{Params: {pid: string}, Body: RecordSolveRequest, Reply: RecordSolveResponse}>('/:pid', async (request) => {
    await recordSolve(request.params.pid, request.body.gid, request.body.time_to_solve);
    return {};
  });
}

export default recordSolveRouter;
