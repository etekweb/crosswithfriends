import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock } from 'vitest';
import { buildTestApp, closeApp, waitForApp } from '../helpers';
import type { FastifyInstance } from 'fastify';
import * as gameModel from '../../model/game';
import * as puzzleModel from '../../model/puzzle';

// Mock the models
vi.mock('../../model/game');
vi.mock('../../model/puzzle');

// Mock the utility functions
vi.mock('../../../utils/link_preview_util', () => ({
  islinkExpanderBot: vi.fn((ua: string) => ua === 'bot'),
  isFBMessengerCrawler: vi.fn((ua: string) => ua === 'messenger'),
}));

describe('Link Preview API', () => {
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

  describe('GET /api/link_preview', () => {
    it('should return 400 for invalid URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/link_preview?url=not-a-valid-url',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.message).toBe('Invalid URL');
    });

    it('should return 400 for invalid URL path', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/link_preview?url=https://example.com/invalid/path',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.message).toBe('Invalid URL path');
    });

    it('should redirect non-bot user agents', async () => {
      const mockUrl = 'https://example.com/game/test-gid';
      const mockGameInfo = {
        title: 'Test Game',
        author: 'Test Author',
        description: 'Test Description',
      };
      
      (gameModel.getGameInfo as Mock).mockResolvedValue(mockGameInfo);
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/link_preview?url=${encodeURIComponent(mockUrl)}`,
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(mockUrl);
    });

    it('should return HTML for bot user agents with game info', async () => {
      const mockUrl = 'https://example.com/game/test-gid';
      const mockGameInfo = {
        title: 'Test Game',
        author: 'Test Author',
        description: 'Test Description',
      };

      (gameModel.getGameInfo as Mock).mockResolvedValue(mockGameInfo);

      const response = await app.inject({
        method: 'GET',
        url: `/api/link_preview?url=${encodeURIComponent(mockUrl)}`,
        headers: {
          'user-agent': 'bot',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Test Game');
      // Author is not in the HTML body (OGP doesn't support it), but should be in oembed link
      expect(response.body).toContain('Test%20Author'); // URL encoded in oembed link
      expect(response.body).toContain('Test Description');
    });

    it('should return HTML for bot user agents with puzzle info', async () => {
      const mockUrl = 'https://example.com/play/test-pid';
      const mockPuzzleInfo = {
        title: 'Test Puzzle',
        author: 'Puzzle Author',
        description: 'Puzzle Description',
      };

      (puzzleModel.getPuzzleInfo as Mock).mockResolvedValue(mockPuzzleInfo);

      const response = await app.inject({
        method: 'GET',
        url: `/api/link_preview?url=${encodeURIComponent(mockUrl)}`,
        headers: {
          'user-agent': 'bot',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('Test Puzzle');
    });

    it('should return 404 when game/puzzle not found', async () => {
      const mockUrl = 'https://example.com/game/nonexistent';
      
      (gameModel.getGameInfo as Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/link_preview?url=${encodeURIComponent(mockUrl)}`,
        headers: {
          'user-agent': 'bot',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(404);
      expect(body.message).toBe('Game or puzzle not found');
    });
  });
});

