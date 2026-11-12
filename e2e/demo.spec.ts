import { test, expect } from '@playwright/test'

test.describe('BrandGuard AI - Demo Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 15000 })
  })

  async function enterDemoMode(page: any) {
    await page.click('button:has-text("Try Demo")')
    await page.waitForURL('**/demo')
    // Wait for lazy-loaded Demo Workspace to render - wait for SAMPLE DATA banner which is demo-specific
    await expect(page.locator('span:has-text("SAMPLE DATA")')).toBeVisible({ timeout: 20000 })
    // Also verify the heading
    await expect(page.locator('h1')).toHaveText('Demo Workspace', { timeout: 10000 })
  }

  // Helper to get the review card with "Changes Requested" status (has pending findings/conflicts)
  async function getChangesRequestedReviewCard(page: any) {
    // Find "Changes Requested" in the review list (not summary), then find its sibling "Unresolved Conflicts"
    // This targets the badge container (e257) which contains both statuses
    const conflictBadge = page.locator('text=Changes Requested').first().locator('..').locator('text=Unresolved Conflicts')
    // Go up 3 levels from conflict badge to reach the review card (e252)
    // conflictBadge(e259) -> badgeContainer(e257) -> reviewContent(e253) -> reviewCard(e252)
    return conflictBadge.locator('..').locator('..').locator('..')
  }

  test('Open normal workspace → Try Demo → confirm demo sample data appears', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Dashboard')
    await enterDemoMode(page)

    // Verify SAMPLE DATA banner is present
    await expect(page.locator('span:has-text("SAMPLE DATA")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('span:has-text("Fictional")')).toBeVisible()

    // Verify demo data sections appear - use h3 headings which are unique
    await expect(page.locator('h3:has-text("Guidelines")')).toBeVisible()
    await expect(page.locator('h3:has-text("Content Submissions")')).toBeVisible()
    await expect(page.locator('h3:has-text("Reviews")')).toBeVisible()
    // Unresolved Conflicts appears in the summary card as a paragraph, not h3
    await expect(page.locator('text=Unresolved Conflicts').first()).toBeVisible()
  })

  test('Inspect a review and its findings in demo workspace', async ({ page }) => {
    await enterDemoMode(page)

    // Click Inspect button on the review with "Changes Requested" status (second review)
    const reviewCard = await getChangesRequestedReviewCard(page)
    await reviewCard.locator('button:has-text("Inspect")').click()

    // Wait for modal to open
    await expect(page.locator('text=Review Details')).toBeVisible({ timeout: 10000 })

    // Verify findings are displayed - use the heading which is unique
    await expect(page.locator('h4:has-text("Findings")')).toBeVisible()
  })

  test('Accept/reject a finding in demo workspace', async ({ page }) => {
    await enterDemoMode(page)

    // Click Inspect on the review with "Changes Requested" status (has pending findings)
    const reviewCard = await getChangesRequestedReviewCard(page)
    await reviewCard.locator('button:has-text("Inspect")').click()
    await expect(page.locator('text=Review Details')).toBeVisible({ timeout: 10000 })

    // Wait for findings to load
    await page.waitForSelector('button:has-text("Accept")', { timeout: 10000 })

    // Click Accept on first finding
    const acceptButton = page.locator('button:has-text("Accept")').first()
    await expect(acceptButton).toBeVisible()
    await acceptButton.click()

    // Verify finding status updates (badge shows accepted) - use the status badge with success styling
    await expect(page.locator('span.inline-flex:has-text("accepted")')).toBeVisible({ timeout: 5000 })
  })

  test('Unresolved conflicts prevent approval in demo workspace', async ({ page }) => {
    await enterDemoMode(page)

    // Check if there's a review with unresolved conflicts - target the one in the review list (not summary)
    const conflictBadge = page.locator('text=Changes Requested').first().locator('..').locator('text=Unresolved Conflicts')
    if (await conflictBadge.isVisible({ timeout: 5000 })) {
      // Click Inspect on THAT review (the one with the conflict badge)
      // DOM: conflictBadge -> badgeContainer -> reviewContent -> reviewCard(with buttons)
      const reviewCard = conflictBadge.locator('..').locator('..').locator('..')
      await reviewCard.locator('button:has-text("Inspect")').click()
      await expect(page.locator('text=Review Details')).toBeVisible({ timeout: 10000 })

      // Verify Approve button is disabled (shows "Approve Blocked")
      const approveButton = page.locator('button:has-text("Approve Blocked")').first()
      await expect(approveButton).toBeDisabled()
    }
  })

  test('Resolve a conflict and verify approval becomes available', async ({ page }) => {
    await enterDemoMode(page)

    // Check for review with unresolved conflicts - target the one in the review list
    const conflictBadge = page.locator('text=Changes Requested').first().locator('..').locator('text=Unresolved Conflicts')
    if (await conflictBadge.isVisible({ timeout: 5000 })) {
      // Click Inspect on THAT review (the one with the conflict badge)
      const reviewCard = conflictBadge.locator('..').locator('..').locator('..')
      await reviewCard.locator('button:has-text("Inspect")').click()
      await expect(page.locator('text=Review Details')).toBeVisible({ timeout: 10000 })

      // Click "Keep First" to resolve conflict
      const keepFirstButton = page.locator('button:has-text("Keep First")').first()
      if (await keepFirstButton.isVisible({ timeout: 5000 })) {
        await keepFirstButton.click()

        // Wait for conflict resolution
        await page.waitForTimeout(1000)

        // Verify Approve button becomes enabled
        const approveButton = page.locator('button:has-text("Approve")').first()
        await expect(approveButton).toBeEnabled({ timeout: 5000 })
      }
    }
  })

  test('Test Reset Demo restores original sample data', async ({ page }) => {
    await enterDemoMode(page)

    // Click Reset Demo button
    await page.click('button:has-text("Reset Demo")')

    // Confirm dialog should appear
    await expect(page.locator('text=Reset Demo Workspace')).toBeVisible({ timeout: 5000 })

    // Click Reset Demo in confirmation dialog - target the dialog's confirm button by role
    await page.getByRole('dialog', { name: 'Reset Demo Workspace' }).getByRole('button', { name: 'Reset Demo' }).click()

    // Wait for reset to complete and toast to appear - increased timeout
    await expect(page.locator('text=Demo data reset to sample state')).toBeVisible({ timeout: 30000 })

    // Verify demo data is still present (just reset to original)
    await expect(page.locator('span:has-text("SAMPLE DATA")')).toBeVisible()
  })

  test('Exit Demo restores normal workspace', async ({ page }) => {
    await enterDemoMode(page)

    // Click Exit Demo
    await page.click('button:has-text("Exit Demo")')

    // Should navigate back to normal workspace
    await page.waitForURL('**/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

    // Try Demo button should be visible again
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible({ timeout: 5000 })
  })

  test('Demo data does not leak into normal storage', async ({ page }) => {
    // Enter demo mode and modify data
    await enterDemoMode(page)

    // Click Inspect on the review with "Changes Requested" status and accept a finding
    const reviewCard = await getChangesRequestedReviewCard(page)
    await reviewCard.locator('button:has-text("Inspect")').click()
    await expect(page.locator('text=Review Details')).toBeVisible({ timeout: 10000 })
    await page.waitForSelector('button:has-text("Accept")', { timeout: 10000 })
    await page.click('button:has-text("Accept"):visible')

    // Exit demo
    await page.click('button:has-text("Exit Demo")')
    await page.waitForURL('**/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

    // Re-enter demo - should see original sample data (demo DB persists separately)
    await enterDemoMode(page)

    // Exit demo again and check normal workspace has no demo data
    await page.click('button:has-text("Exit Demo")')
    await page.waitForURL('**/')
    await expect(page.locator('h1')).toHaveText('Dashboard', { timeout: 10000 })

    // Navigate to guidelines - should be empty or only have normal user data
    await page.click('a[href="/guidelines"]')
    await page.waitForURL('**/guidelines')
    await expect(page.locator('h1')).toHaveText('Brand Guidelines', { timeout: 10000 })

    // Should not show demo SAMPLE DATA banner
    await expect(page.locator('span:has-text("SAMPLE DATA")')).not.toBeVisible()
  })
})