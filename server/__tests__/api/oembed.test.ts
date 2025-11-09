import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, closeApp, waitForApp } from '../helpers';
import type { FastifyInstance } from 'fastify';

describe('OEmbed API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await waitForApp(app);
  });

  afterAll(async () => {
    await closeApp(app);
  });

  describe('GET /api/oembed', () => {
    it('should return oembed response with author', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/oembed?author=Test%20Author',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        type: 'link',
        version: '1.0',
        author_name: 'Test Author',
      });
    });

    it('should handle missing author parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/oembed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('version');
    });
  });
});

