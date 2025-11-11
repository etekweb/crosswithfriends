import {test, expect} from '../fixtures';

test.describe('Replay Page', () => {
  test('loads replay page with game ID', async ({page}) => {
    await page.goto('/replay/test-game-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays replay interface', async ({page}) => {
    await page.goto('/replay/test-game-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/replay\//);
  });
});
