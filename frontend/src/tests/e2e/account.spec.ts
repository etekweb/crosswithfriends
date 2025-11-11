import {test, expect} from '../fixtures';

test.describe('Account Page', () => {
  test('loads account page', async ({page}) => {
    await page.goto('/account');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays account interface', async ({page}) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/account');
  });
});
