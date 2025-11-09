import {FastifyInstance} from 'fastify';
import {ListPuzzleResponse} from '@shared/types';
import _ from 'lodash';
import {listPuzzles} from '../model/puzzle';
import {ListPuzzleRequestFilters} from '../../src/shared/types';

async function puzzleListRouter(fastify: FastifyInstance) {
  fastify.get<{Querystring: {page: string; pageSize: string; filter: any}; Reply: ListPuzzleResponse}>(
    '/',
    async (request) => {
      const page = Number.parseInt(request.query.page as string, 10);
      const pageSize = Number.parseInt(request.query.pageSize as string, 10);

      if (!(Number.isFinite(page) && Number.isFinite(pageSize))) {
        const error = new Error('page and pageSize should be integers') as Error & {statusCode: number};
        error.statusCode = 400;
        throw error;
      }

      const rawFilters = request.query.filter as any;
      const filters: ListPuzzleRequestFilters = {
        sizeFilter: {
          Mini: rawFilters?.sizeFilter?.Mini === 'true',
          Standard: rawFilters?.sizeFilter?.Standard === 'true',
        },
        nameOrTitleFilter: (rawFilters?.nameOrTitleFilter ?? '') as string,
      };

      const rawPuzzleList = await listPuzzles(filters, pageSize, page * pageSize);
      const puzzles = rawPuzzleList.map((puzzle) => ({
        pid: puzzle.pid,
        content: puzzle.content,
        stats: {numSolves: puzzle.times_solved},
      }));

      return {puzzles};
    }
  );
}

export default puzzleListRouter;
