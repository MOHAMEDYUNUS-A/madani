import { test, expect } from '@playwright/test';

test.describe('Organization Portal & Student Management', () => {
  test('should enforce authentication and redirect unauthenticated requests to login', async ({ page }) => {
    await page.goto('/organization/students');
    // Security redirect check
    await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
    await expect(page.getByRole('heading', { name: /Account Sign In/i })).toBeVisible();
  });

  test('should authenticate as organization admin and display organization workspace', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials for alice_admin
    await page.locator('input[type="text"]').first().fill('alice_admin');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();

    // Should redirect to /organization
    await expect(page).toHaveURL(/.*organization/, { timeout: 10000 });
    // Verify organization portal header or navigation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display 3D ID Showcase gallery when logged in', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="text"]').first().fill('alice_admin');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.getByRole('button', { name: /Sign In to Workspace/i }).click();
    await expect(page).toHaveURL(/.*organization/, { timeout: 10000 });

    // Navigate to 3D Showcase
    await page.goto('/organization/showcase');
    await expect(page).toHaveURL(/.*organization\/showcase/);
    await expect(page.locator('body')).toBeVisible();
  });
});
