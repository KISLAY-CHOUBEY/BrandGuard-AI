import { test, expect } from '@playwright/test'

test.describe('BrandGuard AI - Core User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for dashboard title to ensure app is loaded (more reliable than networkidle with lazy loading)
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })
  })

  test('Dashboard loads and displays title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Dashboard')
  })

  test('Navigation to Guidelines page works', async ({ page }) => {
    await page.locator('a[href="/guidelines"]').first().click()
    await page.waitForURL('**/guidelines')
    // Wait for lazy-loaded page to render
    await expect(page.locator('h1')).toHaveText('Brand Guidelines', { timeout: 10000 })
  })

  test('Navigation to Submit page works', async ({ page }) => {
    await page.locator('a[href="/submit"]').first().click()
    await page.waitForURL('**/submit')
    await expect(page.locator('h1')).toHaveText('Submit Content', { timeout: 10000 })
  })

  test('Navigation to Settings page works', async ({ page }) => {
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings')
    await expect(page.locator('h1')).toHaveText('Settings', { timeout: 10000 })
  })

  test('Navigation to Reviews page works', async ({ page }) => {
    await page.locator('a[href="/reviews"]').first().click()
    await page.waitForURL('**/reviews')
    await expect(page.locator('h1')).toHaveText('Reviews', { timeout: 10000 })
  })

  test('Navigation to History page works', async ({ page }) => {
    await page.locator('a[href="/history"]').first().click()
    await page.waitForURL('**/history')
    await expect(page.locator('h1')).toHaveText('History', { timeout: 10000 })
  })

  test('Navigation to Governance page works', async ({ page }) => {
    await page.locator('a[href="/governance"]').first().click()
    await page.waitForURL('**/governance')
    await expect(page.locator('h1')).toHaveText('Governance Insights', { timeout: 10000 })
  })
})

test.describe('BrandGuard AI - Responsive Design', () => {
  test('Mobile viewport shows hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const mobileMenu = page.locator('button[aria-label="Toggle menu"]')
    await expect(mobileMenu).toBeVisible()
  })

  test('Desktop viewport shows full sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside[aria-label="Main navigation"]')
    await expect(sidebar).toBeVisible()
  })
})

test.describe('BrandGuard AI - Mobile Navigation', () => {
  test('Mobile menu opens and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Open mobile menu
    await page.locator('button[aria-label="Toggle menu"]').click()
    await page.waitForTimeout(300)

    // Mobile sidebar should be visible
    const mobileSidebar = page.locator('aside[aria-label="Mobile navigation"]')
    await expect(mobileSidebar).toBeVisible()

    // Click a navigation link in mobile sidebar - wait for it to be visible first
    const guidelinesLink = mobileSidebar.locator('a[href="/guidelines"]').first()
    await expect(guidelinesLink).toBeVisible({ timeout: 5000 })
    await guidelinesLink.click()
    await page.waitForURL('**/guidelines')
    await expect(page.locator('h1')).toHaveText('Brand Guidelines', { timeout: 10000 })
  })
})

test.describe('BrandGuard AI - Settings Functionality', () => {
  test('Test connection button is present', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const testButton = page.locator('button:has-text("Test Connection")')
    await expect(testButton).toBeVisible()
  })

  test('Security notice explains server-side API key configuration', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Check for security notice content
    await expect(page.locator('text=Security & Configuration')).toBeVisible()
    await expect(page.locator('text=How it works')).toBeVisible()
    await expect(page.locator('text=Local Development Setup')).toBeVisible()
    await expect(page.locator('text=Production (Vercel)')).toBeVisible()
    await expect(page.locator('text=.env.local')).toBeVisible()
    await expect(page.locator('text=vercel dev')).toBeVisible()
    await expect(page.locator('text=Vercel Project Settings')).toBeVisible()
  })

  test('Connection status displays', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Connection status should be visible (shows "Not tested" initially)
    await expect(page.locator('text=Not tested')).toBeVisible()
  })
})

