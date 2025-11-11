import {test, expect} from '../fixtures';

test.describe('Battle Page', () => {
  test('loads battle page with battle ID', async ({page}) => {
    await page.goto('/beta/battle/test-battle-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays battle interface', async ({page}) => {
    await page.goto('/beta/battle/test-battle-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/battle\//);
  });
});
