import {test, expect} from '../fixtures';

test.describe('Composition Page', () => {
  test('loads composition page with composition ID', async ({page}) => {
    await page.goto('/composition/test-composition-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays composition interface', async ({page}) => {
    await page.goto('/composition/test-composition-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/composition\//);
  });
});