test.describe('BrandGuard AI - Core Workflow (mocked Gemini)', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text())
      }
    })
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message)
    })

    // Mock the Gemini API endpoint - use ** to match any origin
    await page.route('**/api/gemini', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          findings: [
            {
              guidelineId: 'g1',
              ruleId: 'r1',
              severity: 'medium',
              location: { start: 0, end: 4, context: 'Test' },
              explanation: 'Test finding: avoid using "test" in production content',
              suggestedCorrection: 'Example',
              guidelineReference: 'Guideline 1: Use clear terminology'
            }
          ],
          overallScore: 85,
          summary: 'Content looks good with minor issues'
        })
      })
    })

    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })
  })

  test('Full workflow: create guideline → submit → review → accept all → approve', async ({ page }) => {
    // Step 1: Create a guideline first (needed for submission)
    await page.locator('a[href="/guidelines"]').first().click()
    await page.waitForURL('**/guidelines')
    await expect(page.locator('h1')).toHaveText('Brand Guidelines', { timeout: 10000 })

    // Click Create Guideline button
    await page.click('button:has-text("Create Guideline"):visible')
    await expect(page.locator('h2:has-text("Create Guideline")')).toBeVisible({ timeout: 5000 })

    // Fill in guideline form (form starts with one empty rule)
    await page.fill('input[placeholder*="Brand Voice"]', 'Test Guideline')
    await page.fill('textarea[placeholder*="Describe what this guideline"]', 'A test guideline for E2E testing')
    await page.selectOption('select:has(option[value="tone"])', 'tone')

    // Fill in the first rule (already present)
    await page.fill('input[placeholder*="Avoid passive"]', 'Avoid test terminology')
    await page.fill('textarea[placeholder*="Explain the rule"]', 'Do not use "test" in production content')
    // Select severity - use the select element directly (not the option)
    await page.selectOption('select:has(option[value="medium"])', 'medium')

    // Save guideline - click the submit button in the modal footer (last Create Guideline button)
    await page.locator('button:has-text("Create Guideline")').last().click()
    // Wait for modal to close and guideline card to appear
    await expect(page.locator('dialog[role="dialog"]')).not.toBeVisible({ timeout: 10000 })
    // Wait for guideline card with "Test Guideline" to appear in the list
    await expect(page.locator('.grid > div:has-text("Test Guideline")').first()).toBeVisible({ timeout: 5000 })
    // Verify guideline is active
    await expect(page.locator('text=Active').first()).toBeVisible({ timeout: 5000 })

    // Step 2: Navigate to Submit page
    await page.locator('a[href="/submit"]').first().click()
    await page.waitForURL('**/submit')
    await expect(page.locator('h1')).toHaveText('Submit Content', { timeout: 10000 })

    // Step 3: Open submission modal - wait for button to be enabled (guidelines loaded)
    await expect(page.locator('button:has-text("New Submission"):not([disabled])')).toBeVisible({ timeout: 10000 })
    await page.click('button:has-text("New Submission")')
    await expect(page.locator('text=Submit Content for Review')).toBeVisible({ timeout: 5000 })

    // Step 4: Fill in submission form in modal
    await page.fill('input[placeholder*="Q4 Marketing"]', 'Test Article')
    await page.fill('textarea[placeholder*="Paste your content"]', 'This is a test article for review.')
    await page.selectOption('select:has(option[value="text"])', 'text')

    // Wait for guidelines to load and select one
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })
    const checkboxes = page.locator('input[type="checkbox"]')
    if (await checkboxes.count() > 0) {
      await checkboxes.first().check()
    }

    // Step 5: Submit content
    await page.click('button:has-text("Submit for Review")')
    await expect(page.locator('text=Submit Content for Review')).not.toBeVisible({ timeout: 5000 })

    // Step 6: Wait for submission to appear and click Review
    await page.waitForSelector('text=Test Article', { timeout: 5000 })
    await page.click('button:has-text("Review"):visible')

    // Wait for review progress indicator to appear
    await expect(page.locator('text=AI Review in Progress')).toBeVisible({ timeout: 10000 })

    // Step 7: Wait for review to complete (AI analysis) - use exact text from progress indicator
    await expect(page.locator('text=Review complete!')).toBeVisible({ timeout: 30000 })

    // Step 8: Navigate to Reviews page and click on the review to open detail modal
    await page.locator('a[href="/reviews"]').first().click()
    await page.waitForURL('**/reviews')
    await expect(page.locator('h1')).toHaveText('Reviews', { timeout: 10000 })
    // Click on the review row link to open the detail modal - use evaluate to trigger onClick without navigation
    await page.evaluate(() => {
      const link = document.querySelector('a[href*="/reviews/"]');
      if (link) {
        // Create a click event that triggers onClick but prevents navigation
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(event);
      }
    })
    // Wait for modal to open
    await expect(page.locator('text=Test Article - Review Details')).toBeVisible({ timeout: 10000 })

    // Step 9: Verify findings are displayed
    await expect(page.locator('text=Test finding')).toBeVisible({ timeout: 10000 })

    // Step 10: Accept all findings
    const acceptAllButton = page.locator('button:has-text("Accept All Findings")')
    await expect(acceptAllButton).toBeVisible({ timeout: 5000 })
    await acceptAllButton.click()

    // Step 11: Approve the review
    const approveButton = page.locator('button:has-text("Approve")')
    await expect(approveButton).toBeVisible({ timeout: 5000 })
    await approveButton.click()

    // Step 12: Verify redirect to dashboard or success state
    await page.waitForURL('**/', { timeout: 10000 })
    await expect(page.locator('h1')).toHaveText('Dashboard')

    // Step 13: Verify submission shows as approved in history
    await page.locator('a[href="/history"]').first().click()
    await page.waitForURL('**/history')
    await expect(page.locator('h1')).toHaveText('History', { timeout: 10000 })
    // Use first() to avoid strict mode violation (multiple elements with same text)
    await expect(page.locator('text=Test Article').first()).toBeVisible({ timeout: 5000 })
    // Status shows as "approved" (lowercase) in the history list
    await expect(page.locator('text=approved').first()).toBeVisible({ timeout: 5000 })
  })
})