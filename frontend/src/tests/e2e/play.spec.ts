import {test, expect} from '../fixtures';

test.describe('Play Page', () => {
  test('loads play page with puzzle ID', async ({page}) => {
    await page.goto('/beta/play/test-puzzle-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays play interface', async ({page}) => {
    await page.goto('/beta/play/test-puzzle-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/play\//);
  });
});
