/**
 * E2E test fixtures
 */
import {test as base} from '@playwright/test';
import {createMockSocket} from './mocks/socket';
import type {MockSocket} from './mocks/socket';

type TestFixtures = {
  mockSocket: MockSocket;
};

export const test = base.extend<TestFixtures>({
  mockSocket: async ({}, use) => {
    const socket = createMockSocket();
    await use(socket);
  },
});

export {expect} from '@playwright/test';
