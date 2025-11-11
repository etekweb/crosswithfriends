import {test, expect} from '../fixtures';

test.describe('Replays Page', () => {
  test('loads replays page', async ({page}) => {
    await page.goto('/replays');
    await expect(page.locator('body')).toBeVisible();
  });

  test('loads replays page with puzzle ID', async ({page}) => {
    await page.goto('/replays/test-puzzle-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays replays interface', async ({page}) => {
    await page.goto('/replays');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/replays/);
  });
});
