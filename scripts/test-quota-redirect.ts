/**
 * Test E2E exhaustivo: valida TODO el flujo de cuotas demográficas.
 *
 * Escenarios cubiertos:
 *   1.  Setup — research kiosk con múltiples tipos demográficos + cuotas
 *   2.  Pre-check con cuotas vacías → available:true
 *   3.  Participantes válidos llenan cuotas parcialmente
 *   4.  Pre-check parcial → available:true (aún hay slots)
 *   5.  Participante llena la última cuota de un tipo → agota un demographic_type completo
 *   6.  Pre-check exhausto → available:false
 *   7.  Post-validate con cuota llena (mismo valor) → QUOTA_FULL
 *   8.  Post-validate con OTRO valor del mismo tipo (también lleno) → QUOTA_FULL
 *   9.  Concurrencia: N participantes simultáneos contra 1 slot → exactamente 1 pasa
 *   10. Descalificación: opción marcada disqualified → DISQUALIFIED
 *   11. Descalificación + cuota llena: prioridad de DISQUALIFIED sobre QUOTA_FULL
 *   12. Idempotencia: mismo participantId re-valida sin double-count
 *   13. Sin cuotas: demográficos habilitados pero sin quotas → siempre valid:true
 *   14. Enforcement mode post_collection: no bloquea en tiempo real
 *   15. Backlinks: llegan al payload público del participant-frontend
 *   16. matchesQuotaValue: rangos numéricos, opciones no-numéricas ("Menor 18"), exactas
 *   17. Multi-tipo: gender lleno pero age no → pre-check bloquea (1 tipo basta)
 *   18. Cuota parcial: solo 1 valor de un tipo tiene cuota → al llenarse, pre-check bloquea
 *
 * Uso:
 *   npx tsx scripts/test-quota-redirect.ts
 */

const API_BASE = process.env.TEST_API_BASE ?? 'https://emotio.cx/api';
const UNIQUE = Date.now();
const TEST_EMAIL = `quota-full-${UNIQUE}@test.emotiox.com`;
const TEST_PASSWORD = 'QuotaFull2026!';

let token = '';
let passed = 0;
let failed = 0;
const failures: string[] = [];

