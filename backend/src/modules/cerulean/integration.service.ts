/**
 * Cerulean Ledger Integration Service
 *
 * Four integration points with the blockchain:
 * 1. Research integrity — hash of analytics committed as transaction
 * 2. Study certification — verifiable credential on completion
 * 3. Participant identity — privacy-preserving DID registration
 * 4. Audit trail — researcher actions as transactions
 */

import { createHash, randomUUID } from 'crypto';
import pool from '../../config/database';
import * as cerulean from './client';

// ─── 1. Research Integrity ──────────────────────────────────────

export interface IntegrityCertification {
    txId: string;
    blockHeight: number;
    dataHash: string;
    researchId: string;
    certifiedAt: string;
}

/**
 * Compute SHA-256 hash of all research responses and commit to blockchain.
 * Called when a research status changes to completed/closed.
 */
export async function certifyResearchIntegrity(researchId: string): Promise<IntegrityCertification | null> {
    if (!cerulean.isEnabled()) return null;

    // Gather all responses for this research
    const responses = await pool.query(
        `SELECT participant_id, module_id, component_id, value, created_at
         FROM responses WHERE research_id = ?
         ORDER BY created_at ASC`,
        [researchId]
    );

    // Compute deterministic hash of all response data
    const hash = createHash('sha256');
    for (const row of responses.rows) {
        const r = row as { participant_id: string; module_id: string; component_id: string; value: unknown; created_at: string };
        hash.update(`${r.participant_id}|${r.module_id}|${r.component_id}|${JSON.stringify(r.value)}|${r.created_at}`);
    }
    const dataHash = hash.digest('hex');

    // Get research name
    const research = await pool.query('SELECT name FROM researches WHERE id = ?', [researchId]);
    const researchName = (research.rows[0] as { name: string })?.name || 'Unknown';

    // Submit to Cerulean Ledger
    const txId = `integrity-${researchId}-${Date.now()}`;
    const result = await cerulean.submitTransaction({
        transaction: {
            id: txId,
            input_did: `did:cerulean:emotiox-research-${researchId}`,
            output_recipient: 'emotiox-integrity-registry',
            amount: 0,
            data: {
                type: 'research_integrity',
                researchId,
                researchName,
                dataHash,
                responseCount: responses.rows.length,
                participantCount: new Set(responses.rows.map((r) => (r as { participant_id: string }).participant_id)).size,
                certifiedAt: new Date().toISOString(),
            },
        },
    });

    if (!result?.tx_id) {
        console.error('[Cerulean] Failed to certify research integrity');
        return null;
    }

    const certification: IntegrityCertification = {
        txId: result.tx_id,
        blockHeight: result.block_height || 0,
        dataHash,
        researchId,
        certifiedAt: new Date().toISOString(),
    };

    // Cache in research config
    const configResult = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    const config = typeof configResult.rows[0]?.config === 'string'
        ? JSON.parse(configResult.rows[0].config)
        : configResult.rows[0]?.config || {};
    config.blockchainCertification = certification;
    await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);

    console.log(`[Cerulean] Research ${researchId} integrity certified: tx=${result.tx_id}, hash=${dataHash.slice(0, 16)}...`);
    return certification;
}

/**
 * Verify research integrity by comparing current data hash with blockchain record.
 */
export async function verifyResearchIntegrity(researchId: string): Promise<{
    verified: boolean;
    currentHash: string;
    certifiedHash: string | null;
    certification: IntegrityCertification | null;
}> {
    // Get cached certification
    const configResult = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    const config = typeof configResult.rows[0]?.config === 'string'
        ? JSON.parse(configResult.rows[0].config)
        : configResult.rows[0]?.config || {};

    const certification = config.blockchainCertification as IntegrityCertification | undefined;

    // Recompute current hash
    const responses = await pool.query(
        `SELECT participant_id, module_id, component_id, value, created_at
         FROM responses WHERE research_id = ?
         ORDER BY created_at ASC`,
        [researchId]
    );

    const hash = createHash('sha256');
    for (const row of responses.rows) {
        const r = row as { participant_id: string; module_id: string; component_id: string; value: unknown; created_at: string };
        hash.update(`${r.participant_id}|${r.module_id}|${r.component_id}|${JSON.stringify(r.value)}|${r.created_at}`);
    }
    const currentHash = hash.digest('hex');

    return {
        verified: certification ? currentHash === certification.dataHash : false,
        currentHash,
        certifiedHash: certification?.dataHash || null,
        certification: certification || null,
    };
}

