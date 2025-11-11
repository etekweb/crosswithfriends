import {test, expect} from '../fixtures';

test.describe('Compose Page', () => {
  test('loads compose page', async ({page}) => {
    await page.goto('/compose');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays compose interface', async ({page}) => {
    await page.goto('/compose');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/compose');
  });
});
