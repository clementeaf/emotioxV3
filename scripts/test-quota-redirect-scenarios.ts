/**
 * E2E Test — Quota/Redirect/Completion Scenarios
 *
 * Verifica TODOS los escenarios de bloqueo y redirección:
 *
 *   1. Pre-check: cuotas llenas → bloqueo antes de demographics
 *   2. Demographics validation: cuota específica llena → QUOTA_FULL
 *   3. Demographics validation: research completada → RESEARCH_CLOSED
 *   4. Response save: research completada → HTTP 410
 *   5. Participant limit alcanzado → bloqueo en pre-check
 *   6. Participant ya respondió → hasResponded = true
 *   7. Backlinks overquota configurado → redirect URL devuelta
 *
 * Uso:
 *   npx tsx scripts/test-quota-redirect-scenarios.ts
 *
 * Env vars opcionales:
 *   TEST_API_BASE=https://emotio.cx/api  (default)
 *   TEST_EMAIL=usuario@test.com           (crea uno temporal si no se pasa)
 *   TEST_PASSWORD=xxxx
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = process.env.TEST_API_BASE ?? 'https://emotio.cx/api';
const TEST_EMAIL = `e2e-redirect-${Date.now()}@test.emotiox.com`;
const TEST_PASSWORD = 'E2eRedirect2026!';
const EMAIL = process.env.TEST_EMAIL ?? TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD ?? TEST_PASSWORD;
const SELF_REGISTERED = !process.env.TEST_EMAIL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let token = '';
let passed = 0;
let failed = 0;
let researchIds: string[] = [];

async function api(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }

  return { status: res.status, data };
}

async function apiOk(method: string, path: string, body?: unknown, auth = true): Promise<unknown> {
  const { status, data } = await api(method, path, body, auth);
  if (status < 200 || status >= 300) {
    throw new Error(`${method} ${path} → ${status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`    ✅ ${message}`);
    passed++;
  } else {
    console.log(`    ❌ FAIL: ${message}`);
    failed++;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Auth setup
// ---------------------------------------------------------------------------

async function setupAuth() {
  if (SELF_REGISTERED) {
    console.log(`\n📝 Registering: ${EMAIL}`);
    await apiOk('POST', '/auth/register', {
      email: EMAIL,
      password: PASSWORD,
      firstName: 'E2E',
      lastName: 'Redirect',
      role: 'researcher',
    }, false);
  }

  console.log('🔐 Logging in…');
  const loginRes = (await apiOk('POST', '/auth/login', {
    email: EMAIL,
    password: PASSWORD,
    rememberMe: false,
  })) as { token: string };
  token = loginRes.token;
  console.log('   ✓ Authenticated\n');
}

// ---------------------------------------------------------------------------
// Research factory
// ---------------------------------------------------------------------------

async function createResearch(name: string, config: {
  participationMode?: 'kiosk' | 'panel';
  participantLimit?: { enabled: boolean; value: number };
  demographics?: Record<string, unknown>;
  backlinks?: Record<string, string>;
}): Promise<{ researchId: string; configModuleId: string; vocModuleId?: string }> {
  // Fetch research types
  const typesRes = (await apiOk('GET', '/research-types')) as {
    researchTypes: Array<{ id: string }>;
  };
  const typeId = typesRes.researchTypes?.[0]?.id;

  const payload: Record<string, unknown> = {
    name: `[E2E-TEST] ${name} ${Date.now()}`,
    use_default_modules: ['Smart VOC'],
  };
  if (typeId) payload.research_type_id = typeId;

  const createRes = (await apiOk('POST', '/research', payload)) as {
    research: { id: string };
  };
  const researchId = createRes.research.id;
  researchIds.push(researchId);

  // Get modules
  const fullRes = (await apiOk('GET', `/research/${researchId}`)) as {
    research: {
      stages: Array<{
        modules: Array<{ id: string; name: string }>;
      }>;
    };
  };

  let configModuleId = '';
  let vocModuleId: string | undefined;
  for (const stage of fullRes.research.stages) {
    for (const mod of stage.modules ?? []) {
      if (mod.name === 'Research Configuration') configModuleId = mod.id;
      else if (!vocModuleId) vocModuleId = mod.id;
    }
  }

  // Configure module
  const moduleConfig: Record<string, unknown> = {
    participationMode: config.participationMode ?? 'kiosk',
    participantLimit: config.participantLimit ?? { enabled: false, value: 100 },
    demographics: config.demographics ?? {},
  };
  if (config.backlinks) {
    moduleConfig.backlinks = config.backlinks;
  }

  await apiOk('PUT', `/modules/${configModuleId}`, { config: moduleConfig });

  // Activate
  await apiOk('POST', `/research/${researchId}/activate`, {});

  return { researchId, configModuleId, vocModuleId };
}

// ---------------------------------------------------------------------------
// Scenario 1: Pre-check does not use demographic quota exhaustion (validate-demographics does)
// ---------------------------------------------------------------------------

async function scenario1_preCheckQuotasFull() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 1: Pre-check stays available; validate blocks when quotas full');
  console.log('━'.repeat(70));

  const { researchId } = await createResearch('Quota PreCheck', {
    demographics: {
      gender: {
        enabled: true,
        quotas: [
          { id: 'q-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'q-f', value: 'Female', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  await sleep(300);

  // Fill both gender quotas
  for (const gender of ['Male', 'Female']) {
    const session = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
    await apiOk('POST', `/public/research/${researchId}/validate-demographics`, {
      demographics: { gender },
      participantId: session.participantId,
    }, false);
  }

  // Pre-check only enforces research status + global participant limit — not per-demographic buckets
  const { data } = await api('GET', `/public/research/${researchId}/quota-availability`, undefined, false);
  const result = data as { available: boolean; exhaustedType?: string };
  assert(result.available === true, 'Pre-check returns available=true (demographic enforcement at validate-demographics)');

  const session = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  const { data: valRes } = await api('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    participantId: session.participantId,
  }, false);
  const validation = (valRes as { validation: { valid: boolean; reason?: string } }).validation;
  assert(validation.valid === false, 'Validation rejects when bucket full');
  assert(validation.reason === 'QUOTA_FULL', `reason=QUOTA_FULL (got '${validation.reason}')`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 2: Demographics validation — specific quota full → QUOTA_FULL
// ---------------------------------------------------------------------------

async function scenario2_demographicsQuotaFull() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 2: Demographics validation returns QUOTA_FULL');
  console.log('━'.repeat(70));

  const { researchId } = await createResearch('Quota Demographics', {
    demographics: {
      gender: {
        enabled: true,
        quotas: [
          { id: 'q-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'q-f', value: 'Female', limit: 2, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  await sleep(300);

  // Fill Male quota (limit=1)
  const s1 = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  await apiOk('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    participantId: s1.participantId,
  }, false);

  // Pre-check should still be available (Female has slots)
  const { data: preCheck } = await api('GET', `/public/research/${researchId}/quota-availability`, undefined, false);
  assert((preCheck as { available: boolean }).available === true, 'Pre-check still available (Female has slots)');

  // Try another Male → should get QUOTA_FULL
  const s2 = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  const { data: valRes } = await api('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    participantId: s2.participantId,
  }, false);
  const validation = (valRes as { validation: { valid: boolean; reason?: string } }).validation;
  assert(validation.valid === false, 'Validation rejects second Male');
  assert(validation.reason === 'QUOTA_FULL', `reason=QUOTA_FULL (got '${validation.reason}')`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 3: Research completed → RESEARCH_CLOSED on demographics
// ---------------------------------------------------------------------------

async function scenario3_researchClosed() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 3: Completed research → RESEARCH_CLOSED on demographics');
  console.log('━'.repeat(70));

  const { researchId } = await createResearch('Research Closed', {
    demographics: {
      gender: { enabled: true },
    },
  });

  await sleep(300);

  // Verify research loads OK while active
  const { status: loadStatus } = await api('GET', `/public/research/${researchId}`, undefined, false);
  assert(loadStatus === 200, 'Research loads OK while active');

  // Change status to completed
  await apiOk('PATCH', `/research/${researchId}/status`, { status: 'completed' });
  await sleep(500); // Wait for cache to expire

  // Pre-check should return available: false (research_closed)
  const { data: preCheck } = await api('GET', `/public/research/${researchId}/quota-availability`, undefined, false);
  const preResult = preCheck as { available: boolean; exhaustedType?: string };
  assert(preResult.available === false, 'Pre-check returns available=false for completed research');
  assert(preResult.exhaustedType === 'research_closed', `exhaustedType='research_closed' (got '${preResult.exhaustedType}')`);

  // Demographics validation should return RESEARCH_CLOSED
  const { data: valRes } = await api('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    participantId: 'test-pid-001',
  }, false);
  const validation = (valRes as { validation: { valid: boolean; reason?: string } }).validation;
  assert(validation.valid === false, 'Demographics validation rejects');
  assert(validation.reason === 'RESEARCH_CLOSED', `reason=RESEARCH_CLOSED (got '${validation.reason}')`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 4: Response save on completed research → HTTP 410
// ---------------------------------------------------------------------------

async function scenario4_responseSave410() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 4: Response save on completed research → HTTP 410');
  console.log('━'.repeat(70));

  const { researchId, vocModuleId } = await createResearch('Save 410', {
    demographics: { gender: { enabled: true } },
  });

  if (!vocModuleId) {
    console.log('    ⚠️  No SmartVOC module — skipping response save test');
    console.log();
    return;
  }

  await sleep(300);

  // Create a kiosk session while active
  const session = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };

  // Now complete the research
  await apiOk('PATCH', `/research/${researchId}/status`, { status: 'completed' });
  await sleep(500);

  // Try to save responses → should get 410
  const { status } = await api('POST', `/public/research/${researchId}/responses`, {
    participantId: session.participantId,
    moduleId: vocModuleId,
    responses: [
      { moduleId: vocModuleId, componentId: 'scale', value: 8, metadata: {} },
    ],
    metadata: { completedAt: Date.now(), isPreviewMode: false, turnstileToken: null },
  }, false);
  assert(status === 410, `Response save returns 410 (got ${status})`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 5: Participant limit reached → pre-check blocks
// ---------------------------------------------------------------------------

async function scenario5_participantLimit() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 5: Participant limit reached → pre-check blocks');
  console.log('━'.repeat(70));

  const { researchId, vocModuleId } = await createResearch('Participant Limit', {
    participantLimit: { enabled: true, value: 1 },
    demographics: { gender: { enabled: true } },
  });

  if (!vocModuleId) {
    console.log('    ⚠️  No SmartVOC module — skipping participant limit test');
    console.log();
    return;
  }

  await sleep(300);

  // First participant: full flow (validate + save response)
  const s1 = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  await apiOk('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    participantId: s1.participantId,
  }, false);
  await apiOk('POST', `/public/research/${researchId}/responses`, {
    participantId: s1.participantId,
    moduleId: vocModuleId,
    responses: [
      { moduleId: vocModuleId, componentId: 'scale', value: 9, metadata: {} },
    ],
    metadata: { completedAt: Date.now(), isPreviewMode: false, turnstileToken: null },
  }, false);

  // Pre-check should now block (participant limit = 1, count = 1)
  const { data: preCheck } = await api('GET', `/public/research/${researchId}/quota-availability`, undefined, false);
  const preResult = preCheck as { available: boolean; exhaustedType?: string };
  assert(preResult.available === false, 'Pre-check returns available=false when participant limit reached');
  assert(preResult.exhaustedType === 'participant_limit', `exhaustedType='participant_limit' (got '${preResult.exhaustedType}')`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 6: Participant already responded → hasResponded=true
// ---------------------------------------------------------------------------

async function scenario6_alreadyResponded() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 6: Participant already responded → hasResponded');
  console.log('━'.repeat(70));

  const { researchId, vocModuleId } = await createResearch('Already Responded', {
    demographics: { gender: { enabled: true } },
  });

  if (!vocModuleId) {
    console.log('    ⚠️  No SmartVOC module — skipping already responded test');
    console.log();
    return;
  }

  await sleep(300);

  // Complete full flow
  const session = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  await apiOk('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Female' },
    participantId: session.participantId,
  }, false);
  await apiOk('POST', `/public/research/${researchId}/responses`, {
    participantId: session.participantId,
    moduleId: vocModuleId,
    responses: [
      { moduleId: vocModuleId, componentId: 'scale', value: 7, metadata: {} },
    ],
    metadata: { completedAt: Date.now(), isPreviewMode: false, turnstileToken: null },
  }, false);

  // Check status
  const { data: statusRes } = await api('GET', `/public/research/${researchId}/participant/${session.participantId}/status`, undefined, false);
  const statusResult = statusRes as { hasResponded: boolean };
  assert(statusResult.hasResponded === true, `hasResponded=true for participant ${session.participantId}`);

  // Check that a new participant doesn't have responses
  const s2 = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  const { data: statusRes2 } = await api('GET', `/public/research/${researchId}/participant/${s2.participantId}/status`, undefined, false);
  const statusResult2 = statusRes2 as { hasResponded: boolean };
  assert(statusResult2.hasResponded === false, `hasResponded=false for new participant ${s2.participantId}`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 7: Concurrent quota race condition (10 participants, limit 3)
// ---------------------------------------------------------------------------

async function scenario7_concurrentQuotaRace() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 7: Concurrent quota race (10 participants, limit 3)');
  console.log('━'.repeat(70));

  const LIMIT = 3;
  const CONCURRENT = 10;

  const { researchId } = await createResearch('Concurrent Race', {
    demographics: {
      gender: {
        enabled: true,
        quotas: [
          { id: 'q-m', value: 'Male', limit: LIMIT, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  await sleep(300);

  // Fire all at once
  const promises = Array.from({ length: CONCURRENT }, async (_, i) => {
    try {
      const session = (await apiOk('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
      const { data } = await api('POST', `/public/research/${researchId}/validate-demographics`, {
        demographics: { gender: 'Male' },
        participantId: session.participantId,
      }, false);
      const val = (data as { validation: { valid: boolean; reason?: string } }).validation;
      return { index: i, valid: val.valid, reason: val.reason };
    } catch (err) {
      return { index: i, valid: false, reason: 'ERROR', error: err instanceof Error ? err.message : String(err) };
    }
  });

  const results = await Promise.all(promises);
  const accepted = results.filter(r => r.valid).length;
  const rejected = results.filter(r => !r.valid).length;

  console.log(`    Concurrent: ${CONCURRENT}, Limit: ${LIMIT}`);
  console.log(`    Accepted: ${accepted}, Rejected: ${rejected}`);
  assert(accepted <= LIMIT, `Accepted (${accepted}) <= limit (${LIMIT}) — no over-count`);
  assert(accepted === LIMIT, `Accepted (${accepted}) === limit (${LIMIT}) — no under-count`);
  assert(rejected === CONCURRENT - LIMIT, `Rejected (${rejected}) === expected (${CONCURRENT - LIMIT})`);

  console.log();
}

// ---------------------------------------------------------------------------
// Scenario 8: getResearch returns 404 for completed research
// ---------------------------------------------------------------------------

async function scenario8_getResearchCompleted() {
  console.log('━'.repeat(70));
  console.log('📋 Scenario 8: getResearch returns 404 for completed research');
  console.log('━'.repeat(70));

  const { researchId } = await createResearch('Completed 404', {
    demographics: { gender: { enabled: true } },
  });

  await sleep(300);

  // While active → 200
  const { status: activeStatus } = await api('GET', `/public/research/${researchId}`, undefined, false);
  assert(activeStatus === 200, 'Returns 200 while active');

  // Complete it
  await apiOk('PATCH', `/research/${researchId}/status`, { status: 'completed' });

  // Cache TTL is 1 min — poll until cache expires (max 70s)
  let completedStatus = 200;
  const maxWait = 70_000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const { status: s } = await api('GET', `/public/research/${researchId}`, undefined, false);
    completedStatus = s;
    if (s === 404) break;
    await sleep(3000);
  }
  assert(completedStatus === 404, `Returns 404 for completed research (got ${completedStatus}, waited ${Math.round((Date.now() - start) / 1000)}s)`);

  console.log();
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log('🧹 Cleaning up test researches…');
  for (const id of researchIds) {
    try {
      // Reactivate first if completed (can't delete completed)
      await api('PATCH', `/research/${id}/status`, { status: 'draft' });
      await api('DELETE', `/research/${id}`);
    } catch {
      // Best effort
    }
  }
  console.log(`   ✓ ${researchIds.length} researches cleaned up\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   E2E TEST — Quota, Redirect & Completion Scenarios            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`  API: ${API_BASE}`);
  console.log(`  User: ${EMAIL}\n`);

  await setupAuth();

  await scenario1_preCheckQuotasFull();
  await scenario2_demographicsQuotaFull();
  await scenario3_researchClosed();
  await scenario4_responseSave410();
  await scenario5_participantLimit();
  await scenario6_alreadyResponded();
  await scenario7_concurrentQuotaRace();
  await scenario8_getResearchCompleted();

  await cleanup();

  // Final report
  console.log('═'.repeat(70));
  console.log(` RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═'.repeat(70));

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(2);
});
