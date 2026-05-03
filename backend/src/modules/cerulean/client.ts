/**
 * Cerulean Ledger Client
 *
 * HTTP client for the Cerulean Ledger blockchain API.
 * Handles transactions, identities (DID), and credentials.
 *
 * Configuration:
 *   CERULEAN_API_URL  — base URL (default: http://localhost:8080/api/v1)
 *   CERULEAN_ORG_ID   — organization ID for ACL headers
 *   CERULEAN_ENABLED  — set to "true" to enable (default: disabled)
 */

const CERULEAN_API_URL = process.env.CERULEAN_API_URL || 'http://localhost:8080/api/v1';
const CERULEAN_ORG_ID = process.env.CERULEAN_ORG_ID || 'emotiox';
const CERULEAN_ENABLED = process.env.CERULEAN_ENABLED === 'true';

interface CeruleanTransaction {
    id: string;
    input_did: string;
    output_recipient: string;
    amount: number;
    data?: Record<string, unknown>;
}

interface CeruleanIdentity {
    did: string;
    public_key: string;
    metadata?: Record<string, unknown>;
}

interface CeruleanCredential {
    id: string;
    issuer_did: string;
    subject_did: string;
    credential_type: string;
    claims: Record<string, unknown>;
    issued_at: string;
    expires_at?: string;
}

async function ceruleanFetch<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
): Promise<T | null> {
    if (!CERULEAN_ENABLED) return null;

    try {
        const url = `${CERULEAN_API_URL}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Org-Id': CERULEAN_ORG_ID,
            'X-Msp-Role': 'peer',
        };

        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            console.error(`[Cerulean] ${method} ${path} → ${res.status}`);
            return null;
        }

        const json = await res.json() as { data?: T };
        return json.data ?? null;
    } catch (err) {
        console.error(`[Cerulean] ${method} ${path} failed:`, err instanceof Error ? err.message : err);
        return null;
    }
}

/** Submit a transaction through the gateway (endorse → order → commit) */
export async function submitTransaction(tx: {
    chaincodeId?: string;
    transaction: CeruleanTransaction;
}): Promise<{ tx_id?: string; block_height?: number } | null> {
    return ceruleanFetch('/gateway/submit', 'POST', {
        chaincode_id: tx.chaincodeId || 'emotiox',
        transaction: tx.transaction,
    });
}

/** Write a transaction directly to the store */
export async function storeTransaction(tx: CeruleanTransaction): Promise<unknown> {
    return ceruleanFetch('/store/transactions', 'POST', tx);
}

/** Read a transaction by ID */
export async function getTransaction(txId: string): Promise<CeruleanTransaction | null> {
    return ceruleanFetch(`/store/transactions/${txId}`);
}

/** Register an identity (DID) */
export async function registerIdentity(identity: CeruleanIdentity): Promise<unknown> {
    return ceruleanFetch('/store/identities', 'POST', identity);
}

/** Get an identity by DID */
export async function getIdentity(did: string): Promise<CeruleanIdentity | null> {
    return ceruleanFetch(`/store/identities/${did}`);
}

/** Issue a credential */
export async function issueCredential(credential: CeruleanCredential): Promise<unknown> {
    return ceruleanFetch('/store/credentials', 'POST', credential);
}

/** Get a credential by ID */
export async function getCredential(credentialId: string): Promise<CeruleanCredential | null> {
    return ceruleanFetch(`/store/credentials/${credentialId}`);
}

/** Check if Cerulean integration is enabled */
export function isEnabled(): boolean {
    return CERULEAN_ENABLED;
}

/** Get the configured API URL (for status display) */
export function getApiUrl(): string {
    return CERULEAN_API_URL;
}
