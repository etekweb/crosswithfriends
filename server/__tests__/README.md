# Backend Tests

This directory contains unit and integration tests for the Fastify backend server using Vitest.

## Test Structure

- `__tests__/api/` - Unit tests for API routes
- `__tests__/integration/` - Integration tests for server setup and error handling
- `__tests__/helpers.ts` - Test utilities for creating Fastify app instances
- `__tests__/setup.ts` - Test configuration and setup

## Running Tests

### Run all backend tests

```bash
yarn run test:backend
```

### Run tests in watch mode

```bash
yarn run test:backend:watch
```

### Run tests with coverage

```bash
yarn run test:backend:coverage
```

## Test Coverage

The tests cover:

### Unit Tests

- **Counters API** (`/api/counters`) - Testing GID and PID increment endpoints
- **Puzzle API** (`/api/puzzle`) - Testing puzzle creation
- **Game API** (`/api/game`) - Testing game creation and retrieval
- **Record Solve API** (`/api/record_solve`) - Testing solve recording
- **Stats API** (`/api/stats`) - Testing puzzle statistics
- **Puzzle List API** (`/api/puzzle_list`) - Testing puzzle listing with filters
- **OEmbed API** (`/api/oembed`) - Testing oEmbed responses
- **Link Preview API** (`/api/link_preview`) - Testing link preview generation

### Integration Tests

- Server setup and initialization
- Error handling and formatting
- CORS configuration
- Route registration
- Request/response format validation

## Writing New Tests

### Unit Test Example

```typescript
import {describe, it, expect, beforeAll, afterAll, beforeEach, vi, type Mock} from 'vitest';
import {buildTestApp, closeApp, waitForApp} from '../helpers';
import type {FastifyInstance} from 'fastify';
import * as modelModule from '../../model/your-model';

// Mock the model
vi.mock('../../model/your-model');

describe('Your API', () => {
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

  it('should handle requests correctly', async () => {
    (modelModule.yourFunction as Mock).mockResolvedValue('result');

    const response = await app.inject({
      method: 'POST',
      url: '/api/your-endpoint',
      payload: {data: 'test'},
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({result: 'result'});
  });
});
```

### Integration Test Example

```typescript
import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {buildTestApp, closeApp, waitForApp} from '../helpers';
import type {FastifyInstance} from 'fastify';

describe('Your Integration Test', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await waitForApp(app);
  });

  afterAll(async () => {
    await closeApp(app);
  });

  it('should test server behavior', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/endpoint',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Best Practices

1. **Mock external dependencies** - Always mock database/model functions in unit tests
2. **Use test helpers** - Use `buildTestApp()` to create test instances
3. **Clean up** - Always close the app in `afterAll`
4. **Clear mocks** - Clear mocks in `beforeEach` to avoid test pollution
5. **Test error cases** - Include tests for error handling and edge cases
6. **Use descriptive test names** - Test names should clearly describe what they test

## Debugging Tests

To debug tests, you can:

1. Use `console.log` in tests (they won't be suppressed if DEBUG is set)
2. Run a single test file: `yarn run test:backend -- path/to/test.test.ts`
3. Use `--verbose` flag: `yarn run test:backend -- --verbose`
