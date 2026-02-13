import { test, expect } from '@playwright/test'
import jwt from 'jsonwebtoken'

// Magic link tokens use MAGIC_LINK_SECRET (not JWT_SECRET)
const MAGIC_LINK_SECRET = process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production'

// Helper: generate a test magic-link token
function createTestToken(slideId: string, caseId: string | null, patientData?: any): string {
  return jwt.sign(
    {
      sub: 'magic-link',
      slideId,
      caseId,
      purpose: 'viewer',
      ...(patientData ? { patientData } : {}),
    },
    MAGIC_LINK_SECRET,
    { expiresIn: '1h' },
  )
}

test.describe('Viewer via Magic Link', () => {
  test('magic link bypasses auth and loads viewer page', async ({ page }) => {
    const slideId = 'e2e-test-slide-001'
    const token = createTestToken(slideId, 'pathoweb-ap26000299', {
      patientName: 'João Silva',
      patientId: 'AP26000299',
      age: '65',
      doctor: 'Dr. Santos',
    })

    await page.goto(`/viewer?slideId=${slideId}&t=${token}`)

    // The viewer page should load (not redirect to login)
    await page.waitForSelector('.viewer-page', { timeout: 15000 })

    // Verify we're on the viewer page, not redirected to auth
    expect(page.url()).toContain('/viewer')

    // The page should show the empty state since the slide doesn't exist in cloud DB
    // (edge slides not synced to cloud in this test env)
    const emptyState = page.locator('.empty-state')
    await expect(emptyState).toBeVisible({ timeout: 10000 })

    // Verify the empty state message
    await expect(page.getByText('Nenhuma lâmina disponível')).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test('lists cases with patient info after login', async ({ page }) => {
    // This test requires a logged-in session with real data
    // Skip if no auth cookie/token is available
    const loginToken = process.env.E2E_AUTH_TOKEN
    if (!loginToken) {
      test.skip()
      return
    }

    // Set auth in localStorage
    await page.goto('/')
    await page.evaluate((token) => {
      localStorage.setItem('supernavi_token', token)
    }, loginToken)

    await page.goto('/')
    await page.waitForSelector('[data-testid="case-list"], .case-list, .v-data-table', { timeout: 10000 })

    // Should show at least one case
    const caseRows = page.locator('.case-row, .v-data-table tbody tr, [data-testid="case-row"]')
    const count = await caseRows.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Info Panel Layout', () => {
  test('viewer layout renders Vuetify components correctly', async ({ page }) => {
    const slideId = 'e2e-test-slide-002'
    const token = createTestToken(slideId, null, {
      patientName: 'Maria Santos',
      age: '50',
      doctor: 'Dr. Lima',
    })

    await page.goto(`/viewer?slideId=${slideId}&t=${token}`)
    await page.waitForSelector('.viewer-page', { timeout: 15000 })

    // Verify Vuetify framework loaded (v-main renders with viewer-main class)
    const viewerMain = page.locator('.viewer-main')
    await expect(viewerMain).toBeVisible({ timeout: 5000 })

    // Verify the Vuetify app wrapper is present (framework bootstrap check)
    const vApp = page.locator('.v-application')
    await expect(vApp.first()).toBeVisible()

    // Verify the page uses the viewer layout (has toolbar or status bar elements)
    // The empty state should be visible since slide doesn't exist
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 })
  })
})
