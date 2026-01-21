/**
 * Script para probar TODOS los endpoints del backend desplegado en cPanel
 * 
 * Características:
 * - Crea un usuario de prueba automáticamente si no existe
 * - Prueba todos los endpoints públicos y autenticados
 * - Genera un reporte detallado
 * 
 * Uso:
 *   npm run test:endpoints:cpanel
 *   o
 *   npx tsx scripts/test-all-endpoints-cpanel.ts
 */

import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'https://emotio.cx/api';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@emotiox.test';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const TEST_USER_FIRST_NAME = process.env.TEST_USER_FIRST_NAME || 'Test';
const TEST_USER_LAST_NAME = process.env.TEST_USER_LAST_NAME || 'User';

interface EndpointTest {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    requiresAuth: boolean;
    requiresId?: boolean;
    body?: Record<string, unknown>;
    queryParams?: Record<string, string>;
    expectedStatus?: number | number[];
    skip?: boolean;
    reason?: string;
    category: string;
}

interface TestResult {
    endpoint: EndpointTest;
    status: 'success' | 'error' | 'skipped';
    statusCode?: number;
    error?: string;
    responseTime?: number;
    responseData?: unknown;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let testUserCreated = false;
let testIds: {
    researchTypeId?: string;
    researchTechniqueId?: string;
    researchId?: string;
    enterpriseId?: string;
    stageTemplateId?: string;
    moduleTemplateId?: string;
    stageId?: string;
    moduleId?: string;
} = {};

/**
 * Crea un usuario de prueba si no existe
 */
async function createTestUser(): Promise<boolean> {
    try {
        console.log('🔍 Verificando si existe usuario de prueba...');
        
        // Intentar login primero
        try {
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            });
            
            if (loginResponse.data?.token) {
                console.log('✅ Usuario de prueba ya existe');
                authToken = loginResponse.data.token;
                return false;
            }
        } catch (loginError) {
            // Usuario no existe o credenciales incorrectas, continuar con registro
        }
        
        // Intentar registrar usuario
        console.log('📝 Creando usuario de prueba...');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            email: TEST_USER_EMAIL,
            password: TEST_USER_PASSWORD,
            firstName: TEST_USER_FIRST_NAME,
            lastName: TEST_USER_LAST_NAME,
            role: 'researcher'
        });
        
        if (registerResponse.status === 201 || registerResponse.status === 200) {
            console.log('✅ Usuario de prueba creado exitosamente');
            testUserCreated = true;
            
            // Intentar login con el nuevo usuario
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            });
            
            if (loginResponse.data?.token) {
                authToken = loginResponse.data.token;
                console.log('✅ Autenticación exitosa con usuario de prueba\n');
                return true;
            }
        }
        
        return false;
    } catch (error) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 409 || axiosError.response?.status === 400) {
            // Usuario ya existe, intentar login
            console.log('⚠️  Usuario ya existe, intentando login...');
            try {
                const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                    email: TEST_USER_EMAIL,
                    password: TEST_USER_PASSWORD
                });
                
                if (loginResponse.data?.token) {
                    authToken = loginResponse.data.token;
                    console.log('✅ Autenticación exitosa\n');
                    return false;
                }
            } catch (loginError) {
                console.log('❌ Error al autenticar usuario existente');
                return false;
            }
        }
        
        console.log('❌ Error al crear usuario de prueba:', axiosError.response?.data || axiosError.message);
        return false;
    }
}

/**
 * Obtiene IDs reales de la base de datos para pruebas
 */
