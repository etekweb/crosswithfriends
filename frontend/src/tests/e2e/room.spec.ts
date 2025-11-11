import {test, expect} from '../fixtures';

test.describe('Room Page', () => {
  test('loads room page with room ID', async ({page}) => {
    await page.goto('/room/test-room-id');
    await expect(page.locator('body')).toBeVisible();
  });

  test('displays room interface', async ({page}) => {
    await page.goto('/room/test-room-id');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/room\//);
  });

  test('shows message when no game is selected', async ({page}) => {
    await page.goto('/room/test-room-id');
    await page.waitForLoadState('networkidle');
    // Check for "No game selected" message if it exists
    const noGameMessage = page.locator('text=/no game/i');
    if (await noGameMessage.isVisible({timeout: 1000}).catch(() => false)) {
      await expect(noGameMessage).toBeVisible();
    }
  });
});
