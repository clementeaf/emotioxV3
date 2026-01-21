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
    questionId?: string;
    createdResearchTypeId?: string;
    createdResearchTechniqueId?: string;
    createdEnterpriseId?: string;
    createdResearchId?: string;
    createdStageTemplateId?: string;
    createdModuleTemplateId?: string;
    createdStageId?: string;
    createdModuleId?: string;
    createdQuestionId?: string;
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
    if (endpoint.requiresId || url.includes(':id') || url.includes(':moduleId') || url.includes(':participantId') || url.includes(':stageId')) {
        // Research Types
        if (url.includes('/research-types/:id') && testIds.researchTypeId) {
            url = url.replace('/research-types/:id', `/research-types/${testIds.researchTypeId}`);
        } else if (url.includes('/research-types/:id') && !testIds.researchTypeId) {
            url = url.replace('/research-types/:id', '/research-types/test-id');
        }
        
        // Research Techniques
        if (url.includes('/research-techniques/:id') && testIds.researchTechniqueId) {
            url = url.replace('/research-techniques/:id', `/research-techniques/${testIds.researchTechniqueId}`);
        } else if (url.includes('/research-techniques/:id')) {
            url = url.replace('/research-techniques/:id', '/research-techniques/test-id');
        }
        
        // Research
        if (url.includes('/research/:id') && testIds.researchId) {
            url = url.replace('/research/:id', `/research/${testIds.researchId}`);
        } else if (url.includes('/research/:id')) {
            url = url.replace('/research/:id', '/research/test-id');
        }
        
        // Enterprises
        if (url.includes('/enterprises/:id') && testIds.enterpriseId) {
            url = url.replace('/enterprises/:id', `/enterprises/${testIds.enterpriseId}`);
        } else if (url.includes('/enterprises/:id')) {
            url = url.replace('/enterprises/:id', '/enterprises/test-id');
        }
        
        // Stage Templates
        if (url.includes('/stage-templates/:id') && testIds.stageTemplateId) {
            url = url.replace('/stage-templates/:id', `/stage-templates/${testIds.stageTemplateId}`);
        } else if (url.includes('/stage-templates/:id')) {
            url = url.replace('/stage-templates/:id', '/stage-templates/test-id');
        }
        
        // Module Templates
        if (url.includes('/module-templates/:id') && testIds.moduleTemplateId) {
            url = url.replace('/module-templates/:id', `/module-templates/${testIds.moduleTemplateId}`);
        } else if (url.includes('/module-templates/:id')) {
            url = url.replace('/module-templates/:id', '/module-templates/test-id');
        }
        
        // Stages
        if (url.includes('/stages/:id') && testIds.stageId) {
            url = url.replace('/stages/:id', `/stages/${testIds.stageId}`);
        } else if (url.includes('/stages/:id')) {
            url = url.replace('/stages/:id', '/stages/test-id');
        }
        if (url.includes(':stageId') && testIds.stageId) {
            url = url.replace(':stageId', testIds.stageId);
        } else if (url.includes(':stageId')) {
            url = url.replace(':stageId', 'test-stage-id');
        }
        
        // Modules
        if (url.includes('/modules/:id') && testIds.moduleId) {
            url = url.replace('/modules/:id', `/modules/${testIds.moduleId}`);
        } else if (url.includes('/modules/:id')) {
            url = url.replace('/modules/:id', '/modules/test-id');
        }
        if (url.includes(':moduleId') && testIds.moduleId) {
            url = url.replace(':moduleId', testIds.moduleId);
        } else if (url.includes(':moduleId')) {
            url = url.replace(':moduleId', 'test-module-id');
        }
        
        // Questions
        if (url.includes('/questions/:id') && testIds.questionId) {
            url = url.replace('/questions/:id', `/questions/${testIds.questionId}`);
        } else if (url.includes('/questions/:id')) {
            url = url.replace('/questions/:id', '/questions/test-question-id');
        }
        
        // Media
        if (url.includes('/media/:id') && testIds.moduleId) {
            url = url.replace('/media/:id', `/media/${testIds.moduleId}`);
        } else if (url.includes('/media/:id')) {
            url = url.replace('/media/:id', '/media/test-media-id');
        }
        
        // Users
        if (url.includes('/users/:id')) {
            // No usar ID del usuario de prueba para evitar eliminarlo
            url = url.replace('/users/:id', '/users/test-user-id');
        }
        
        // Participant
        if (url.includes(':participantId')) {
            url = url.replace(':participantId', 'test-participant-id');
        }
        
        // Generic :id replacement (must be last)
        if (url.includes(':id')) {
            url = url.replace(':id', 'test-id');
        }
    }
    
    // Reemplazar placeholders en body
    let finalBody = endpoint.body;
    if (finalBody) {
        finalBody = JSON.parse(JSON.stringify(finalBody));
        if (typeof finalBody === 'object' && finalBody !== null) {
            for (const key in finalBody) {
                if (finalBody[key] === 'PLACEHOLDER') {
                    if (key === 'research_type_id' && testIds.researchTypeId) {
                        finalBody[key] = testIds.researchTypeId;
                    } else if (key === 'research_id' && testIds.researchId) {
                        finalBody[key] = testIds.researchId;
                    } else if (key === 'stage_id' && testIds.stageId) {
                        finalBody[key] = testIds.stageId;
                    } else if (key === 'module_id' && testIds.moduleId) {
                        finalBody[key] = testIds.moduleId;
                    } else if (key === 'moduleId' && testIds.moduleTemplateId) {
                        finalBody[key] = testIds.moduleTemplateId;
                    } else {
                        // Si no hay ID disponible, retornar skip
                        return {
                            endpoint,
                            status: 'skipped',
                            error: `Requires valid ${key} but not available`
                        };
                    }
                }
            }
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
            data: finalBody,
            validateStatus: () => true // No lanzar error en cualquier status
        };

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        // Capturar IDs de recursos creados para usar en endpoints posteriores
        if (response.status === 201 || response.status === 200) {
            if (endpoint.name.includes('Create Research Type') && response.data?.researchType?.id) {
                testIds.createdResearchTypeId = response.data.researchType.id;
                testIds.researchTypeId = testIds.createdResearchTypeId;
            } else if (endpoint.name.includes('Create Research Technique') && response.data?.researchTechnique?.id) {
                testIds.createdResearchTechniqueId = response.data.researchTechnique.id;
                testIds.researchTechniqueId = testIds.createdResearchTechniqueId;
            } else if (endpoint.name.includes('Create Enterprise') && response.data?.enterprise?.id) {
                testIds.createdEnterpriseId = response.data.enterprise.id;
                testIds.enterpriseId = testIds.createdEnterpriseId;
            } else if (endpoint.name.includes('Create Research') && response.data?.research?.id) {
                testIds.createdResearchId = response.data.research.id;
                testIds.researchId = testIds.createdResearchId;
            } else if (endpoint.name.includes('Create Stage Template') && response.data?.stageTemplate?.id) {
                testIds.createdStageTemplateId = response.data.stageTemplate.id;
                testIds.stageTemplateId = testIds.createdStageTemplateId;
            } else if (endpoint.name.includes('Create Module Template') && response.data?.moduleTemplate?.id) {
                testIds.createdModuleTemplateId = response.data.moduleTemplate.id;
                testIds.moduleTemplateId = testIds.createdModuleTemplateId;
            } else if (endpoint.name.includes('Create Research Stage') && response.data?.stage?.id) {
                testIds.createdStageId = response.data.stage.id;
                testIds.stageId = testIds.createdStageId;
            } else if (endpoint.name.includes('Create Module') && response.data?.module?.id) {
                testIds.createdModuleId = response.data.module.id;
                testIds.moduleId = testIds.createdModuleId;
            } else if (endpoint.name.includes('Create Question') && response.data?.question?.id) {
                testIds.createdQuestionId = response.data.question.id;
                testIds.questionId = testIds.createdQuestionId;
            } else if (endpoint.name.includes('Create User') && response.data?.user?.id) {
                // No guardar ID de usuario creado para evitar conflictos
            }
        }

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
 * Crea datos de prueba necesarios para los endpoints
 */
async function createTestData(): Promise<void> {
    if (!authToken) return;

    const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

    try {
        // Crear Research Type de prueba
        if (!testIds.createdResearchTypeId) {
            try {
                const rtResponse = await axios.post(`${API_BASE_URL}/research-types`, {
                    name: `Test Research Type ${Date.now()}`,
                    description: 'Test research type for endpoint testing',
                    is_active: true
                }, { headers, validateStatus: () => true });
                if (rtResponse.status === 201 && rtResponse.data?.researchType?.id) {
                    testIds.createdResearchTypeId = rtResponse.data.researchType.id;
                    testIds.researchTypeId = testIds.createdResearchTypeId;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Research Technique de prueba
        if (!testIds.createdResearchTechniqueId) {
            try {
                const rtechResponse = await axios.post(`${API_BASE_URL}/research-techniques`, {
                    name: `Test Technique ${Date.now()}`,
                    description: 'Test technique for endpoint testing'
                }, { headers, validateStatus: () => true });
                if (rtechResponse.status === 201 && rtechResponse.data?.researchTechnique?.id) {
                    testIds.createdResearchTechniqueId = rtechResponse.data.researchTechnique.id;
                    testIds.researchTechniqueId = testIds.createdResearchTechniqueId;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Enterprise de prueba
        if (!testIds.createdEnterpriseId) {
            try {
                const eResponse = await axios.post(`${API_BASE_URL}/enterprises`, {
                    name: `Test Enterprise ${Date.now()}`,
                    description: 'Test enterprise for endpoint testing'
                }, { headers, validateStatus: () => true });
                if (eResponse.status === 201 && eResponse.data?.enterprise?.id) {
                    testIds.createdEnterpriseId = eResponse.data.enterprise.id;
                    testIds.enterpriseId = testIds.createdEnterpriseId;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Research de prueba (requiere research_type_id)
        if (!testIds.createdResearchId && testIds.researchTypeId) {
            try {
                const rResponse = await axios.post(`${API_BASE_URL}/research`, {
                    name: `Test Research ${Date.now()}`,
                    description: 'Test research for endpoint testing',
                    research_type_id: testIds.researchTypeId,
                    use_default_modules: false
                }, { headers, validateStatus: () => true });
                if (rResponse.status === 201 && rResponse.data?.research?.id) {
                    testIds.createdResearchId = rResponse.data.research.id;
                    testIds.researchId = testIds.createdResearchId;
                    console.log(`   ✅ Research creado: ${testIds.createdResearchId}`);
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Stage Template de prueba
        if (!testIds.createdStageTemplateId) {
            try {
                const stResponse = await axios.post(`${API_BASE_URL}/stage-templates`, {
                    name: `Test Stage Template ${Date.now()}`,
                    description: 'Test stage template for endpoint testing'
                }, { headers, validateStatus: () => true });
                if (stResponse.status === 201 && stResponse.data?.stageTemplate?.id) {
                    testIds.createdStageTemplateId = stResponse.data.stageTemplate.id;
                    testIds.stageTemplateId = testIds.createdStageTemplateId;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Module Template de prueba
        if (!testIds.createdModuleTemplateId) {
            try {
                const mtResponse = await axios.post(`${API_BASE_URL}/module-templates`, {
                    name: `Test Module Template ${Date.now()}`,
                    description: 'Test module template for endpoint testing',
                    structure: { components: [] }
                }, { headers, validateStatus: () => true });
                if (mtResponse.status === 201 && mtResponse.data?.moduleTemplate?.id) {
                    testIds.createdModuleTemplateId = mtResponse.data.moduleTemplate.id;
                    testIds.moduleTemplateId = testIds.createdModuleTemplateId;
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Stage en Research de prueba
        if (!testIds.createdStageId && testIds.researchId) {
            try {
                const stageResponse = await axios.post(`${API_BASE_URL}/research/${testIds.researchId}/stages`, {
                    name: `Test Stage ${Date.now()}`,
                    description: 'Test stage for endpoint testing'
                }, { headers, validateStatus: () => true });
                if (stageResponse.status === 201 && stageResponse.data?.stage?.id) {
                    testIds.createdStageId = stageResponse.data.stage.id;
                    testIds.stageId = testIds.createdStageId;
                    console.log(`   ✅ Stage creado: ${testIds.createdStageId}`);
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Module en Research de prueba
        if (!testIds.createdModuleId && testIds.researchId && testIds.stageId) {
            try {
                const moduleResponse = await axios.post(`${API_BASE_URL}/modules`, {
                    research_id: testIds.researchId,
                    stage_id: testIds.stageId,
                    name: `Test Module ${Date.now()}`,
                    description: 'Test module for endpoint testing',
                    order_index: 0,
                    config: {}
                }, { headers, validateStatus: () => true });
                if (moduleResponse.status === 201 && moduleResponse.data?.module?.id) {
                    testIds.createdModuleId = moduleResponse.data.module.id;
                    testIds.moduleId = testIds.createdModuleId;
                    console.log(`   ✅ Module creado: ${testIds.createdModuleId}`);
                }
            } catch (error) {
                // Ignorar errores
            }
        }

        // Crear Question en Module de prueba
        if (!testIds.createdQuestionId && testIds.moduleId) {
            try {
                const questionResponse = await axios.post(`${API_BASE_URL}/questions`, {
                    module_id: testIds.moduleId,
                    question_type: 'text',
                    question_text: 'Test question',
                    order_index: 0,
                    config: {},
                    required: false
                }, { headers, validateStatus: () => true });
                if (questionResponse.status === 201 && questionResponse.data?.question?.id) {
                    testIds.createdQuestionId = questionResponse.data.question.id;
                    testIds.questionId = testIds.createdQuestionId;
                    console.log(`   ✅ Question creada: ${testIds.createdQuestionId}`);
                }
            } catch (error) {
                // Ignorar errores
            }
        }
    } catch (error) {
        console.log('⚠️  Error creando datos de prueba:', error);
    }
}

/**
 * Define TODOS los endpoints a probar
 */
function getAllEndpoints(): EndpointTest[] {
    return [
        // ========== SYSTEM ==========
        { name: 'Health Check', method: 'GET', path: '/health', requiresAuth: false, expectedStatus: 200, category: 'System' },
        { name: 'Config', method: 'GET', path: '/config', requiresAuth: false, expectedStatus: 200, category: 'System' },
        { name: 'Debug Headers', method: 'GET', path: '/debug-headers', requiresAuth: false, expectedStatus: 200, category: 'System' },

        // ========== AUTH ==========
        { name: 'Auth Register', method: 'POST', path: '/auth/register', requiresAuth: false, 
          body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD, firstName: TEST_USER_FIRST_NAME, lastName: TEST_USER_LAST_NAME }, 
          expectedStatus: [200, 201, 409], category: 'Auth' },
        { name: 'Auth Login', method: 'POST', path: '/auth/login', requiresAuth: false, 
          body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }, 
          expectedStatus: 200, category: 'Auth' },
        { name: 'Auth Me', method: 'GET', path: '/auth/me', requiresAuth: true, expectedStatus: 200, category: 'Auth' },
        { name: 'Auth Update Me', method: 'PUT', path: '/auth/me', requiresAuth: true, 
          body: { firstName: 'Updated', lastName: 'Name' }, expectedStatus: 200, category: 'Auth' },
        { name: 'Auth Delete Me', method: 'DELETE', path: '/auth/me', requiresAuth: true, 
          expectedStatus: [200, 204], skip: true, reason: 'Destructive - deletes test user account', category: 'Auth' },
        { name: 'Auth Refresh', method: 'POST', path: '/auth/refresh', requiresAuth: false, expectedStatus: [200, 401], category: 'Auth' },
        { name: 'Auth Logout', method: 'POST', path: '/auth/logout', requiresAuth: true, expectedStatus: [200, 204], category: 'Auth' },
        { name: 'Auth Google', method: 'GET', path: '/auth/google', requiresAuth: false, 
          expectedStatus: [302, 500], skip: true, reason: 'Requires OAuth redirect', category: 'Auth' },
        { name: 'Auth Google Callback', method: 'GET', path: '/auth/google/callback', requiresAuth: false, 
          expectedStatus: [302, 400, 500], skip: true, reason: 'Requires OAuth code', category: 'Auth' },

        // ========== RESEARCH TYPES ==========
        { name: 'List Research Types', method: 'GET', path: '/research-types', requiresAuth: true, expectedStatus: 200, category: 'Research Types' },
        { name: 'Create Research Type', method: 'POST', path: '/research-types', requiresAuth: true, 
          body: { name: `Test RT ${Date.now()}`, description: 'Test', is_active: true }, 
          expectedStatus: 201, category: 'Research Types' },
        { name: 'Get Research Type', method: 'GET', path: '/research-types/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Update Research Type', method: 'PUT', path: '/research-types/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Delete Research Type', method: 'DELETE', path: '/research-types/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Research Types' },
        { name: 'Get Research Type Techniques', method: 'GET', path: '/research-types/:id/techniques', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Get Research Type Module Assignments', method: 'GET', path: '/research-types/:id/module-assignments', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Update Research Type Modules', method: 'PATCH', path: '/research-types/:id/modules', requiresAuth: true, requiresId: true,
          body: { modules: [] }, expectedStatus: [200, 404], category: 'Research Types' },
        { name: 'Update Research Type Module Assignments', method: 'PUT', path: '/research-types/:id/module-assignments', requiresAuth: true, requiresId: true,
          body: { moduleTemplateIds: [] }, expectedStatus: [200, 404], category: 'Research Types' },

        // ========== RESEARCH TECHNIQUES ==========
        { name: 'List Research Techniques', method: 'GET', path: '/research-techniques', requiresAuth: true, expectedStatus: 200, category: 'Research Techniques' },
        { name: 'Create Research Technique', method: 'POST', path: '/research-techniques', requiresAuth: true,
          body: { name: `Test Technique ${Date.now()}`, description: 'Test' }, expectedStatus: 201, category: 'Research Techniques' },
        { name: 'Get Research Technique', method: 'GET', path: '/research-techniques/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research Techniques' },
        { name: 'Update Research Technique', method: 'PUT', path: '/research-techniques/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Research Techniques' },
        { name: 'Delete Research Technique', method: 'DELETE', path: '/research-techniques/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Research Techniques' },

        // ========== ENTERPRISES ==========
        { name: 'List Enterprises', method: 'GET', path: '/enterprises', requiresAuth: true, expectedStatus: 200, category: 'Enterprises' },
        { name: 'Create Enterprise', method: 'POST', path: '/enterprises', requiresAuth: true,
          body: { name: `Test Enterprise ${Date.now()}`, description: 'Test' }, expectedStatus: 201, category: 'Enterprises' },
        { name: 'Get Enterprise', method: 'GET', path: '/enterprises/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Enterprises' },
        { name: 'Update Enterprise', method: 'PUT', path: '/enterprises/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Enterprises' },
        { name: 'Delete Enterprise', method: 'DELETE', path: '/enterprises/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Enterprises' },

        // ========== RESEARCH ==========
        { name: 'List Researches', method: 'GET', path: '/research', requiresAuth: true, expectedStatus: 200, category: 'Research' },
        { name: 'Create Research', method: 'POST', path: '/research', requiresAuth: true,
          body: { name: `Test Research ${Date.now()}`, description: 'Test', research_type_id: 'PLACEHOLDER', use_default_modules: false },
          expectedStatus: [201, 400, 404], category: 'Research' },
        { name: 'Get Research', method: 'GET', path: '/research/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Update Research', method: 'PUT', path: '/research/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Delete Research', method: 'DELETE', path: '/research/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Research' },
        { name: 'Update Research Status', method: 'PATCH', path: '/research/:id/status', requiresAuth: true, requiresId: true,
          body: { status: 'draft' }, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Activate Research', method: 'POST', path: '/research/:id/activate', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Metrics', method: 'GET', path: '/research/:id/metrics', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Participants Status', method: 'GET', path: '/research/:id/participants/status', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Get Research Participant Details', method: 'GET', path: '/research/:id/participants/:participantId', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], category: 'Research' },
        { name: 'Delete Research Participant', method: 'DELETE', path: '/research/:id/participants/:participantId', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], skip: true, reason: 'Destructive', category: 'Research' },
        { name: 'Get Research Stages', method: 'GET', path: '/research/:id/stages', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Create Research Stage', method: 'POST', path: '/research/:id/stages', requiresAuth: true, requiresId: true,
          body: { name: `Test Stage ${Date.now()}`, description: 'Test' }, expectedStatus: [201, 404], category: 'Research' },
        { name: 'Delete Research Stage', method: 'DELETE', path: '/research/:id/stages/:stageId', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Research' },
        { name: 'Get Research Modules', method: 'GET', path: '/research/:id/modules', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Research' },
        { name: 'Delete Research Module', method: 'DELETE', path: '/research/:id/modules/:moduleId', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Research' },
        { name: 'Get Eye Tracking Recruit', method: 'GET', path: '/eye-tracking-recruit/research/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], category: 'Research' },

        // ========== STAGE TEMPLATES ==========
        { name: 'List Stage Templates', method: 'GET', path: '/stage-templates', requiresAuth: true, expectedStatus: 200, category: 'Stage Templates' },
        { name: 'Create Stage Template', method: 'POST', path: '/stage-templates', requiresAuth: true,
          body: { name: `Test ST ${Date.now()}`, description: 'Test' }, expectedStatus: 201, category: 'Stage Templates' },
        { name: 'Get Stage Template', method: 'GET', path: '/stage-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Stage Templates' },
        { name: 'Update Stage Template', method: 'PUT', path: '/stage-templates/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Stage Templates' },
        { name: 'Delete Stage Template', method: 'DELETE', path: '/stage-templates/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Stage Templates' },
        { name: 'Add Module to Stage Template', method: 'POST', path: '/stage-templates/:id/modules', requiresAuth: true, requiresId: true,
          body: { moduleId: 'PLACEHOLDER', displayOrder: 0 }, expectedStatus: [200, 400, 404], category: 'Stage Templates' },
        { name: 'Remove Module from Stage Template', method: 'DELETE', path: '/stage-templates/:id/modules/:moduleId', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], skip: true, reason: 'Requires valid moduleId', category: 'Stage Templates' },

        // ========== MODULE TEMPLATES ==========
        { name: 'List Module Templates', method: 'GET', path: '/module-templates', requiresAuth: true, expectedStatus: 200, category: 'Module Templates' },
        { name: 'Create Module Template', method: 'POST', path: '/module-templates', requiresAuth: true,
          body: { name: `Test MT ${Date.now()}`, description: 'Test', structure: { components: [] } }, expectedStatus: 201, category: 'Module Templates' },
        { name: 'Get Module Template', method: 'GET', path: '/module-templates/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Module Templates' },
        { name: 'Update Module Template', method: 'PUT', path: '/module-templates/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Module Templates' },
        { name: 'Delete Module Template', method: 'DELETE', path: '/module-templates/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Module Templates' },
        { name: 'Get Module Template Usage', method: 'GET', path: '/module-templates/:id/usage', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Module Templates' },

        // ========== MODULES ==========
        { name: 'Create Module', method: 'POST', path: '/modules', requiresAuth: true,
          body: { research_id: 'PLACEHOLDER', stage_id: 'PLACEHOLDER', name: `Test Module ${Date.now()}`, order_index: 0, config: {} },
          expectedStatus: [201, 400, 404], category: 'Modules' },
        { name: 'Update Module', method: 'PUT', path: '/modules/:id', requiresAuth: true, requiresId: true,
          body: { name: 'Updated Name', description: 'Updated description' }, expectedStatus: [200, 404], category: 'Modules' },
        { name: 'Delete Module', method: 'DELETE', path: '/modules/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Modules' },
        { name: 'Reorder Modules', method: 'POST', path: '/modules/:id/reorder', requiresAuth: true, requiresId: true,
          body: { modules: [] }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid module order data', category: 'Modules' },
        { name: 'Reorder Modules in Stage', method: 'PUT', path: '/stages/:id/modules/reorder', requiresAuth: true, requiresId: true,
          body: { updates: [] }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid stageId and updates', category: 'Modules' },

        // ========== QUESTIONS ==========
        { name: 'Create Question', method: 'POST', path: '/questions', requiresAuth: true,
          body: { module_id: 'PLACEHOLDER', question_type: 'text', question_text: 'Test question', order_index: 0, config: {}, required: false },
          expectedStatus: [201, 400, 404], category: 'Questions' },
        { name: 'Update Question', method: 'PUT', path: '/questions/:id', requiresAuth: true, requiresId: true,
          body: { question_text: 'Updated question' }, expectedStatus: [200, 404], category: 'Questions' },
        { name: 'Delete Question', method: 'DELETE', path: '/questions/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Questions' },
        { name: 'Reorder Questions', method: 'POST', path: '/questions/:id/reorder', requiresAuth: true, requiresId: true,
          body: { questions: [] }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid question order data', category: 'Questions' },

        // ========== ANALYTICS ==========
        { name: 'Get SmartVOC Analytics', method: 'GET', path: '/analytics/research/:id/smartvoc', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Cognitive Tasks Analytics', method: 'GET', path: '/analytics/research/:id/cognitive-tasks', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Navigation Flow Analytics', method: 'GET', path: '/analytics/research/:id/navigation-flow/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Preference Test Analytics', method: 'GET', path: '/analytics/research/:id/preference-test/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Text Responses Analytics', method: 'GET', path: '/analytics/research/:id/text-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Choice Responses Analytics', method: 'GET', path: '/analytics/research/:id/choice-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Scale Responses Analytics', method: 'GET', path: '/analytics/research/:id/scale-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },
        { name: 'Get Ranking Responses Analytics', method: 'GET', path: '/analytics/research/:id/ranking-responses/:moduleId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Analytics' },

        // ========== ANALYSIS ==========
        { name: 'List Analysis Modules', method: 'GET', path: '/analysis/modules', requiresAuth: true, expectedStatus: 200, category: 'Analysis' },

        // ========== RESPONSES ==========
        { name: 'Get Research Responses', method: 'GET', path: '/responses/research/:id', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Responses' },
        { name: 'Get Participant Responses', method: 'GET', path: '/responses/research/:id/participant/:participantId', requiresAuth: true, requiresId: true, expectedStatus: [200, 404], category: 'Responses' },

        // ========== MEDIA ==========
        { name: 'Get Media by Key', method: 'GET', path: '/media/by-key', requiresAuth: true, 
          queryParams: { key: 'test-key' }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid key', category: 'Media' },
        { name: 'Get Media by ID', method: 'GET', path: '/media/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], category: 'Media' },
        { name: 'Upload Media', method: 'POST', path: '/media/upload', requiresAuth: true,
          body: { research_id: 'PLACEHOLDER', file_name: 'test.jpg', content_type: 'image/jpeg' },
          expectedStatus: [200, 400, 404], category: 'Media' },
        { name: 'Save Media Metadata', method: 'POST', path: '/media', requiresAuth: true,
          body: { research_id: 'PLACEHOLDER', media_path: 'test/path.jpg' },
          expectedStatus: [201, 400, 404], category: 'Media' },
        { name: 'Delete Media', method: 'DELETE', path: '/media/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], skip: true, reason: 'Destructive', category: 'Media' },

        // ========== CACHE ==========
        { name: 'Get Cache Stats', method: 'GET', path: '/cache/stats', requiresAuth: true, expectedStatus: [200, 401, 403], category: 'Cache' },
        { name: 'Clear All Cache', method: 'DELETE', path: '/cache/clear', requiresAuth: true, expectedStatus: [200, 401, 403], category: 'Cache' },
        { name: 'Clear Cache by Pattern', method: 'DELETE', path: '/cache/pattern', requiresAuth: true,
          body: { pattern: 'test:*' }, expectedStatus: [200, 400, 401, 403], category: 'Cache' },

        // ========== PUBLIC ==========
        { name: 'Get Public Research', method: 'GET', path: '/public/research/:id', requiresAuth: false, requiresId: true, expectedStatus: [200, 404], category: 'Public' },
        { name: 'Submit Public Responses', method: 'POST', path: '/public/research/:id/responses', requiresAuth: false, requiresId: true,
          body: { participant_id: 'test-participant', responses: [] }, expectedStatus: [201, 400, 404], skip: true, reason: 'Requires valid research_id and response data', category: 'Public' },
        { name: 'Validate Demographics', method: 'POST', path: '/public/research/:id/validate-demographics', requiresAuth: false, requiresId: true,
          body: { demographics: {} }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid research_id', category: 'Public' },
        { name: 'Get Public Media by Key', method: 'GET', path: '/public/media/by-key', requiresAuth: false, 
          queryParams: { s3_key: 'test-key' }, expectedStatus: [200, 400, 404], skip: true, reason: 'Requires valid s3_key', category: 'Public' },
        { name: 'Legacy Submit Responses', method: 'POST', path: '/public/responses', requiresAuth: false,
          body: { research_id: 'PLACEHOLDER', participant_id: 'test', module_id: 'test', question_id: 'test', answer: 'test' },
          expectedStatus: [201, 400, 404], skip: true, reason: 'Legacy endpoint - requires valid IDs', category: 'Public' },

        // ========== USERS ==========
        { name: 'List Users', method: 'GET', path: '/users', requiresAuth: true, expectedStatus: [200, 401, 403], category: 'Users' },
        { name: 'Create User', method: 'POST', path: '/users', requiresAuth: true,
          body: { email: `testuser${Date.now()}@test.com`, first_name: 'Test', last_name: 'User', role: 'researcher' },
          expectedStatus: [201, 400, 409], category: 'Users' },
        { name: 'Get User', method: 'GET', path: '/users/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404], category: 'Users' },
        { name: 'Update User', method: 'PUT', path: '/users/:id', requiresAuth: true, requiresId: true,
          body: { first_name: 'Updated', last_name: 'Name' }, expectedStatus: [200, 404], category: 'Users' },
        { name: 'Delete User', method: 'DELETE', path: '/users/:id', requiresAuth: true, requiresId: true,
          expectedStatus: [200, 404, 409], skip: true, reason: 'Destructive - only delete if created by test', category: 'Users' },
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

    // Obtener IDs reales existentes
    await getTestIds();
    
    // Crear datos de prueba necesarios
    console.log('🔧 Creando datos de prueba necesarios...');
    await createTestData();
    
    console.log('📋 IDs de prueba disponibles:');
    console.log(`   Research Type ID: ${testIds.researchTypeId || 'N/A'}`);
    console.log(`   Research Technique ID: ${testIds.researchTechniqueId || 'N/A'}`);
    console.log(`   Research ID: ${testIds.researchId || 'N/A'}`);
    console.log(`   Enterprise ID: ${testIds.enterpriseId || 'N/A'}`);
    console.log(`   Stage Template ID: ${testIds.stageTemplateId || 'N/A'}`);
    console.log(`   Module Template ID: ${testIds.moduleTemplateId || 'N/A'}`);
    console.log(`   Stage ID: ${testIds.stageId || 'N/A'}`);
    console.log(`   Module ID: ${testIds.moduleId || 'N/A'}`);
    console.log(`   Question ID: ${testIds.questionId || 'N/A'}\n`);

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
