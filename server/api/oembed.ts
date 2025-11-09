import {FastifyInstance} from 'fastify';
import _ from 'lodash';

async function oEmbedRouter(fastify: FastifyInstance) {
  fastify.get<{Querystring: {author: string}}>('/', async (request) => {
    request.log.debug({headers: request.headers, query: request.query}, 'got req');

    const author = request.query.author as string;

    // https://oembed.com/#section2.3
    return {
      type: 'link',
      version: '1.0',
      author_name: author,
    };
  });
}

export default oEmbedRouter;
