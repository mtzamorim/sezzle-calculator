import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const operations = [
  { label: 'Addition', operation: 'add', a: '12', b: '8', result: '20' },
  { label: 'Subtraction', operation: 'subtract', a: '12', b: '8', result: '4' },
  { label: 'Multiplication', operation: 'multiply', a: '-3', b: '4', result: '-12' },
  { label: 'Division', operation: 'divide', a: '7', b: '2', result: '3.5' },
  { label: 'Exponentiation', operation: 'power', a: '2', b: '3', result: '8' },
  { label: 'Square root', operation: 'sqrt', a: '81', result: '9' },
  { label: 'Percentage', operation: 'percent', a: '15', b: '200', result: '30' },
]

test.beforeEach(async ({ page }) => { await page.goto('/') })

for (const scenario of operations) {
  test(`${scenario.operation} is computed by the real Go API`, async ({ page }) => {
    await page.getByRole('button', { name: scenario.label, exact: true }).click()
    const fields = page.getByRole('textbox')
    await fields.nth(0).fill(scenario.a)
    if (scenario.b !== undefined) await fields.nth(1).fill(scenario.b)
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/calculate') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Calculate result' }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    const request = response.request().postDataJSON() as Record<string, unknown>
    expect(request.operation).toBe(scenario.operation)
    expect(request.a).toBe(Number(scenario.a))
    if (scenario.b === undefined) expect(request).not.toHaveProperty('b')
    else expect(request.b).toBe(Number(scenario.b))
    expect((await response.json()).result).toBe(Number(scenario.result))
    await expect(page.getByLabel('Calculation result')).toHaveText(scenario.result)
    await expect(page.getByRole('listitem')).toHaveCount(1)
  })
}

test('zero division is stopped by inline validation without sending a request', async ({ page }) => {
  const calls: string[] = []
  page.on('request', (request) => { if (request.url().endsWith('/calculate')) calls.push(request.url()) })
  await page.getByRole('button', { name: 'Division', exact: true }).click()
  await page.getByLabel('First number').fill('10')
  await page.getByLabel('Second number').fill('0')
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByRole('alert')).toContainText('Division by zero')
  await expect(page.getByLabel('Second number')).toBeFocused()
  expect(calls).toHaveLength(0)
})

test('a real backend overflow error can be corrected and retried', async ({ page }) => {
  await page.getByRole('button', { name: 'Multiplication', exact: true }).click()
  await page.getByLabel('First number').fill('1e308')
  await page.getByLabel('Second number').fill('1e308')
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByRole('alert')).toContainText('not a finite real number')
  await page.getByLabel('First number').fill('2')
  await page.getByLabel('Second number').fill('3')
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByLabel('Calculation result')).toHaveText('6')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('network failure is recoverable without reloading the page', async ({ page, context }) => {
  await page.getByLabel('First number').fill('2')
  await page.getByLabel('Second number').fill('3')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to reach')
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByLabel('Calculation result')).toHaveText('5')
})

test('keyboard submission and clearing history keep the current result', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to calculator' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.getByLabel('First number').fill('0.1')
  await page.getByLabel('Second number').fill('0.2')
  await page.getByLabel('Second number').press('Enter')
  await expect(page.getByLabel('Calculation result')).toHaveText('0.3')
  await page.getByRole('button', { name: 'Clear calculation history' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByLabel('Calculation result')).toHaveText('0.3')
})

test('layout fits the viewport and generates a real browser screenshot', async ({ page }, testInfo) => {
  await page.getByLabel('First number').fill('125.5')
  await page.getByLabel('Second number').fill('25')
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByLabel('Calculation result')).toHaveText('150.5')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const bounds = await page.getByLabel('First number').boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.width).toBeGreaterThan(100)
  const image = await page.screenshot({ fullPage: true, path: `../reports/screenshots/${testInfo.project.name}.png` })
  await testInfo.attach('Calculator interface', { body: image, contentType: 'image/png' })
})

test('initial, invalid, and successful states have no automatically detected WCAG A/AA violations', async ({ page }) => {
  const audit = async () => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(results.violations).toEqual([])
  }
  await audit()
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await audit()
  await page.getByLabel('First number').fill('2')
  await page.getByLabel('Second number').fill('3')
  await page.getByRole('button', { name: 'Calculate result' }).click()
  await expect(page.getByLabel('Calculation result')).toHaveText('5')
  await audit()
})