async function getTestIds(): Promise<void> {
    if (!authToken) return;

    try {
        // Obtener research types
        try {
            const rtResponse = await axios.get(`${API_BASE_URL}/research-types`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (rtResponse.status === 200 && rtResponse.data?.researchTypes?.[0]?.id) {
                testIds.researchTypeId = rtResponse.data.researchTypes[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }

        // Obtener research techniques
        try {
            const rtechResponse = await axios.get(`${API_BASE_URL}/research-techniques`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (rtechResponse.status === 200 && rtechResponse.data?.researchTechniques?.[0]?.id) {
                testIds.researchTechniqueId = rtechResponse.data.researchTechniques[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }

        // Obtener researches
        try {
            const rResponse = await axios.get(`${API_BASE_URL}/research`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (rResponse.status === 200 && rResponse.data?.researches?.[0]?.id) {
                testIds.researchId = rResponse.data.researches[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }

        // Obtener enterprises
        try {
            const eResponse = await axios.get(`${API_BASE_URL}/enterprises`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (eResponse.status === 200 && eResponse.data?.enterprises?.[0]?.id) {
                testIds.enterpriseId = eResponse.data.enterprises[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }

        // Obtener stage templates
        try {
            const stResponse = await axios.get(`${API_BASE_URL}/stage-templates`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (stResponse.status === 200 && stResponse.data?.stageTemplates?.[0]?.id) {
                testIds.stageTemplateId = stResponse.data.stageTemplates[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }

        // Obtener module templates
        try {
            const mtResponse = await axios.get(`${API_BASE_URL}/module-templates`, {
                headers: { Authorization: `Bearer ${authToken}` },
                validateStatus: () => true
            });
            if (mtResponse.status === 200 && mtResponse.data?.moduleTemplates?.[0]?.id) {
                testIds.moduleTemplateId = mtResponse.data.moduleTemplates[0].id;
            }
        } catch (error) {
            // Ignorar errores
        }
    } catch (error) {
        console.log('⚠️  No se pudieron obtener algunos IDs de prueba');
    }
}

/**
 * Ejecuta una prueba de endpoint
 */
async function testEndpoint(endpoint: EndpointTest): Promise<TestResult> {
    if (endpoint.skip) {
        return {
            endpoint,
            status: 'skipped',
            error: endpoint.reason
        };
    }

    const startTime = Date.now();
    let url = endpoint.path;
    
    // Reemplazar placeholders con IDs reales
    if (endpoint.requiresId) {
        if (url.includes('/research-types/:id') && testIds.researchTypeId) {
            url = url.replace('/research-types/:id', `/research-types/${testIds.researchTypeId}`);
        } else if (url.includes('/research-techniques/:id') && testIds.researchTechniqueId) {
            url = url.replace('/research-techniques/:id', `/research-techniques/${testIds.researchTechniqueId}`);
        } else if (url.includes('/research/:id') && testIds.researchId) {
            url = url.replace('/research/:id', `/research/${testIds.researchId}`);
        } else if (url.includes('/enterprises/:id') && testIds.enterpriseId) {
            url = url.replace('/enterprises/:id', `/enterprises/${testIds.enterpriseId}`);
        } else if (url.includes('/stage-templates/:id') && testIds.stageTemplateId) {
            url = url.replace('/stage-templates/:id', `/stage-templates/${testIds.stageTemplateId}`);
        } else if (url.includes('/module-templates/:id') && testIds.moduleTemplateId) {
            url = url.replace('/module-templates/:id', `/module-templates/${testIds.moduleTemplateId}`);
        } else if (url.includes('/stages/:id') && testIds.stageId) {
            url = url.replace('/stages/:id', `/stages/${testIds.stageId}`);
        } else if (url.includes('/modules/:id') && testIds.moduleId) {
            url = url.replace('/modules/:id', `/modules/${testIds.moduleId}`);
        } else if (url.includes(':id')) {
            url = url.replace(':id', 'test-id');
        }
        
        if (url.includes(':moduleId') && testIds.moduleId) {
            url = url.replace(':moduleId', testIds.moduleId);
        } else if (url.includes(':moduleId')) {
            url = url.replace(':moduleId', 'test-module-id');
        }
        
        if (url.includes(':participantId')) {
            url = url.replace(':participantId', 'test-participant-id');
        }
    }
    
    const fullUrl = `${API_BASE_URL}${url}`;
    
    // Agregar query params si existen
    let finalUrl = fullUrl;
    if (endpoint.queryParams) {
        const params = new URLSearchParams(endpoint.queryParams);
        finalUrl = `${fullUrl}?${params.toString()}`;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (endpoint.requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const config = {
            method: endpoint.method,
            url: finalUrl,
            headers,
            data: endpoint.body,
            validateStatus: () => true // No lanzar error en cualquier status
        };

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
            ? endpoint.expectedStatus 
            : [endpoint.expectedStatus || (endpoint.method === 'POST' ? 201 : 200)];
        
        const isSuccess = expectedStatuses.includes(response.status) || 
                         (response.status >= 200 && response.status < 300) ||
                         (response.status === 404 && endpoint.requiresId && !url.includes('test-id')); // 404 es OK si requiere ID específico pero no tenemos uno real

        return {
            endpoint,
            status: isSuccess ? 'success' : 'error',
            statusCode: response.status,
            error: isSuccess ? undefined : `Expected one of ${expectedStatuses.join(', ')}, got ${response.status}`,
            responseTime,
            responseData: response.data
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const axiosError = error as AxiosError;
        
        return {
            endpoint,
            status: 'error',
            statusCode: axiosError.response?.status,
            error: axiosError.response?.data ? JSON.stringify(axiosError.response.data).substring(0, 200) : axiosError.message,
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
        { name: 'Health Check', method: 'GET', path: '/health', requiresAuth: false, expectedStatus: 200, category: 'System' },
        { name: 'Config', method: 'GET', path: '/config', requiresAuth: false, expectedStatus: 200, category: 'System' },
        { name: 'Debug Headers', method: 'GET', path: '/debug-headers', requiresAuth: false, expectedStatus: 200, category: 'System' },

        // Auth
        { name: 'Auth Register', method: 'POST', path: '/auth/register', requiresAuth: false, 
          body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD, firstName: TEST_USER_FIRST_NAME, lastName: TEST_USER_LAST_NAME }, 
          expectedStatus: [200, 201, 409], category: 'Auth' },
        { name: 'Auth Login', method: 'POST', path: '/auth/login', requiresAuth: false, 
          body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }, 
          expectedStatus: 200, category: 'Auth' },
        { name: 'Auth Me', method: 'GET', path: '/auth/me', requiresAuth: true, expectedStatus: 200, category: 'Auth' },
        { name: 'Auth Refresh', method: 'POST', path: '/auth/refresh', requiresAuth: false, expectedStatus: [200, 401], category: 'Auth' },
        { name: 'Auth Logout', method: 'POST', path: '/auth/logout', requiresAuth: true, expectedStatus: [200, 204], category: 'Auth' },

        // Research Types
        { name: 'List Research Types', method: 'GET', path: '/research-types', requiresAuth: true, expectedStatus: 200, category: 'Research Types' },
        { name: 'Get Research Type', method: 'GET', path: '/research-types/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Get Research Type Techniques', method: 'GET', path: '/research-types/:id/techniques', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Get Research Type Module Assignments', method: 'GET', path: '/research-types/:id/module-assignments', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },

        // Research Techniques
        { name: 'List Research Techniques', method: 'GET', path: '/research-techniques', requiresAuth: true, expectedStatus: 200, category: 'Research Techniques' },
        { name: 'Get Research Technique', method: 'GET', path: '/research-techniques/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Techniques' },

        // Enterprises
        { name: 'List Enterprises', method: 'GET', path: '/enterprises', requiresAuth: true, expectedStatus: 200, category: 'Enterprises' },
        { name: 'Get Enterprise', method: 'GET', path: '/enterprises/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Enterprises' },

        // Research
        { name: 'List Researches', method: 'GET', path: '/research', requiresAuth: true, expectedStatus: 200, category: 'Research' },
        { name: 'Get Research', method: 'GET', path: '/research/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Metrics', method: 'GET', path: '/research/:id/metrics', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Participants Status', method: 'GET', path: '/research/:id/participants/status', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Stages', method: 'GET', path: '/research/:id/stages', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Modules', method: 'GET', path: '/research/:id/modules', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },

        // Stage Templates
        { name: 'List Stage Templates', method: 'GET', path: '/stage-templates', requiresAuth: true, expectedStatus: 200, category: 'Stage Templates' },
        { name: 'Get Stage Template', method: 'GET', path: '/stage-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Stage Templates' },

        // Module Templates
        { name: 'List Module Templates', method: 'GET', path: '/module-templates', requiresAuth: true, expectedStatus: 200, category: 'Module Templates' },
        { name: 'Get Module Template', method: 'GET', path: '/module-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Module Templates' },
        { name: 'Get Module Template Usage', method: 'GET', path: '/module-templates/:id/usage', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Module Templates' },

        // Analytics
        { name: 'Get SmartVOC Analytics', method: 'GET', path: '/analytics/research/:id/smartvoc', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Cognitive Tasks Analytics', method: 'GET', path: '/analytics/research/:id/cognitive-tasks', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Navigation Flow Analytics', method: 'GET', path: '/analytics/research/:id/navigation-flow/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Preference Test Analytics', method: 'GET', path: '/analytics/research/:id/preference-test/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Text Responses Analytics', method: 'GET', path: '/analytics/research/:id/text-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Choice Responses Analytics', method: 'GET', path: '/analytics/research/:id/choice-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Scale Responses Analytics', method: 'GET', path: '/analytics/research/:id/scale-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Ranking Responses Analytics', method: 'GET', path: '/analytics/research/:id/ranking-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },

        // Analysis
        { name: 'List Analysis Modules', method: 'GET', path: '/analysis/modules', requiresAuth: true, expectedStatus: 200, category: 'Analysis' },

        // Responses
        { name: 'Get Research Responses', method: 'GET', path: '/responses/research/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Responses' },
        { name: 'Get Participant Responses', method: 'GET', path: '/responses/research/:id/participant/:participantId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Responses' },

        // Media
        { name: 'Get Media by Key', method: 'GET', path: '/media/by-key', requiresAuth: true, 
          queryParams: { key: 'test-key' }, expectedStatus: [200, 404], skip: true, reason: 'Requires valid key', category: 'Media' },

        // Cache
        { name: 'Get Cache Stats', method: 'GET', path: '/cache/stats', requiresAuth: true, expectedStatus: [200, 401, 403], category: 'Cache' },

        // Public endpoints
        { name: 'Get Public Research', method: 'GET', path: '/public/research/:id', requiresAuth: false, requiresId: true, expectedStatus: [200, 404], category: 'Public' },
        { name: 'Get Public Media by Key', method: 'GET', path: '/public/media/by-key', requiresAuth: false, 
          queryParams: { s3_key: 'test-key' }, expectedStatus: [200, 404], skip: true, reason: 'Requires valid key', category: 'Public' },

        // Users
        { name: 'List Users', method: 'GET', path: '/users', requiresAuth: true, expectedStatus: [200, 401, 403], category: 'Users' },
    ];
}

/**
 * Ejecuta todas las pruebas
 */
async function runAllTests(): Promise<void> {
    console.log('🚀 Iniciando pruebas de TODOS los endpoints del backend en cPanel\n');
    console.log(`📍 API Base URL: ${API_BASE_URL}\n`);

    // Crear usuario de prueba
    await createTestUser();

    if (!authToken) {
        console.log('❌ No se pudo obtener token de autenticación. Algunos endpoints requerirán auth y fallarán.\n');
    }

    // Obtener IDs reales
    await getTestIds();
    console.log('📋 IDs de prueba obtenidos:');
    console.log(`   Research Type ID: ${testIds.researchTypeId || 'N/A'}`);
    console.log(`   Research Technique ID: ${testIds.researchTechniqueId || 'N/A'}`);
    console.log(`   Research ID: ${testIds.researchId || 'N/A'}`);
    console.log(`   Enterprise ID: ${testIds.enterpriseId || 'N/A'}`);
    console.log(`   Stage Template ID: ${testIds.stageTemplateId || 'N/A'}`);
    console.log(`   Module Template ID: ${testIds.moduleTemplateId || 'N/A'}\n`);

    const endpoints = getAllEndpoints();
    console.log(`📊 Total de endpoints a probar: ${endpoints.length}\n`);
    console.log('='.repeat(80) + '\n');

    // Probar cada endpoint
    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        results.push(result);

        // Mostrar resultado inmediato
        const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️ ' : '❌';
        const statusText = result.statusCode ? `[${result.statusCode}]` : '';
        const timeText = result.responseTime ? `(${result.responseTime}ms)` : '';
        console.log(`${icon} ${endpoint.name} ${statusText} ${timeText}`);
        
        if (result.error && result.status !== 'skipped') {
            const errorPreview = result.error.substring(0, 100);
            console.log(`   Error: ${errorPreview}${result.error.length > 100 ? '...' : ''}`);
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

    if (testUserCreated) {
        console.log(`👤 Usuario de prueba creado: ${TEST_USER_EMAIL}\n`);
    }

    if (errors > 0) {
        console.log('❌ ENDPOINTS CON ERRORES:\n');
        results.filter(r => r.status === 'error').forEach(result => {
            console.log(`   ${result.endpoint.name} (${result.endpoint.method} ${result.endpoint.path})`);
            console.log(`   Status: ${result.statusCode || 'N/A'}`);
            const errorPreview = result.error?.substring(0, 150) || 'Unknown error';
            console.log(`   Error: ${errorPreview}${result.error && result.error.length > 150 ? '...' : ''}\n`);
        });
    }

    // Agrupar por categoría
    const byCategory: Record<string, TestResult[]> = {};
    results.forEach(result => {
        const category = result.endpoint.category || 'other';
        if (!byCategory[category]) {
            byCategory[category] = [];
        }
        byCategory[category].push(result);
    });

    console.log('\n📋 RESUMEN POR CATEGORÍA:\n');
    Object.entries(byCategory).forEach(([category, categoryResults]) => {
        const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
        const categoryErrors = categoryResults.filter(r => r.status === 'error').length;
        const categorySkipped = categoryResults.filter(r => r.status === 'skipped').length;
        const icon = categoryErrors === 0 ? '✅' : '⚠️ ';
        console.log(`   ${icon} ${category}: ${categorySuccess}/${categoryResults.length} exitosos (${categoryErrors} errores, ${categorySkipped} omitidos)`);
    });

    console.log('\n' + '='.repeat(80));
    
    // Exit code basado en resultados
    if (errors > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Ejecutar
runAllTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
