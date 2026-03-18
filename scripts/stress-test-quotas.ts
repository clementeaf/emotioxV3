/**
 * Stress-test E2E para cuotas atómicas (tryIncrementQuota).
 *
 * Crea una investigación kiosk con cuotas demográficas,
 * lanza participantes concurrentes, y verifica que nunca se excede el límite.
 *
 * Uso:
 *   STRESS_TEST_EMAIL=x STRESS_TEST_PASSWORD=y npx tsx scripts/stress-test-quotas.ts
 *
 * O con valores hardcoded para dev (ver constantes abajo).
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.STRESS_TEST_API_BASE ?? 'https://emotio.cx/api';

const TEST_EMAIL = `stress-test-${Date.now()}@test.emotiox.com`;
const TEST_PASSWORD = 'StressTest2026!';

const EMAIL =
  process.env.STRESS_TEST_EMAIL ?? TEST_EMAIL;
const PASSWORD =
  process.env.STRESS_TEST_PASSWORD ?? TEST_PASSWORD;
const SELF_REGISTERED = !process.env.STRESS_TEST_EMAIL;

// Quota config
const GENDER_QUOTAS = [
  { id: 'q-male', value: 'Male', limit: 3, enabled: true, enforcementMode: 'immediate' as const },
  { id: 'q-female', value: 'Female', limit: 3, enabled: true, enforcementMode: 'immediate' as const },
];

const AGE_QUOTAS = [
  { id: 'q-18-25', value: '18-25', limit: 2, enabled: true, enforcementMode: 'immediate' as const },
  { id: 'q-26-35', value: '26-35', limit: 2, enabled: true, enforcementMode: 'immediate' as const },
  { id: 'q-36-50', value: '36-50', limit: 2, enabled: true, enforcementMode: 'immediate' as const },
];

// Participants to simulate — designed to overflow each bucket
interface SimulatedParticipant {
  label: string;
  demographics: { gender: string; age: string };
}

const PARTICIPANTS: SimulatedParticipant[] = [
  // 5 Male (limit 3 → expect 2 rejected)
  { label: 'M1', demographics: { gender: 'Male', age: '22' } },
  { label: 'M2', demographics: { gender: 'Male', age: '30' } },
  { label: 'M3', demographics: { gender: 'Male', age: '40' } },
  { label: 'M4', demographics: { gender: 'Male', age: '20' } },
  { label: 'M5', demographics: { gender: 'Male', age: '28' } },
  // 5 Female (limit 3 → expect 2 rejected)
  { label: 'F1', demographics: { gender: 'Female', age: '24' } },
  { label: 'F2', demographics: { gender: 'Female', age: '33' } },
  { label: 'F3', demographics: { gender: 'Female', age: '45' } },
  { label: 'F4', demographics: { gender: 'Female', age: '19' } },
  { label: 'F5', demographics: { gender: 'Female', age: '27' } },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let token = '';

async function api(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Step 1 — Setup
// ---------------------------------------------------------------------------

async function setup() {
  // 1a. Register (if self-registered) + Login
  if (SELF_REGISTERED) {
    console.log(`\n📝 Registering test user: ${EMAIL}`);
    await api('POST', '/auth/register', {
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Stress',
      lastName: 'Test',
      role: 'researcher',
    }, false);
    console.log('   ✓ Registered');
  }

  console.log('\n🔐 Logging in…');
  const loginRes = (await api('POST', '/auth/login', {
    email: EMAIL,
    password: PASSWORD,
    rememberMe: false,
  })) as { token: string };
  token = loginRes.token;
  console.log('   ✓ Logged in');

  // 1b. Fetch research types to pick one that has Smart VOC
  console.log('\n📋 Fetching research types…');
  const typesRes = (await api('GET', '/research-types')) as {
    researchTypes: Array<{ id: string; name: string; default_modules: unknown }>;
  };

  // Pick "interest" which is the first seeded type — or any available type
  let researchTypeId: string | undefined;
  for (const rt of typesRes.researchTypes ?? []) {
    researchTypeId = rt.id;
    break; // use first available
  }

  // 1c. Create research
  console.log('\n🔬 Creating research…');
  const createPayload: Record<string, unknown> = {
    name: `[STRESS-TEST] Quota Enforcement ${new Date().toISOString().slice(0, 16)}`,
    use_default_modules: ['Smart VOC'],
  };
  if (researchTypeId) createPayload.research_type_id = researchTypeId;

  const createRes = (await api('POST', '/research', createPayload)) as {
    research: { id: string; name: string; status: string };
  };
  const researchId = createRes.research.id;
  console.log(`   ✓ Research created: ${researchId}`);

  // 1d. Get full research to find modules
  console.log('\n📦 Fetching research structure…');
  const fullRes = (await api('GET', `/research/${researchId}`)) as {
    research: {
      id: string;
      stages: Array<{
        id: string;
        name: string;
        modules: Array<{
          id: string;
          name: string;
          config: Record<string, unknown>;
        }>;
      }>;
    };
  };

  let configModuleId: string | undefined;
  let smartVocModuleId: string | undefined;

  for (const stage of fullRes.research.stages) {
    for (const mod of stage.modules ?? []) {
      if (mod.name === 'Research Configuration') {
        configModuleId = mod.id;
      }
      // Smart VOC modules have component structure — pick the first one for responses
      if (
        mod.name !== 'Research Configuration' &&
        !smartVocModuleId
      ) {
        smartVocModuleId = mod.id;
      }
    }
  }

  if (!configModuleId) {
    throw new Error('Research Configuration module not found');
  }
  console.log(`   ✓ Config module: ${configModuleId}`);
  console.log(`   ✓ SmartVOC module: ${smartVocModuleId ?? '(none — responses will be skipped)'}`);

  // 1e. Configure demographics + quotas + kiosk mode
  console.log('\n⚙️  Configuring demographics & quotas…');
  await api('PUT', `/modules/${configModuleId}`, {
    config: {
      participationMode: 'kiosk',
      participantLimit: { enabled: false, value: 100 },
      demographics: {
        gender: {
          enabled: true,
          quotas: GENDER_QUOTAS,
        },
        age: {
          enabled: true,
          min: 18,
          max: 65,
          quotas: AGE_QUOTAS,
        },
      },
    },
  });
  console.log('   ✓ Demographics & quotas configured');

  // 1f. Activate research
  console.log('\n🚀 Activating research…');
  await api('POST', `/research/${researchId}/activate`, {});
  console.log('   ✓ Research activated');

  return { researchId, smartVocModuleId };
}

// ---------------------------------------------------------------------------
// Step 2 — Simulate participants concurrently
// ---------------------------------------------------------------------------

interface ParticipantResult {
  label: string;
  demographics: { gender: string; age: string };
  participantId: string | null;
  validationResult: 'VALID' | 'QUOTA_FULL' | 'DISQUALIFIED' | 'ERROR';
  validationDetail: string;
  responsesSaved: boolean;
}

async function simulateParticipant(
  researchId: string,
  smartVocModuleId: string | undefined,
  participant: SimulatedParticipant,
): Promise<ParticipantResult> {
  const result: ParticipantResult = {
    label: participant.label,
    demographics: participant.demographics,
    participantId: null,
    validationResult: 'ERROR',
    validationDetail: '',
    responsesSaved: false,
  };

  try {
    // 2a. Get kiosk session
    const sessionRes = (await api(
      'POST',
      `/public/research/${researchId}/kiosk/session`,
      {},
      false,
    )) as { participantId: string };
    result.participantId = sessionRes.participantId;

    // 2b. Validate demographics (atomic quota increment)
    const validateRes = (await api(
      'POST',
      `/public/research/${researchId}/validate-demographics`,
      {
        demographics: participant.demographics,
        participantId: sessionRes.participantId,
      },
      false,
    )) as {
      validation: { valid: boolean; reason?: string; details?: string };
    };

    if (validateRes.validation.valid) {
      result.validationResult = 'VALID';
      result.validationDetail = 'Accepted';
    } else {
      result.validationResult =
        (validateRes.validation.reason as 'QUOTA_FULL' | 'DISQUALIFIED') ?? 'ERROR';
      result.validationDetail = validateRes.validation.details ?? '';
    }

    // 2c. If valid and we have a SmartVOC module, submit responses
    if (validateRes.validation.valid && smartVocModuleId) {
      const npsScore = Math.floor(Math.random() * 11); // 0-10
      await api(
        'POST',
        `/public/research/${researchId}/responses`,
        {
          participantId: sessionRes.participantId,
          moduleId: smartVocModuleId,
          responses: [
            {
              moduleId: smartVocModuleId,
              componentId: 'scale',
              value: npsScore,
              metadata: { timestamp: Date.now(), duration: 3000 },
            },
            {
              moduleId: smartVocModuleId,
              componentId: 'text',
              value: `Stress test response from ${participant.label}`,
              metadata: {},
            },
          ],
          metadata: {
            completedAt: Date.now(),
            totalDuration: 5000,
            isPreviewMode: false,
            turnstileToken: null,
          },
        },
        false,
      );
      result.responsesSaved = true;
    }
  } catch (err) {
    result.validationDetail =
      err instanceof Error ? err.message.slice(0, 120) : String(err);
  }

  return result;
}

async function runParticipants(
  researchId: string,
  smartVocModuleId: string | undefined,
) {
  console.log(`\n👥 Launching ${PARTICIPANTS.length} participants concurrently…\n`);

  // Fire all at once for maximum concurrency pressure
  const promises = PARTICIPANTS.map((p) =>
    simulateParticipant(researchId, smartVocModuleId, p),
  );

  return Promise.all(promises);
}

// ---------------------------------------------------------------------------
// Step 3 — Verification
// ---------------------------------------------------------------------------

function verify(results: ParticipantResult[]) {
  console.log('\n' + '═'.repeat(90));
  console.log(' RESULTS');
  console.log('═'.repeat(90));

  // Table header
  console.log(
    '  Label  │ ParticipantId  │ Gender │ Age │ Result      │ Detail',
  );
  console.log('─'.repeat(90));

  for (const r of results) {
    const pid = (r.participantId ?? '—').padEnd(14);
    const gender = r.demographics.gender.padEnd(6);
    const age = r.demographics.age.padEnd(3);
    const status =
      r.validationResult === 'VALID'
        ? '✅ VALID     '
        : r.validationResult === 'QUOTA_FULL'
          ? '🚫 QUOTA_FULL'
          : r.validationResult === 'DISQUALIFIED'
            ? '⛔ DISQUALIF '
            : '❌ ERROR     ';
    console.log(
      `  ${r.label.padEnd(6)} │ ${pid} │ ${gender} │ ${age} │ ${status} │ ${r.validationDetail.slice(0, 40)}`,
    );
  }

  // Aggregate counts
  const accepted = results.filter((r) => r.validationResult === 'VALID');
  const quotaFull = results.filter((r) => r.validationResult === 'QUOTA_FULL');
  const errors = results.filter(
    (r) => r.validationResult === 'ERROR' || r.validationResult === 'DISQUALIFIED',
  );

  const maleAccepted = accepted.filter(
    (r) => r.demographics.gender === 'Male',
  ).length;
  const femaleAccepted = accepted.filter(
    (r) => r.demographics.gender === 'Female',
  ).length;

  // Count by age bucket
  function ageBucket(age: string) {
    const n = parseInt(age, 10);
    if (n >= 18 && n <= 25) return '18-25';
    if (n >= 26 && n <= 35) return '26-35';
    if (n >= 36 && n <= 50) return '36-50';
    return 'other';
  }

  const ageAccepted: Record<string, number> = {};
  for (const r of accepted) {
    const bucket = ageBucket(r.demographics.age);
    ageAccepted[bucket] = (ageAccepted[bucket] ?? 0) + 1;
  }

  console.log('\n' + '─'.repeat(90));
  console.log(' SUMMARY');
  console.log('─'.repeat(90));
  console.log(`  Total participants: ${results.length}`);
  console.log(`  Accepted:           ${accepted.length}`);
  console.log(`  Quota full:         ${quotaFull.length}`);
  console.log(`  Errors:             ${errors.length}`);
  console.log(`  Responses saved:    ${results.filter((r) => r.responsesSaved).length}`);
  console.log();
  console.log(`  Gender breakdown:`);
  console.log(`    Male accepted:    ${maleAccepted} / limit ${GENDER_QUOTAS[0].limit}`);
  console.log(`    Female accepted:  ${femaleAccepted} / limit ${GENDER_QUOTAS[1].limit}`);
  console.log(`  Age breakdown:`);
  for (const q of AGE_QUOTAS) {
    console.log(
      `    ${q.value} accepted: ${ageAccepted[q.value] ?? 0} / limit ${q.limit}`,
    );
  }

  // Verdict
  console.log('\n' + '═'.repeat(90));
  const genderOk =
    maleAccepted <= GENDER_QUOTAS[0].limit &&
    femaleAccepted <= GENDER_QUOTAS[1].limit;
  const ageOk = AGE_QUOTAS.every(
    (q) => (ageAccepted[q.value] ?? 0) <= q.limit,
  );
  const noErrors = errors.length === 0;

  if (genderOk && ageOk && noErrors) {
    console.log(' ✅ PASS — All quotas respected, no over-counts.');
  } else {
    if (!genderOk) console.log(' ❌ FAIL — Gender quota exceeded!');
    if (!ageOk) console.log(' ❌ FAIL — Age quota exceeded!');
    if (!noErrors)
      console.log(` ⚠️  ${errors.length} error(s) during validation.`);
  }
  console.log('═'.repeat(90) + '\n');

  return genderOk && ageOk;
}

// ---------------------------------------------------------------------------
// Step 4 — Cleanup
// ---------------------------------------------------------------------------

async function cleanup(researchId: string) {
  console.log('🧹 Archiving test research…');
  try {
    await api('DELETE', `/research/${researchId}`);
    console.log('   ✓ Research archived/deleted');
  } catch (err) {
    console.warn(
      '   ⚠️  Research cleanup failed:',
      err instanceof Error ? err.message : err,
    );
  }

  // Clean up test user from DB if self-registered
  if (SELF_REGISTERED) {
    console.log('🧹 Cleaning up test user…');
    try {
      // Soft-delete via direct DB isn't possible from here, but we can just leave
      // the archived research. The test user is ephemeral (unique email per run).
      console.log(`   ℹ️  Test user ${EMAIL} left in DB (soft-delete not exposed via API)`);
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   STRESS TEST — Atomic Quota Enforcement (tryIncrementQuota)  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  API: ${API_BASE}`);
  console.log(`  User: ${EMAIL}`);

  const { researchId, smartVocModuleId } = await setup();
  console.log(`\n  Research: ${researchId}`);
  console.log(`  URL: ${API_BASE.replace('/api', '')}/participant/?researchId=${researchId}`);

  // Small delay to ensure activation propagated
  await sleep(500);

  const results = await runParticipants(researchId, smartVocModuleId);
  const passed = verify(results);

  await cleanup(researchId);

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(2);
});
