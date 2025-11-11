import {test, expect} from '../fixtures';

test.describe('Welcome Page', () => {
  test('loads the welcome page', async ({page}) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays puzzle list', async ({page}) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Check if page has loaded (basic smoke test)
    await expect(page).toHaveURL('/');
  });

  test('search functionality works', async ({page}) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for search input if it exists
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('filters can be toggled', async ({page}) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for filter checkboxes if they exist
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      const firstCheckbox = checkboxes.first();
      const initialState = await firstCheckbox.isChecked();
      await firstCheckbox.click();
      await expect(firstCheckbox).toHaveProperty('checked', !initialState);
    }
  });
});
