import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from 'vitest';
import { buildTestApp, closeApp, waitForApp } from '../helpers';
import type { FastifyInstance } from 'fastify';
import * as puzzleSolveModel from '../../model/puzzle_solve';

// Mock the model
vi.mock('../../model/puzzle_solve');

describe('Stats API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await waitForApp(app);
  });

  afterAll(async () => {
    await closeApp(app);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/stats', () => {
    it('should return puzzle stats for valid gids', async () => {
      const mockGids = ['gid1', 'gid2'];
      const mockPuzzleSolves = [
        {
          gid: 'gid1',
          pid: 'pid1',
          title: 'Puzzle 1',
          size: '15x15',
          time_taken_to_solve: 120,
          revealed_squares_count: 50,
          checked_squares_count: 100,
          solved_time: { format: () => '2024-01-01' },
        },
        {
          gid: 'gid2',
          pid: 'pid2',
          title: 'Puzzle 2',
          size: '15x15',
          time_taken_to_solve: 180,
          revealed_squares_count: 60,
          checked_squares_count: 120,
          solved_time: { format: () => '2024-01-02' },
        },
      ];

      (puzzleSolveModel.getPuzzleSolves as Mock).mockResolvedValue(
        mockPuzzleSolves
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/stats',
        payload: { gids: mockGids },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('history');
      expect(body.stats).toBeInstanceOf(Array);
      expect(body.history).toBeInstanceOf(Array);
      expect(puzzleSolveModel.getPuzzleSolves).toHaveBeenCalledWith(mockGids);
    });

    it('should return 400 for invalid gids', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/stats',
        payload: { gids: 'not-an-array' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.message).toBe('gids are invalid');
    });

    it('should return 400 for non-string gids', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/stats',
        payload: { gids: [123, 456] },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
    });

    it('should handle errors from model', async () => {
      const error = new Error('Database error');
      (puzzleSolveModel.getPuzzleSolves as Mock).mockRejectedValue(error);

      const response = await app.inject({
        method: 'POST',
        url: '/api/stats',
        payload: { gids: ['gid1'] },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(500);
    });
  });
});