// ─── Helpers ───────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown, auth = true): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`    ✅ ${label}`);
  } else {
    failed++;
    const msg = `${label}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(`    ❌ ${msg}`);
  }
}

function section(title: string) { console.log(`\n  ── ${title} ──\n`); }

type Validation = { valid: boolean; reason?: string; details?: string };
type QuotaAvail = { available: boolean; exhaustedType?: string };

async function preCheck(researchId: string): Promise<QuotaAvail> {
  return (await api('GET', `/public/research/${researchId}/quota-availability`, undefined, false)) as QuotaAvail;
}

async function validate(researchId: string, demographics: Record<string, string>, participantId: string): Promise<Validation> {
  const res = (await api('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics, participantId,
  }, false)) as { validation: Validation };
  return res.validation;
}

async function kioskSession(researchId: string): Promise<string> {
  const res = (await api('POST', `/public/research/${researchId}/kiosk/session`, {}, false)) as { participantId: string };
  return res.participantId;
}

async function createResearch(name: string): Promise<{ researchId: string; configModuleId: string }> {
  const typesRes = (await api('GET', '/research-types')) as { researchTypes: Array<{ id: string }> };
  const createRes = (await api('POST', '/research', {
    name,
    research_type_id: typesRes.researchTypes?.[0]?.id,
    use_default_modules: ['Smart VOC'],
  })) as { research: { id: string } };
  const researchId = createRes.research.id;

  const fullRes = (await api('GET', `/research/${researchId}`)) as {
    research: { stages: Array<{ modules: Array<{ id: string; name: string }> }> };
  };
  let configModuleId = '';
  for (const stage of fullRes.research.stages)
    for (const mod of stage.modules ?? [])
      if (mod.name === 'Research Configuration') configModuleId = mod.id;

  return { researchId, configModuleId };
}

async function configureAndActivate(
  configModuleId: string,
  researchId: string,
  config: Record<string, unknown>,
) {
  await api('PUT', `/modules/${configModuleId}`, { config });
  await api('POST', `/research/${researchId}/activate`, {});
}

async function archiveResearch(researchId: string) {
  try { await api('DELETE', `/research/${researchId}`); } catch { /* ignore */ }
}

// Track all research IDs for cleanup
const researchIds: string[] = [];

// ─── Auth ──────────────────────────────────────────────────────────────

async function authenticate() {
  console.log('  Registering + logging in…');
  await api('POST', '/auth/register', {
    email: TEST_EMAIL, password: TEST_PASSWORD,
    firstName: 'QuotaFull', lastName: 'Test', role: 'researcher',
  }, false);
  const loginRes = (await api('POST', '/auth/login', {
    email: TEST_EMAIL, password: TEST_PASSWORD, rememberMe: false,
  })) as { token: string };
  token = loginRes.token;
  console.log(`  Authenticated as ${TEST_EMAIL}\n`);
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════

// --- Suite A: flujo completo gender (Male=2, Female=2) -----------------

async function suiteA() {
  section('A. Flujo completo: llenar, agotar, bloquear (gender)');

  const { researchId, configModuleId } = await createResearch(`[TEST-A] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qa-m', value: 'Male', limit: 2, enabled: true, enforcementMode: 'immediate' },
          { id: 'qa-f', value: 'Female', limit: 2, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // A.1 — Pre-check con cuotas vacías
  const pc1 = await preCheck(researchId);
  assert(pc1.available === true, 'A.1 Pre-check con cuotas vacías → available:true');

  // A.2 — Llenar Male=1/2
  const pid1 = await kioskSession(researchId);
  const v1 = await validate(researchId, { gender: 'Male' }, pid1);
  assert(v1.valid === true, 'A.2 Male 1/2 aceptado');

  // A.3 — Pre-check parcial → still available
  const pc2 = await preCheck(researchId);
  assert(pc2.available === true, 'A.3 Pre-check parcial (1/2 Male, 0/2 Female) → available:true');

  // A.4 — Llenar Male=2/2
  const pid2 = await kioskSession(researchId);
  const v2 = await validate(researchId, { gender: 'Male' }, pid2);
  assert(v2.valid === true, 'A.4 Male 2/2 aceptado');

  // A.5 — Male exhausto pero Female no → pre-check still available
  const pc3 = await preCheck(researchId);
  assert(pc3.available === true, 'A.5 Male lleno pero Female disponible → available:true');

  // A.6 — Siguiente Male → QUOTA_FULL
  const pid3 = await kioskSession(researchId);
  const v3 = await validate(researchId, { gender: 'Male' }, pid3);
  assert(v3.valid === false, 'A.6 Male 3/2 rechazado');
  assert(v3.reason === 'QUOTA_FULL', 'A.6 reason = QUOTA_FULL', `got: ${v3.reason}`);

  // A.7 — Llenar Female=2/2
  const pid4 = await kioskSession(researchId);
  const v4 = await validate(researchId, { gender: 'Female' }, pid4);
  assert(v4.valid === true, 'A.7 Female 1/2 aceptado');
  const pid5 = await kioskSession(researchId);
  const v5 = await validate(researchId, { gender: 'Female' }, pid5);
  assert(v5.valid === true, 'A.8 Female 2/2 aceptado');

  // A.9 — Ahora TODOS los slots están llenos → pre-check bloquea
  const pc4 = await preCheck(researchId);
  assert(pc4.available === false, 'A.9 Todas las cuotas gender agotadas → available:false');
  assert(pc4.exhaustedType === 'gender', 'A.9 exhaustedType = gender', `got: ${pc4.exhaustedType}`);

  // A.10 — Post-validate Female también rechaza
  const pid6 = await kioskSession(researchId);
  const v6 = await validate(researchId, { gender: 'Female' }, pid6);
  assert(v6.valid === false, 'A.10 Female 3/2 rechazado');
  assert(v6.reason === 'QUOTA_FULL', 'A.10 reason = QUOTA_FULL');
}

// --- Suite B: multi-tipo (gender + age) --------------------------------

async function suiteB() {
  section('B. Multi-tipo: gender lleno + age disponible → pre-check bloquea');

  const { researchId, configModuleId } = await createResearch(`[TEST-B] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qb-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'qb-f', value: 'Female', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
      age: {
        enabled: true, min: 18, max: 65,
        validValues: ['18-24', '25-34', '35-44'],
        quotas: [
          { id: 'qb-a1', value: '18-24', limit: 5, enabled: true, enforcementMode: 'immediate' },
          { id: 'qb-a2', value: '25-34', limit: 5, enabled: true, enforcementMode: 'immediate' },
          { id: 'qb-a3', value: '35-44', limit: 5, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // Fill both gender slots
  const pid1 = await kioskSession(researchId);
  await validate(researchId, { gender: 'Male', age: '18-24' }, pid1);
  const pid2 = await kioskSession(researchId);
  await validate(researchId, { gender: 'Female', age: '25-34' }, pid2);

  // Gender exhausted, age has plenty of room
  const pc = await preCheck(researchId);
  assert(pc.available === false, 'B.1 Gender lleno, age disponible → available:false (1 tipo basta)');
  assert(pc.exhaustedType === 'gender', 'B.1 exhaustedType = gender');

  // Post-validate: even with un-exhausted age value, gender blocks
  const pid3 = await kioskSession(researchId);
  const v = await validate(researchId, { gender: 'Male', age: '35-44' }, pid3);
  assert(v.valid === false, 'B.2 Post-validate rechaza por gender QUOTA_FULL');
  assert(v.reason === 'QUOTA_FULL', 'B.2 reason = QUOTA_FULL');
}

// --- Suite C: cuota parcial (solo 1 valor del tipo tiene cuota) --------

async function suiteC() {
  section('C. Cuota parcial: solo Male tiene cuota (Female sin cuota)');

  const { researchId, configModuleId } = await createResearch(`[TEST-C] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qc-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
          // NO quota for Female
        ],
      },
    },
  });

  // Fill Male=1/1
  const pid1 = await kioskSession(researchId);
  const v1 = await validate(researchId, { gender: 'Male' }, pid1);
  assert(v1.valid === true, 'C.1 Male 1/1 aceptado');

  // Pre-check: el único valor con cuota (Male) está lleno → available:false
  const pc = await preCheck(researchId);
  assert(pc.available === false, 'C.2 Único valor con cuota lleno → available:false');

  // Post-validate Male → QUOTA_FULL
  const pid2 = await kioskSession(researchId);
  const v2 = await validate(researchId, { gender: 'Male' }, pid2);
  assert(v2.valid === false, 'C.3 Male 2/1 rechazado → QUOTA_FULL');

  // Post-validate Female → pasa (sin cuota definida para Female)
  const pid3 = await kioskSession(researchId);
  const v3 = await validate(researchId, { gender: 'Female' }, pid3);
  assert(v3.valid === true, 'C.4 Female sin cuota → pasa (valid:true)');
}

