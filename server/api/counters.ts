import { FastifyInstance } from 'fastify';
import {
  IncrementGidRequest,
  IncrementGidResponse,
  IncrementPidRequest,
  IncrementPidResponse,
} from '@shared/types';
import {incrementGid, incrementPid} from '../model/counters';

async function countersRouter(fastify: FastifyInstance) {
  fastify.post<{Body: IncrementGidRequest, Reply: IncrementGidResponse}>('/gid', async (request) => {
    request.log.debug('increment gid');
    const gid = await incrementGid();
    return { gid };
  });

  fastify.post<{Body: IncrementPidRequest, Reply: IncrementPidResponse}>('/pid', async (request) => {
    request.log.debug('increment pid');
    const pid = await incrementPid();
    return { pid };
  });
}

export default countersRouter;
