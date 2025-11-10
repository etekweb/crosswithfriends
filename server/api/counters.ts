import {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';
import {IncrementGidResponse, IncrementPidResponse} from '@shared/types';
import {incrementGid, incrementPid} from '../model/counters';

async function countersRouter(fastify: FastifyInstance) {
  fastify.post<{Reply: IncrementGidResponse}>(
    '/gid',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      request.log.debug('increment gid');
      const gid = await incrementGid();
      return {gid};
    }
  );

  fastify.post<{Reply: IncrementPidResponse}>(
    '/pid',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      request.log.debug('increment pid');
      const pid = await incrementPid();
      return {pid};
    }
  );
}

export default countersRouter;
