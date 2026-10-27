import { test, expect } from '@playwright/test';

test.describe('Vendor Portal & Designer Workflows', () => {
  test('should enforce authentication on vendor routes and redirect to login', async ({ page }) => {
    await page.goto('/vendor/ai-studio');
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
  });

  test('should authenticate as vendor and navigate to AI Studio', async ({ page }) => {
    await page.goto('/login');
    
    // Login as vendor rohan_apex
    await page.locator('input[type="text"]').first().fill('rohan_apex');
    await page.locator('input[type="password"]').first().fill('SecretPassword123!');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();

    // Verify vendor redirection
    await expect(page).toHaveURL(/.*vendor/, { timeout: 10000 });

    // Open AI Studio
    await page.goto('/vendor/ai-studio');
    await expect(page).toHaveURL(/.*vendor\/ai-studio/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load Manual Canvas Designer workspace', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').first().fill('rohan_apex');
    await page.locator('input[type="password"]').first().fill('SecretPassword123!');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();
    await expect(page).toHaveURL(/.*vendor/, { timeout: 10000 });

    // Navigate to designer
    await page.goto('/vendor/designer');
    await expect(page).toHaveURL(/.*vendor\/designer/);
    await expect(page.locator('body')).toBeVisible();
  });
});
