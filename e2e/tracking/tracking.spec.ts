/**
 * E2E Tests: Website Tracking Pipeline
 *
 * Tests the full flow: tracking script on a real page → captures clicks/scroll →
 * sends to mock API → verifies events arrive correctly.
 *
 * Uses a local mock server (no external dependencies).
 */

import { test, expect } from '@playwright/test';
import { createMockServer } from './mock-server';

const PORT = 4567;
let server: ReturnType<typeof createMockServer>;

test.beforeAll(async () => {
    server = createMockServer(PORT);
    await server.start();
});

test.afterAll(async () => {
    await server.stop();
});

test.beforeEach(async () => {
    await fetch(`${server.url}/__reset`, { method: 'POST' });
});

// Helper: wait for flush + small buffer
const waitForFlush = (ms = 1500) => new Promise((r) => setTimeout(r, ms));

// Helper: get verification data
const getVerify = async () => {
    const res = await fetch(`${server.url}/__verify`);
    return res.json();
};

// ─── Tests ───────────────────────────────────────────────────────────

test.describe('Tracking Script E2E', () => {

    test('creates a session on page load', async ({ page }) => {
        await page.goto(server.url);
        await waitForFlush();

        const data = await getVerify();
        expect(data.summary.sessionCount).toBe(1);
        expect(data.sessions[0].pageUrl).toContain('localhost');
        expect(data.sessions[0].pageTitle).toBe('Tracking E2E Test Page');
        expect(data.sessions[0].viewportWidth).toBeGreaterThan(0);
    });

    test('sends pageview event automatically', async ({ page }) => {
        await page.goto(server.url);
        await waitForFlush();

        const data = await getVerify();
        expect(data.summary.pageviewCount).toBe(1);
    });

    test('captures click events with coordinates', async ({ page }) => {
        await page.goto(server.url);

        // Click the CTA button
        await page.click('#cta-button');
        await waitForFlush();

        const data = await getVerify();
        const clicks = data.events.filter((e: { eventType: string }) => e.eventType === 'click');

        expect(clicks.length).toBeGreaterThanOrEqual(1);

        const ctaClick = clicks.find((c: { targetSelector: string }) =>
            c.targetSelector?.includes('cta-button') || c.targetSelector?.includes('cta')
        );
        expect(ctaClick).toBeDefined();
        expect(ctaClick.x).toBeGreaterThan(0);
        expect(ctaClick.y).toBeGreaterThan(0);
    });

    test('captures multiple clicks on different elements', async ({ page }) => {
        await page.goto(server.url);

        await page.click('#nav-home');
        await page.click('#nav-pricing');
        await page.click('#cta-button');
        await page.click('#feature-1');
        await waitForFlush();

        const data = await getVerify();
        const clicks = data.events.filter((e: { eventType: string }) => e.eventType === 'click');

        expect(clicks.length).toBeGreaterThanOrEqual(4);
    });

    test('captures click target text', async ({ page }) => {
        await page.goto(server.url);

        await page.click('#cta-button');
        await waitForFlush();

        const data = await getVerify();
        const clicks = data.events.filter((e: { eventType: string }) => e.eventType === 'click');
        const ctaClick = clicks.find((c: { targetText: string }) =>
            c.targetText?.includes('Get Started')
        );

        expect(ctaClick).toBeDefined();
    });

    test('captures scroll events', async ({ page }) => {
        await page.goto(server.url);

        // Scroll down the page
        await page.evaluate(() => window.scrollTo(0, 500));
        await waitForFlush();

        const data = await getVerify();
        const scrolls = data.events.filter((e: { eventType: string }) => e.eventType === 'scroll');

        expect(scrolls.length).toBeGreaterThanOrEqual(1);
        expect(scrolls[0].scrollY).toBeGreaterThan(0);
    });

    test('records scroll depth percentage', async ({ page }) => {
        await page.goto(server.url);

        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await waitForFlush();

        const data = await getVerify();
        const scrolls = data.events.filter((e: { eventType: string }) => e.eventType === 'scroll');

        expect(scrolls.length).toBeGreaterThanOrEqual(1);
        const lastScroll = scrolls[scrolls.length - 1];
        expect(lastScroll.scrollDepthPct).toBeGreaterThan(50);
    });

    test('batches events in single flush', async ({ page }) => {
        await page.goto(server.url);

        // Rapid clicks (should be batched)
        await page.click('#nav-home');
        await page.click('#nav-about');
        await page.click('#nav-pricing');
        await page.click('#nav-contact');
        await page.click('#cta-button');
        await waitForFlush();

        const data = await getVerify();
        // pageview + 5 clicks = at least 6 events
        expect(data.summary.eventCount).toBeGreaterThanOrEqual(6);
    });

    test('preserves visitor ID across page reloads', async ({ page }) => {
        await page.goto(server.url);
        await waitForFlush();

        const data1 = await getVerify();
        const vid1 = data1.sessions[0].visitorId;

        // Reset events but don't clear localStorage
        await fetch(`${server.url}/__reset`, { method: 'POST' });

        // Reload
        await page.reload();
        await waitForFlush();

        const data2 = await getVerify();
        const vid2 = data2.sessions[0].visitorId;

        expect(vid1).toBe(vid2);
    });

    test('creates new session on reload', async ({ page }) => {
        await page.goto(server.url);
        await waitForFlush();

        await page.reload();
        await waitForFlush();

        const data = await getVerify();
        expect(data.summary.sessionCount).toBe(2);
    });

    test('events have valid timestamps', async ({ page }) => {
        const beforeMs = Date.now();
        await page.goto(server.url);
        await page.click('#cta-button');
        await waitForFlush();
        const afterMs = Date.now();

        const data = await getVerify();
        const clicks = data.events.filter((e: { eventType: string }) => e.eventType === 'click');

        for (const click of clicks) {
            expect(click.timestampMs).toBeGreaterThanOrEqual(beforeMs - 1000);
            expect(click.timestampMs).toBeLessThanOrEqual(afterMs + 1000);
        }
    });

    test('captures CSS selector for clicked elements', async ({ page }) => {
        await page.goto(server.url);

        await page.click('#nav-pricing');
        await waitForFlush();

        const data = await getVerify();
        const clicks = data.events.filter((e: { eventType: string }) => e.eventType === 'click');
        const navClick = clicks.find((c: { targetSelector: string }) =>
            c.targetSelector?.includes('nav-pricing')
        );

        expect(navClick).toBeDefined();
        expect(navClick.targetSelector).toContain('a#nav-pricing');
    });

    test('full user journey: navigate, read, click CTA', async ({ page }) => {
        await page.goto(server.url);

        // User reads nav
        await page.click('#nav-about');

        // Scrolls through content
        await page.evaluate(() => window.scrollTo(0, 300));
        await page.waitForTimeout(200);
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForTimeout(200);

        // Clicks CTA
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        await page.click('#cta-button');

        await waitForFlush();

        const data = await getVerify();

        expect(data.summary.sessionCount).toBe(1);
        expect(data.summary.pageviewCount).toBe(1);
        expect(data.summary.clickCount).toBeGreaterThanOrEqual(2);
        expect(data.summary.scrollCount).toBeGreaterThanOrEqual(1);
        expect(data.summary.eventCount).toBeGreaterThanOrEqual(4);
    });
});
