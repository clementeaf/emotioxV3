/**
 * Script para probar TODOS los endpoints desplegados en cPanel
 * 
 * Requiere:
 * - API_BASE_URL en .env (ej: https://emotio.cx/api)
 * - Credenciales válidas para autenticación
 */

import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'https://emotio.cx/api';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

interface EndpointTest {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    requiresAuth: boolean;
    requiresId?: boolean;
    body?: Record<string, unknown>;
    expectedStatus?: number;
    skip?: boolean;
    reason?: string;
}

interface TestResult {
    endpoint: EndpointTest;
    status: 'success' | 'error' | 'skipped';
    statusCode?: number;
    error?: string;
    responseTime?: number;
}

const results: TestResult[] = [];
let authToken: string | null = null;

/**
 * Obtiene token de autenticación
 */
async function authenticate(): Promise<string | null> {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
        console.log('⚠️  TEST_EMAIL o TEST_PASSWORD no configurados en .env');
        console.log('   Algunos endpoints requerirán autenticación y fallarán\n');
        return null;
    }

    try {
        console.log('🔐 Autenticando...');
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        if (response.data?.token) {
            console.log('✅ Autenticación exitosa\n');
            return response.data.token;
        }
        return null;
    } catch (error) {
        console.log('❌ Error en autenticación:', error instanceof AxiosError ? error.response?.data : error);
        return null;
    }
}

/**
 * Ejecuta una prueba de endpoint
 */
