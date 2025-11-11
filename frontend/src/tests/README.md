# Frontend Tests

This directory contains Playwright tests for the frontend application.

## Test Structure

- `components/` - Component unit tests (Playwright Component Testing)
- `e2e/` - End-to-end tests (Playwright E2E Testing)
- `mocks/` - Mock implementations for external dependencies
- `utils.tsx` - Test utilities and helper functions
- `fixtures.ts` - E2E test fixtures
- `setup.ts` - Test setup and global mocks

## Running Tests

### Component Tests

```bash
# Run component tests
yarn test:component

# Run component tests in UI mode
yarn test:component:ui
```

### E2E Tests

```bash
# Run E2E tests
yarn test:e2e

# Run E2E tests in UI mode
yarn test:e2e:ui
```

### All Tests

```bash
# Run both component and E2E tests
yarn test:all
```

## Writing Tests

### Component Tests

Component tests use Playwright Component Testing to test React components in isolation:

```tsx
import {test, expect} from '@playwright/experimental-ct-react';
import MyComponent from '../components/MyComponent';
import {TestWrapper} from '../utils';

test('MyComponent renders', async ({mount}) => {
  const component = await mount(
    <TestWrapper>
      <MyComponent />
    </TestWrapper>
  );

  await expect(component).toBeVisible();
});
```

### E2E Tests

E2E tests use Playwright to test full user flows:

```tsx
import {test, expect} from '../fixtures';

test('user can navigate to game page', async ({page}) => {
  await page.goto('/game/test-id');
  await expect(page).toHaveURL(/\/game\//);
});
```

## Test Utilities

- `TestWrapper` - Provides all necessary context providers (Router, Theme, GlobalContext)
- `RouterWrapper` - Provides React Router context
- `ThemeWrapper` - Provides MUI theme
- `GlobalContextWrapper` - Provides GlobalContext

## Mocks

Mocks are available for:

- Firebase (`mocks/firebase.ts`)
- Socket.IO (`mocks/socket.ts`)
- User store (`mocks/user.ts`)
