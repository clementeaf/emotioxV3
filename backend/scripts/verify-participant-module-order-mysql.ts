/**
 * Audits all active researches in MySQL: compares legacy global module order_index sort
 * vs stage order + module order (participant-frontend after fix).
 *
 * Usage (from repo root, with backend/.env pointing at cPanel MySQL):
 *   cd backend && NODE_ENV=production npx tsx scripts/verify-participant-module-order-mysql.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { createPool, type RowDataPacket } from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

function getDbName(): string {
  const base = process.env.DB_NAME ?? '';
  if (base.endsWith('_dev') || base.endsWith('_prod')) {
    return base;
  }
  return process.env.NODE_ENV === 'development' ? `${base}_dev` : base;
}

interface ResearchRow extends RowDataPacket {
  id: string;
  name: string;
  status: string;
}

interface StageRow extends RowDataPacket {
  id: string;
  research_id: string;
  name: string;
  order_index: number;
}

interface ModuleRow extends RowDataPacket {
  id: string;
  stage_id: string;
  name: string;
  order_index: number;
}

/**
 * Runs the audit and prints JSON to stdout.
 */
async function main(): Promise<void> {
  const dbName = getDbName();
  const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const [researches] = await pool.query<ResearchRow[]>(
    `SELECT id, name, status FROM researches WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );

  // MySQL column is display_order; API maps it to order_index for clients
  const [allStages] = await pool.query<StageRow[]>(
    `SELECT id, research_id, name, display_order AS order_index FROM stages ORDER BY research_id, display_order ASC`
  );

  const [allModules] = await pool.query<ModuleRow[]>(
    `SELECT id, stage_id, name, order_index FROM modules ORDER BY stage_id, order_index ASC`
  );

  const stagesByResearch = new Map<string, StageRow[]>();
  for (const s of allStages) {
    const list = stagesByResearch.get(s.research_id) ?? [];
    list.push(s);
    stagesByResearch.set(s.research_id, list);
  }

  const modulesByStage = new Map<string, ModuleRow[]>();
  for (const m of allModules) {
    const list = modulesByStage.get(m.stage_id) ?? [];
    list.push(m);
    modulesByStage.set(m.stage_id, list);
  }

  /** Legacy participant bug: flatten all modules, sort by module.order_index only */
  function orderLegacy(rid: string): ModuleRow[] {
    const stages = stagesByResearch.get(rid) ?? [];
    const flat: ModuleRow[] = [];
    for (const s of stages) {
      flat.push(...(modulesByStage.get(s.id) ?? []));
    }
    return [...flat].sort((a, b) => a.order_index - b.order_index);
  }

  /** Current participant: sort stages by order_index, then modules within each stage */
  function orderFixed(rid: string): ModuleRow[] {
    const stages = [...(stagesByResearch.get(rid) ?? [])].sort((a, b) => a.order_index - b.order_index);
    const flat: ModuleRow[] = [];
    for (const s of stages) {
      const mods = [...(modulesByStage.get(s.id) ?? [])].sort((a, b) => a.order_index - b.order_index);
      flat.push(...mods);
    }
    return flat;
  }

  const mismatches: Array<{
    researchId: string;
    name: string;
    status: string;
    stageCount: number;
    moduleCount: number;
    legacySequence: string[];
    fixedSequence: string[];
  }> = [];

  for (const r of researches) {
    const legacy = orderLegacy(r.id);
    const fixed = orderFixed(r.id);
    const legacyIds = legacy.map((m) => m.id);
    const fixedIds = fixed.map((m) => m.id);
    const same =
      legacyIds.length === fixedIds.length && legacyIds.every((id, i) => id === fixedIds[i]);
    if (!same) {
      const stages = stagesByResearch.get(r.id) ?? [];
      mismatches.push({
        researchId: r.id,
        name: r.name,
        status: r.status,
        stageCount: stages.length,
        moduleCount: legacy.length,
        legacySequence: legacy.map((m) => `${m.name} [m=${m.order_index}]`),
        fixedSequence: fixed.map((m) => `${m.name} [m=${m.order_index}]`),
      });
    }
  }

  const report = {
    database: dbName,
    totalActiveResearches: researches.length,
    researchesWhereLegacyAndFixedOrderDiffer: mismatches.length,
    mismatches,
  };

  console.log(JSON.stringify(report, null, 2));

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