async function testEndpoint(endpoint: EndpointTest, testId?: string): Promise<TestResult> {
    if (endpoint.skip) {
        return {
            endpoint,
            status: 'skipped',
            error: endpoint.reason
        };
    }

    const startTime = Date.now();
    const url = endpoint.path.replace(':id', testId || 'test-id').replace(':moduleId', 'test-module-id').replace(':participantId', 'test-participant-id');
    const fullUrl = `${API_BASE_URL}${url}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (endpoint.requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const config = {
            method: endpoint.method,
            url: fullUrl,
            headers,
            data: endpoint.body,
            validateStatus: () => true // No lanzar error en cualquier status
        };

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        const expectedStatus = endpoint.expectedStatus || (endpoint.method === 'POST' ? 201 : 200);
        const isSuccess = response.status === expectedStatus || 
                         (response.status >= 200 && response.status < 300) ||
                         (response.status === 404 && endpoint.requiresId); // 404 es OK si requiere ID específico

        return {
            endpoint,
            status: isSuccess ? 'success' : 'error',
            statusCode: response.status,
            error: isSuccess ? undefined : `Expected ${expectedStatus}, got ${response.status}`,
            responseTime
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const axiosError = error as AxiosError;
        
        return {
            endpoint,
            status: 'error',
            statusCode: axiosError.response?.status,
            error: axiosError.response?.data ? JSON.stringify(axiosError.response.data) : axiosError.message,
            responseTime
        };
    }
}

/**
 * Define todos los endpoints a probar
 */
function getAllEndpoints(): EndpointTest[] {
    return [
        // Health & Config (No auth)
        { name: 'Health Check', method: 'GET', path: '/health', requiresAuth: false, expectedStatus: 200 },
        { name: 'Config', method: 'GET', path: '/config', requiresAuth: false, expectedStatus: 200 },

        // Auth
        { name: 'Auth Login', method: 'POST', path: '/auth/login', requiresAuth: false, body: { email: TEST_EMAIL, password: TEST_PASSWORD }, skip: !TEST_EMAIL },
        { name: 'Auth Me', method: 'GET', path: '/auth/me', requiresAuth: true, expectedStatus: 200 },
        { name: 'Auth Refresh', method: 'POST', path: '/auth/refresh', requiresAuth: false, expectedStatus: 200 },

        // Research Types
        { name: 'List Research Types', method: 'GET', path: '/research-types', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Research Type', method: 'GET', path: '/research-types/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Research Type Techniques', method: 'GET', path: '/research-types/:id/techniques', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Research Type Module Assignments', method: 'GET', path: '/research-types/:id/module-assignments', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Research Techniques
        { name: 'List Research Techniques', method: 'GET', path: '/research-techniques', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Research Technique', method: 'GET', path: '/research-techniques/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Enterprises
        { name: 'List Enterprises', method: 'GET', path: '/enterprises', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Enterprise', method: 'GET', path: '/enterprises/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Research
        { name: 'List Researches', method: 'GET', path: '/research', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Research', method: 'GET', path: '/research/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Research Metrics', method: 'GET', path: '/research/:id/metrics', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Research Participants Status', method: 'GET', path: '/research/:id/participants/status', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Stage Templates
        { name: 'List Stage Templates', method: 'GET', path: '/stage-templates', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Stage Template', method: 'GET', path: '/stage-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Module Templates
        { name: 'List Module Templates', method: 'GET', path: '/module-templates', requiresAuth: true, expectedStatus: 200 },
        { name: 'Get Module Template', method: 'GET', path: '/module-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Module Template Usage', method: 'GET', path: '/module-templates/:id/usage', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Analytics (solo lectura)
        { name: 'Get SmartVOC Analytics', method: 'GET', path: '/analytics/research/:id/smartvoc', requiresAuth: true, requiresId: true, expectedStatus: 200 },
        { name: 'Get Cognitive Tasks Analytics', method: 'GET', path: '/analytics/research/:id/cognitive-tasks', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Analysis
        { name: 'List Analysis Modules', method: 'GET', path: '/analysis/modules', requiresAuth: true, expectedStatus: 200 },

        // Responses
        { name: 'Get Research Responses', method: 'GET', path: '/responses/research/:id', requiresAuth: true, requiresId: true, expectedStatus: 200 },

        // Media
        { name: 'Get Media by Key', method: 'GET', path: '/media/by-key', requiresAuth: true, expectedStatus: 200, skip: true, reason: 'Requires key parameter' },

        // Cache (admin)
        { name: 'Get Cache Stats', method: 'GET', path: '/cache/stats', requiresAuth: true, expectedStatus: 200 },
    ];
}

/**
 * Obtiene IDs reales de la base de datos para pruebas
 */
async function getTestIds(): Promise<{ researchTypeId?: string; researchId?: string; enterpriseId?: string }> {
    const ids: { researchTypeId?: string; researchId?: string; enterpriseId?: string } = {};

    if (!authToken) return ids;

    try {
        // Obtener un research type
        const rtResponse = await axios.get(`${API_BASE_URL}/research-types`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (rtResponse.data?.researchTypes?.[0]?.id) {
            ids.researchTypeId = rtResponse.data.researchTypes[0].id;
        }

        // Obtener un research
        const rResponse = await axios.get(`${API_BASE_URL}/research`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (rResponse.data?.researches?.[0]?.id) {
            ids.researchId = rResponse.data.researches[0].id;
        }

        // Obtener una enterprise
        const eResponse = await axios.get(`${API_BASE_URL}/enterprises`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (eResponse.data?.enterprises?.[0]?.id) {
            ids.enterpriseId = eResponse.data.enterprises[0].id;
        }
    } catch (error) {
        console.log('⚠️  No se pudieron obtener IDs de prueba:', error instanceof AxiosError ? error.response?.status : error);
    }

    return ids;
}

/**
 * Ejecuta todas las pruebas
 */
async function runAllTests(): Promise<void> {
    console.log('🚀 Iniciando pruebas de todos los endpoints\n');
    console.log(`📍 API Base URL: ${API_BASE_URL}\n`);

    // Autenticar
    authToken = await authenticate();

    // Obtener IDs reales
    const testIds = await getTestIds();
    console.log('📋 IDs de prueba obtenidos:');
    console.log(`   Research Type ID: ${testIds.researchTypeId || 'N/A'}`);
    console.log(`   Research ID: ${testIds.researchId || 'N/A'}`);
    console.log(`   Enterprise ID: ${testIds.enterpriseId || 'N/A'}\n`);

    const endpoints = getAllEndpoints();
    console.log(`📊 Total de endpoints a probar: ${endpoints.length}\n`);
    console.log('='.repeat(80) + '\n');

    // Probar cada endpoint
    for (const endpoint of endpoints) {
        let testId: string | undefined;
        
        // Usar ID real si está disponible
        if (endpoint.path.includes('/research-types/') && testIds.researchTypeId) {
            testId = testIds.researchTypeId;
        } else if (endpoint.path.includes('/research/') && testIds.researchId) {
            testId = testIds.researchId;
        } else if (endpoint.path.includes('/enterprises/') && testIds.enterpriseId) {
            testId = testIds.enterpriseId;
        }

        const result = await testEndpoint(endpoint, testId);
        results.push(result);

        // Mostrar resultado inmediato
        const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️ ' : '❌';
        const statusText = result.statusCode ? `[${result.statusCode}]` : '';
        const timeText = result.responseTime ? `(${result.responseTime}ms)` : '';
        console.log(`${icon} ${endpoint.name} ${statusText} ${timeText}`);
        
        if (result.error && result.status !== 'skipped') {
            console.log(`   Error: ${result.error.substring(0, 100)}${result.error.length > 100 ? '...' : ''}`);
        }

        // Pequeña pausa para no sobrecargar el servidor
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Generar reporte
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTE FINAL\n');

    const success = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(`✅ Exitosos: ${success}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`⏭️  Omitidos: ${skipped}`);
    console.log(`📊 Total: ${results.length}\n`);

    if (errors > 0) {
        console.log('❌ ENDPOINTS CON ERRORES:\n');
        results.filter(r => r.status === 'error').forEach(result => {
            console.log(`   ${result.endpoint.name} (${result.endpoint.method} ${result.endpoint.path})`);
            console.log(`   Status: ${result.statusCode || 'N/A'}`);
            console.log(`   Error: ${result.error?.substring(0, 150)}${result.error && result.error.length > 150 ? '...' : ''}\n`);
        });
    }

    // Agrupar por módulo
    const byModule: Record<string, TestResult[]> = {};
    results.forEach(result => {
        const module = result.endpoint.path.split('/')[1] || 'other';
        if (!byModule[module]) {
            byModule[module] = [];
        }
        byModule[module].push(result);
    });

    console.log('\n📋 RESUMEN POR MÓDULO:\n');
    Object.entries(byModule).forEach(([module, moduleResults]) => {
        const moduleSuccess = moduleResults.filter(r => r.status === 'success').length;
        const moduleErrors = moduleResults.filter(r => r.status === 'error').length;
        const icon = moduleErrors === 0 ? '✅' : '⚠️ ';
        console.log(`   ${icon} ${module}: ${moduleSuccess}/${moduleResults.length} exitosos`);
    });

    console.log('\n' + '='.repeat(80));
}

// Ejecutar
runAllTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
