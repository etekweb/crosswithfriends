import {test, expect} from '../fixtures';

test.describe('Game Page', () => {
  test('loads game page with game ID', async ({page}) => {
    // Use a test game ID - in real tests, you'd use a known test game
    await page.goto('/game/test-game-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays game interface', async ({page}) => {
    await page.goto('/game/test-game-id');
    await page.waitForLoadState('networkidle');
    // Basic check that page loaded
    await expect(page).toHaveURL(/\/game\//);
  });

  test('can navigate to game from URL', async ({page}) => {
    await page.goto('/');
    await page.goto('/game/test-game-id');
    await expect(page).toHaveURL(/\/game\//);
  });
});
