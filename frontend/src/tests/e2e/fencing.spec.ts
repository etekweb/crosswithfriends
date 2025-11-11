import {test, expect} from '../fixtures';

test.describe('Fencing Page', () => {
  test('loads fencing page with game ID', async ({page}) => {
    await page.goto('/fencing/test-game-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays fencing interface', async ({page}) => {
    await page.goto('/fencing/test-game-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/fencing\//);
  });
});