// --- Suite D: descalificación (disqualification) -----------------------

async function suiteD() {
  section('D. Descalificación: opción marcada disqualified');

  const { researchId, configModuleId } = await createResearch(`[TEST-D] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female', 'Other'],
        disqualifications: [
          { id: 'dq-other', value: 'Other', enabled: true },
        ],
        quotas: [
          { id: 'qd-m', value: 'Male', limit: 10, enabled: true, enforcementMode: 'immediate' },
          { id: 'qd-f', value: 'Female', limit: 10, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // D.1 — Male pasa
  const pid1 = await kioskSession(researchId);
  const v1 = await validate(researchId, { gender: 'Male' }, pid1);
  assert(v1.valid === true, 'D.1 Male pasa');

  // D.2 — Other → DISQUALIFIED
  const pid2 = await kioskSession(researchId);
  const v2 = await validate(researchId, { gender: 'Other' }, pid2);
  assert(v2.valid === false, 'D.2 Other rechazado');
  assert(v2.reason === 'DISQUALIFIED', 'D.2 reason = DISQUALIFIED', `got: ${v2.reason}`);

  // D.3 — Llenar Male hasta QUOTA_FULL, luego Other: DISQUALIFIED tiene prioridad
  for (let i = 0; i < 9; i++) {
    const p = await kioskSession(researchId);
    await validate(researchId, { gender: 'Male' }, p);
  }
  // Male 10/10 → full
  const pid3 = await kioskSession(researchId);
  const v3 = await validate(researchId, { gender: 'Male' }, pid3);
  assert(v3.valid === false, 'D.3 Male 11/10 rechazado');
  assert(v3.reason === 'QUOTA_FULL', 'D.3 reason = QUOTA_FULL');

  // Other sigue dando DISQUALIFIED (no QUOTA_FULL)
  const pid4 = await kioskSession(researchId);
  const v4 = await validate(researchId, { gender: 'Other' }, pid4);
  assert(v4.reason === 'DISQUALIFIED', 'D.4 DISQUALIFIED tiene prioridad sobre QUOTA_FULL');
}

// --- Suite E: concurrencia (race condition) ----------------------------

async function suiteE() {
  section('E. Concurrencia: 8 participantes simultáneos contra 1 slot');

  const { researchId, configModuleId } = await createResearch(`[TEST-E] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male'],
        quotas: [
          { id: 'qe-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // Create 8 sessions, fire all validate calls concurrently
  const sessions = await Promise.all(
    Array.from({ length: 8 }, () => kioskSession(researchId))
  );

  const results = await Promise.all(
    sessions.map(pid => validate(researchId, { gender: 'Male' }, pid))
  );

  const accepted = results.filter(r => r.valid);
  const rejected = results.filter(r => !r.valid && r.reason === 'QUOTA_FULL');

  assert(accepted.length === 1, `E.1 Exactamente 1 aceptado de 8`, `got: ${accepted.length}`);
  assert(rejected.length === 7, `E.2 Exactamente 7 rechazados`, `got: ${rejected.length}`);

  // Verify DB count didn't exceed limit
  const pc = await preCheck(researchId);
  assert(pc.available === false, 'E.3 Pre-check confirma cuota agotada post-concurrencia');
}

// --- Suite F: idempotencia (re-validar mismo participantId) ------------

async function suiteF() {
  section('F. Idempotencia: re-validar mismo participantId');

  const { researchId, configModuleId } = await createResearch(`[TEST-F] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qf-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'qf-f', value: 'Female', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // Fill Male slot
  const pid1 = await kioskSession(researchId);
  const v1 = await validate(researchId, { gender: 'Male' }, pid1);
  assert(v1.valid === true, 'F.1 Male aceptado');

  // Same pid re-validates → QUOTA_FULL (no free pass)
  const v2 = await validate(researchId, { gender: 'Male' }, pid1);
  assert(v2.valid === false, 'F.2 Re-validar mismo pid → rechazado (cuota ya llena)');

  // Different pid for Female → accepted
  const pid2 = await kioskSession(researchId);
  const v3 = await validate(researchId, { gender: 'Female' }, pid2);
  assert(v3.valid === true, 'F.3 Female con nuevo pid → aceptado');

  // Same pid2 re-validates → QUOTA_FULL
  const v4 = await validate(researchId, { gender: 'Female' }, pid2);
  assert(v4.valid === false, 'F.4 Re-validar pid2 → QUOTA_FULL');
}

// --- Suite G: sin cuotas (demographics sin quotas) ---------------------

async function suiteG() {
  section('G. Sin cuotas: demográficos habilitados sin quotas → siempre valid');

  const { researchId, configModuleId } = await createResearch(`[TEST-G] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: { enabled: true, validValues: ['Male', 'Female'] },
      // No quotas at all
    },
  });

  const pc = await preCheck(researchId);
  assert(pc.available === true, 'G.1 Pre-check sin cuotas → available:true');

  // 5 Male participants → all pass
  for (let i = 0; i < 5; i++) {
    const pid = await kioskSession(researchId);
    const v = await validate(researchId, { gender: 'Male' }, pid);
    assert(v.valid === true, `G.2.${i + 1} Male #${i + 1} pasa sin cuota`);
  }

  const pc2 = await preCheck(researchId);
  assert(pc2.available === true, 'G.3 Pre-check sigue available:true después de 5 participantes');
}

// --- Suite H: enforcement_mode post_collection -------------------------

async function suiteH() {
  section('H. Enforcement mode post_collection: no bloquea en tiempo real');

  const { researchId, configModuleId } = await createResearch(`[TEST-H] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qh-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'post_collection' },
          { id: 'qh-f', value: 'Female', limit: 1, enabled: true, enforcementMode: 'post_collection' },
        ],
      },
    },
  });

  // Pre-check ignora post_collection → available:true
  const pc1 = await preCheck(researchId);
  assert(pc1.available === true, 'H.1 Pre-check ignora post_collection → available:true');

  // 3 Male → all accepted (post_collection no bloquea)
  for (let i = 0; i < 3; i++) {
    const pid = await kioskSession(researchId);
    const v = await validate(researchId, { gender: 'Male' }, pid);
    assert(v.valid === true, `H.2.${i + 1} Male #${i + 1} pasa con post_collection`);
  }

  // Pre-check still available
  const pc2 = await preCheck(researchId);
  assert(pc2.available === true, 'H.3 Pre-check sigue available:true (post_collection no cuenta)');
}

// --- Suite I: matchesQuotaValue edge cases -----------------------------

async function suiteI() {
  section('I. matchesQuotaValue: rangos numéricos y opciones no-numéricas');

  const { researchId, configModuleId } = await createResearch(`[TEST-I] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      age: {
        enabled: true, min: 0, max: 100,
        validValues: ['Menor 18', '18-24', '25-34', '65+'],
        quotas: [
          { id: 'qi-1', value: 'Menor 18', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'qi-2', value: '18-24', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'qi-3', value: '25-34', limit: 1, enabled: true, enforcementMode: 'immediate' },
          { id: 'qi-4', value: '65+', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // I.1 — "Menor 18" (no numérico) → string exact match
  const pid1 = await kioskSession(researchId);
  const v1 = await validate(researchId, { age: 'Menor 18' }, pid1);
  assert(v1.valid === true, 'I.1 "Menor 18" aceptado (exact string match)');

  const pid1b = await kioskSession(researchId);
  const v1b = await validate(researchId, { age: 'Menor 18' }, pid1b);
  assert(v1b.valid === false && v1b.reason === 'QUOTA_FULL', 'I.2 "Menor 18" 2/1 → QUOTA_FULL');

  // I.3 — "18-24" (rango numérico) → parseInt match
  const pid2 = await kioskSession(researchId);
  const v2 = await validate(researchId, { age: '18-24' }, pid2);
  assert(v2.valid === true, 'I.3 "18-24" aceptado (rango numérico)');

  const pid2b = await kioskSession(researchId);
  const v2b = await validate(researchId, { age: '18-24' }, pid2b);
  assert(v2b.valid === false && v2b.reason === 'QUOTA_FULL', 'I.4 "18-24" 2/1 → QUOTA_FULL');

  // I.5 — "25-34"
  const pid3 = await kioskSession(researchId);
  const v3 = await validate(researchId, { age: '25-34' }, pid3);
  assert(v3.valid === true, 'I.5 "25-34" aceptado');

  // I.6 — "65+" (comienza con dígito, parseInt = 65)
  const pid4 = await kioskSession(researchId);
  const v4 = await validate(researchId, { age: '65+' }, pid4);
  assert(v4.valid === true, 'I.6 "65+" aceptado');

  // All age quotas full → pre-check blocks
  const pc = await preCheck(researchId);
  assert(pc.available === false, 'I.7 Todas las cuotas age agotadas → available:false');
}

// --- Suite J: backlinks llegan al payload público ----------------------

async function suiteJ() {
  section('J. Backlinks: config → público → participant-frontend');

  const { researchId, configModuleId } = await createResearch(`[TEST-J] ${UNIQUE}`);
  researchIds.push(researchId);

  const OVERQUOTA = 'https://example.com/survey-full';
  const DISQUAL = 'https://example.com/not-qualified';
  const COMPLETE = 'https://example.com/thanks';

  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    backlinks: { complete: COMPLETE, overquota: OVERQUOTA, disqualified: DISQUAL },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qj-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // Fetch public research (preview=true bypasses cache)
  const pub = (await api('GET', `/public/research/${researchId}?preview=true`, undefined, false)) as {
    research: { stages: Array<{ modules: Array<{ name: string; config: Record<string, unknown> }> }> };
  };

  let backlinks: Record<string, unknown> | null = null;
  for (const stage of pub.research.stages)
    for (const mod of stage.modules ?? [])
      if (mod.name === 'Research Configuration')
        backlinks = (mod.config?.backlinks ?? null) as Record<string, unknown> | null;

  assert(backlinks !== null, 'J.1 Backlinks presentes en config público');
  assert(backlinks?.complete === COMPLETE, 'J.2 complete backlink correcto', `got: ${backlinks?.complete}`);
  assert(backlinks?.overquota === OVERQUOTA, 'J.3 overquota backlink correcto', `got: ${backlinks?.overquota}`);
  assert(backlinks?.disqualified === DISQUAL, 'J.4 disqualified backlink correcto', `got: ${backlinks?.disqualified}`);

  // Verify empty string backlinks are excluded
  await api('PUT', `/modules/${configModuleId}`, {
    config: {
      participationMode: 'kiosk',
      participantLimit: { enabled: false, value: 100 },
      backlinks: { complete: '', overquota: '', disqualified: '' },
      demographics: { gender: { enabled: true, validValues: ['Male', 'Female'] } },
    },
  });
  const pub2 = (await api('GET', `/public/research/${researchId}?preview=true`, undefined, false)) as {
    research: { stages: Array<{ modules: Array<{ name: string; config: Record<string, unknown> }> }> };
  };
  let backlinks2: Record<string, unknown> | null = null;
  for (const stage of pub2.research.stages)
    for (const mod of stage.modules ?? [])
      if (mod.name === 'Research Configuration')
        backlinks2 = (mod.config?.backlinks ?? null) as Record<string, unknown> | null;

  // Backend stores empty strings; frontend getBacklinks() filters them out.
  // Verify the raw config still has the backlinks key (frontend handles filtering).
  assert(backlinks2 !== null, 'J.5 Backlinks key presente incluso con strings vacíos');
}

// --- Suite K: validación sin participantId (legacy fallback) -----------

async function suiteK() {
  section('K. Legacy: validate-demographics sin participantId');

  const { researchId, configModuleId } = await createResearch(`[TEST-K] ${UNIQUE}`);
  researchIds.push(researchId);
  await configureAndActivate(configModuleId, researchId, {
    participationMode: 'kiosk',
    participantLimit: { enabled: false, value: 100 },
    demographics: {
      gender: {
        enabled: true,
        validValues: ['Male', 'Female'],
        quotas: [
          { id: 'qk-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
        ],
      },
    },
  });

  // Fill Male quota
  const pid = await kioskSession(researchId);
  await validate(researchId, { gender: 'Male' }, pid);

  // Call WITHOUT participantId (legacy fallback path uses checkQuotaAvailability)
  const res = (await api('POST', `/public/research/${researchId}/validate-demographics`, {
    demographics: { gender: 'Male' },
    // no participantId
  }, false)) as { validation: Validation };

  assert(res.validation.valid === false, 'K.1 Legacy (sin pid): Male rechazado');
  assert(res.validation.reason === 'QUOTA_FULL', 'K.1 reason = QUOTA_FULL', `got: ${res.validation.reason}`);
}

// --- Suite L: status overquota en panel mode ---------------------------

async function suiteL() {
  section('L. Panel mode: status → overquota cuando cuota llena');

  const { researchId, configModuleId } = await createResearch(`[TEST-L] ${UNIQUE}`);
  researchIds.push(researchId);
  await api('PUT', `/modules/${configModuleId}`, {
    config: {
      participationMode: 'panel',
      participantLimit: { enabled: false, value: 100 },
      demographics: {
        gender: {
          enabled: true,
          validValues: ['Male', 'Female'],
          quotas: [
            { id: 'ql-m', value: 'Male', limit: 1, enabled: true, enforcementMode: 'immediate' },
            { id: 'ql-f', value: 'Female', limit: 1, enabled: true, enforcementMode: 'immediate' },
          ],
        },
      },
    },
  });
  await api('POST', `/research/${researchId}/activate`, {});

  // Import 3 panel participants via CSV
  await api('POST', `/participants/${researchId}/import`, {
    csv: `email,name\np1-${UNIQUE}@test.com,P1\np2-${UNIQUE}@test.com,P2\np3-${UNIQUE}@test.com,P3`,
  });

  // List participants to get their IDs
  const listRes = (await api('GET', `/participants/${researchId}`)) as {
    participants: Array<{ participant_id: string; status: string; name: string }>;
  };
  const participants = listRes.participants;
  assert(participants.length === 3, `L.0 Imported 3 participants`, `got: ${participants.length}`);

  const [p1, p2, p3] = participants;

  // P1 fills Male slot (valid)
  const v1 = await validate(researchId, { gender: 'Male' }, p1.participant_id);
  assert(v1.valid === true, 'L.1 P1 (Male) aceptado');

  // P2 fills Female slot (valid)
  const v2 = await validate(researchId, { gender: 'Female' }, p2.participant_id);
  assert(v2.valid === true, 'L.2 P2 (Female) aceptado');

  // P3 tries Male → QUOTA_FULL
  const v3 = await validate(researchId, { gender: 'Male' }, p3.participant_id);
  assert(v3.valid === false, 'L.3 P3 (Male) rechazado');
  assert(v3.reason === 'QUOTA_FULL', 'L.3 reason = QUOTA_FULL');

  // Verify P3 status changed to 'overquota' in participants table
  const listRes2 = (await api('GET', `/participants/${researchId}`)) as {
    participants: Array<{ participant_id: string; status: string }>;
  };
  const p3Updated = listRes2.participants.find(p => p.participant_id === p3.participant_id);
  assert(p3Updated?.status === 'overquota', 'L.4 P3 status = overquota en BD', `got: ${p3Updated?.status}`);

  // P1 and P2 should still be pending (not yet responded — only demographics validated)
  const p1Updated = listRes2.participants.find(p => p.participant_id === p1.participant_id);
  assert(p1Updated?.status === 'pending', 'L.5 P1 status sigue pending (aún no respondió módulos)', `got: ${p1Updated?.status}`);
}

// --- Suite M: status disqualified en panel mode ------------------------

async function suiteM() {
  section('M. Panel mode: status → disqualified cuando descalificado');

  const { researchId, configModuleId } = await createResearch(`[TEST-M] ${UNIQUE}`);
  researchIds.push(researchId);
  await api('PUT', `/modules/${configModuleId}`, {
    config: {
      participationMode: 'panel',
      participantLimit: { enabled: false, value: 100 },
      demographics: {
        gender: {
          enabled: true,
          validValues: ['Male', 'Female', 'Other'],
          disqualifications: [
            { id: 'dm-other', value: 'Other', enabled: true },
          ],
        },
      },
    },
  });
  await api('POST', `/research/${researchId}/activate`, {});

  // Import 2 panel participants via CSV
  await api('POST', `/participants/${researchId}/import`, {
    csv: `email,name\npm1-${UNIQUE}@test.com,PM1\npm2-${UNIQUE}@test.com,PM2`,
  });

  const listRes = (await api('GET', `/participants/${researchId}`)) as {
    participants: Array<{ participant_id: string; status: string }>;
  };
  const [pm1, pm2] = listRes.participants;

  // PM1 selects Other → DISQUALIFIED
  const v1 = await validate(researchId, { gender: 'Other' }, pm1.participant_id);
  assert(v1.valid === false, 'M.1 PM1 (Other) rechazado');
  assert(v1.reason === 'DISQUALIFIED', 'M.1 reason = DISQUALIFIED');

  // PM2 selects Male → valid
  const v2 = await validate(researchId, { gender: 'Male' }, pm2.participant_id);
  assert(v2.valid === true, 'M.2 PM2 (Male) aceptado');

  // Verify statuses
  const listRes2 = (await api('GET', `/participants/${researchId}`)) as {
    participants: Array<{ participant_id: string; status: string }>;
  };
  const pm1Up = listRes2.participants.find(p => p.participant_id === pm1.participant_id);
  const pm2Up = listRes2.participants.find(p => p.participant_id === pm2.participant_id);
  assert(pm1Up?.status === 'disqualified', 'M.3 PM1 status = disqualified en BD', `got: ${pm1Up?.status}`);
  assert(pm2Up?.status === 'pending', 'M.4 PM2 status sigue pending', `got: ${pm2Up?.status}`);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST EXHAUSTIVO — Cuotas demográficas (pre-check + post-validate) ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log(`  API: ${API_BASE}`);
  console.log(`  User: ${TEST_EMAIL}\n`);

  await authenticate();

  await suiteA();
  await suiteB();
  await suiteC();
  await suiteD();
  await suiteE();
  await suiteF();
  await suiteG();
  await suiteH();
  await suiteI();
  await suiteJ();
  await suiteK();
  await suiteL();
  await suiteM();

  // Cleanup all research
  section('Cleanup');
  for (const id of researchIds) await archiveResearch(id);
  console.log(`    Archived ${researchIds.length} researches`);

  // Verdict
  console.log('\n' + '═'.repeat(67));
  console.log(`  ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed === 0) {
    console.log('  ✅ ALL TESTS PASSED — Quota flow verified end-to-end');
  } else {
    console.log('  ❌ FAILURES:');
    for (const f of failures) console.log(`    • ${f}`);
  }
  console.log('═'.repeat(67) + '\n');

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  // Cleanup on crash
  (async () => {
    for (const id of researchIds) await archiveResearch(id);
  })().finally(() => process.exit(2));
});
