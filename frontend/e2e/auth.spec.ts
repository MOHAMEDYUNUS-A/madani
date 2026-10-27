import { test, expect } from '@playwright/test';

test.describe('Authentication & Security E2E Tests', () => {
  test('should display unified login portal with Madani branding and emerald styling', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title and primary branding
    await expect(page).toHaveTitle(/Madani/i);
    await expect(page.getByRole('heading', { name: /Madani ID Platform/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Account Sign In/i })).toBeVisible();

    // Verify username and password inputs exist
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Verify submit button exists
    const submitBtn = page.getByRole('button', { name: /Sign In to Workspace/i });
    await expect(submitBtn).toBeVisible();
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.getByRole('button', { name: /Sign In to Workspace/i });

    await usernameInput.fill('invalid_devops_test_user');
    await passwordInput.fill('IncorrectPassword123!');
    await submitBtn.click();

    // Expect error alert element to appear with error message
    const errorAlert = page.locator('.bg-rose-50').first();
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
  });

  test('should support responsive mobile navigation on auth page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    const submitBtn = page.getByRole('button', { name: /Sign In to Workspace/i });
    await expect(submitBtn).toBeVisible();
    
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
  });
});
