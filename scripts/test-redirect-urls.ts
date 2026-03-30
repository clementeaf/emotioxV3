/**
 * Test script: verifies backlink redirect URL construction.
 * Checks that @id is replaced and https:// is prepended when missing.
 *
 * Usage: npx tsx scripts/test-redirect-urls.ts
 */

const API_BASE = 'https://emotio.cx/api';
const RESEARCH_ID = 'c834d757-468d-4ae3-a86c-3f3f887f46eb';
const PARTICIPANT_ID = '69cadc4a-a127-6206-87dd-95786a904f9f';

// ── Redirect logic (mirrors participant-frontend ResearchPage.tsx) ──────────

function buildRedirectUrl(rawUrl: string, participantId: string): string {
  let url = rawUrl.trim();
  // Replace @id placeholder with actual participant ID
  if (participantId) {
    url = url.replace(/@id/gi, encodeURIComponent(participantId));
  }
  // Ensure absolute URL — add https:// if no protocol present
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

// ── Tests ───────────────────────────────────────────────────────────────────

interface TestResult { name: string; pass: boolean; detail: string }
const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string) {
  results.push({ name, pass: condition, detail });
}

async function run() {
  console.log('=== Redirect URL Test Suite ===\n');

  // ── 1. Unit tests: buildRedirectUrl logic ─────────────────────────────────

  console.log('1. Unit tests — buildRedirectUrl\n');

  // 1a. @id replacement
  const withId = buildRedirectUrl(
    'https://samplingfy.com/complete?RID=@id',
    'abc-123',
  );
  assert(
    '@id replaced (with https)',
    withId === 'https://samplingfy.com/complete?RID=abc-123',
    `Got: ${withId}`,
  );

  // 1b. @id replacement case-insensitive
  const withIdUpper = buildRedirectUrl(
    'https://example.com?RID=@ID',
    'abc-123',
  );
  assert(
    '@ID replaced (uppercase)',
    withIdUpper === 'https://example.com?RID=abc-123',
    `Got: ${withIdUpper}`,
  );

  // 1c. Missing protocol
  const noProtocol = buildRedirectUrl(
    'samplingfy.com/#/c/test?RID=@id',
    'abc-123',
  );
  assert(
    'https:// prepended when missing',
    noProtocol === 'https://samplingfy.com/#/c/test?RID=abc-123',
    `Got: ${noProtocol}`,
  );

  // 1d. Already has https
  const hasProtocol = buildRedirectUrl(
    'https://example.com/done?RID=@id',
    'abc-123',
  );
  assert(
    'https:// NOT duplicated',
    hasProtocol === 'https://example.com/done?RID=abc-123',
    `Got: ${hasProtocol}`,
  );

  // 1e. http:// preserved
  const httpUrl = buildRedirectUrl(
    'http://example.com/done?RID=@id',
    'abc-123',
  );
  assert(
    'http:// preserved (not doubled)',
    httpUrl === 'http://example.com/done?RID=abc-123',
    `Got: ${httpUrl}`,
  );

  // 1f. No @id in URL — left unchanged
  const noPlaceholder = buildRedirectUrl(
    'https://example.com/thanks',
    'abc-123',
  );
  assert(
    'URL without @id unchanged',
    noPlaceholder === 'https://example.com/thanks',
    `Got: ${noPlaceholder}`,
  );

  // 1g. Special chars in participant ID are encoded
  const specialId = buildRedirectUrl(
    'https://example.com?RID=@id',
    'id with spaces&more=1',
  );
  assert(
    'Special chars in ID are encoded',
    specialId === 'https://example.com?RID=id%20with%20spaces%26more%3D1',
    `Got: ${specialId}`,
  );

  // ── 2. Integration: fetch real backlinks from API ─────────────────────────

  console.log('2. Integration — fetch backlinks from production API\n');

  try {
    const res = await fetch(`${API_BASE}/public/research/${RESEARCH_ID}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    const payload = await res.json();
    const research = payload.research ?? payload;

    // Find Research Configuration module
    let backlinks: Record<string, string> | null = null;
    for (const stage of research.stages || []) {
      for (const mod of stage.modules || []) {
        if (mod.name === 'Research Configuration' && mod.config?.backlinks) {
          backlinks = mod.config.backlinks;
        }
      }
    }

    assert(
      'Backlinks found in research config',
      backlinks !== null && Object.keys(backlinks).length > 0,
      backlinks ? `Keys: ${Object.keys(backlinks).join(', ')}` : 'No backlinks found',
    );

    if (backlinks) {
      for (const [key, rawUrl] of Object.entries(backlinks)) {
        if (!rawUrl || rawUrl.trim().length === 0) continue;

        const finalUrl = buildRedirectUrl(rawUrl, PARTICIPANT_ID);

        // Verify @id is gone
        assert(
          `[${key}] @id replaced`,
          !finalUrl.includes('@id') && !finalUrl.includes('@ID'),
          `Final: ${finalUrl}`,
        );

        // Verify has protocol
        assert(
          `[${key}] has https://`,
          /^https?:\/\//i.test(finalUrl),
          `Final: ${finalUrl}`,
        );

        // Verify participant ID present
        assert(
          `[${key}] contains participant ID`,
          finalUrl.includes(PARTICIPANT_ID),
          `Final: ${finalUrl}`,
        );

        // Verify the URL is reachable (HEAD request)
        try {
          const check = await fetch(finalUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'EmotioX-RedirectTest/1.0' },
          });
          assert(
            `[${key}] URL reachable (HTTP ${check.status})`,
            check.status >= 200 && check.status < 400,
            `Status: ${check.status} — ${finalUrl}`,
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          assert(`[${key}] URL reachable`, false, `Fetch error: ${msg}`);
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert('API fetch', false, `Error: ${msg}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n=== Results ===\n');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    if (!r.pass) console.log(`   ${r.detail}`);
    r.pass ? passed++ : failed++;
  }
  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests.`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