// ─── 2. Study Certification ─────────────────────────────────────

/**
 * Issue a verifiable credential on the blockchain for a completed study.
 */
export async function issueStudyCertificate(researchId: string): Promise<{ credentialId: string } | null> {
    if (!cerulean.isEnabled()) return null;

    const research = await pool.query(
        `SELECT r.name, r.status, r.created_at, r.updated_at,
                rt.name AS type_name, rtech.name AS technique_name,
                (SELECT COUNT(DISTINCT participant_id) FROM responses WHERE research_id = r.id) AS participant_count,
                (SELECT COUNT(*) FROM responses WHERE research_id = r.id) AS response_count
         FROM researches r
         LEFT JOIN research_types rt ON rt.id = r.research_type_id
         LEFT JOIN research_techniques rtech ON rtech.id = r.research_technique_id
         WHERE r.id = ?`,
        [researchId]
    );

    const r = research.rows[0] as {
        name: string; status: string; created_at: string; updated_at: string;
        type_name: string; technique_name: string; participant_count: number; response_count: number;
    };
    if (!r) return null;

    const credentialId = `cert-${researchId}-${Date.now()}`;

    await cerulean.issueCredential({
        id: credentialId,
        issuer_did: 'did:cerulean:emotiox-platform',
        subject_did: `did:cerulean:emotiox-research-${researchId}`,
        credential_type: 'ResearchCompletionCertificate',
        claims: {
            researchName: r.name,
            researchType: r.type_name,
            technique: r.technique_name,
            status: r.status,
            participantCount: Number(r.participant_count),
            responseCount: Number(r.response_count),
            startedAt: r.created_at,
            completedAt: r.updated_at,
        },
        issued_at: new Date().toISOString(),
    });

    // Cache credential ID
    const configResult = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    const config = typeof configResult.rows[0]?.config === 'string'
        ? JSON.parse(configResult.rows[0].config)
        : configResult.rows[0]?.config || {};
    config.blockchainCredentialId = credentialId;
    await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);

    console.log(`[Cerulean] Study certificate issued: ${credentialId}`);
    return { credentialId };
}

// ─── 3. Participant Identity ────────────────────────────────────

/**
 * Register a privacy-preserving DID for a participant.
 * No PII stored on chain — only a pseudonymous identifier.
 */
export async function registerParticipantDID(
    researchId: string,
    participantId: string,
): Promise<{ did: string } | null> {
    if (!cerulean.isEnabled()) return null;

    // Generate deterministic DID from research + participant (no PII)
    const didHash = createHash('sha256')
        .update(`${researchId}:${participantId}`)
        .digest('hex')
        .slice(0, 32);

    const did = `did:cerulean:participant-${didHash}`;

    // Generate a random public key placeholder (the DID is the identifier, not a real keypair)
    const publicKey = createHash('sha256').update(randomUUID()).digest('hex');

    await cerulean.registerIdentity({
        did,
        public_key: publicKey,
        metadata: {
            type: 'research_participant',
            researchId,
            registeredAt: new Date().toISOString(),
        },
    });

    return { did };
}

// ─── 4. Audit Trail ─────────────────────────────────────────────

export type AuditAction =
    | 'research.created'
    | 'research.activated'
    | 'research.closed'
    | 'research.modified'
    | 'research.deleted'
    | 'research.duplicated'
    | 'research.certified';

/**
 * Record a researcher action on the blockchain as an immutable audit entry.
 */
export async function recordAuditEvent(
    researchId: string,
    action: AuditAction,
    userId: string,
    metadata?: Record<string, unknown>,
): Promise<void> {
    if (!cerulean.isEnabled()) return;

    const txId = `audit-${researchId}-${action}-${Date.now()}`;

    await cerulean.storeTransaction({
        id: txId,
        input_did: `did:cerulean:emotiox-user-${userId}`,
        output_recipient: `did:cerulean:emotiox-research-${researchId}`,
        amount: 0,
        data: {
            type: 'audit_trail',
            action,
            researchId,
            userId,
            timestamp: new Date().toISOString(),
            ...metadata,
        },
    });
}
