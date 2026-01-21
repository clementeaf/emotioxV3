/**
 * Auditoría completa de compatibilidad MySQL para TODOS los endpoints
 * 
 * Revisa sistemáticamente todos los servicios que manejan operaciones de base de datos
 * para identificar problemas de compatibilidad MySQL vs PostgreSQL
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface EndpointIssue {
    endpoint: string;
    method: string;
    service: string;
    file: string;
    line: number;
    issue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    fix: string;
}

const issues: EndpointIssue[] = [];
const endpoints: Array<{ path: string; method: string; controller: string }> = [];

/**
 * Analiza un archivo de servicio para problemas MySQL
 */
function analyzeServiceFile(filePath: string, serviceName: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // 1. CRITICAL: status = 'deleted' (viola constraint)
        if (trimmed.match(/status\s*=\s*['"]deleted['"]/i)) {
            issues.push({
                endpoint: 'Various',
                method: 'DELETE/UPDATE',
                service: serviceName,
                file: filePath,
                line: lineNum,
                issue: "status = 'deleted' violates MySQL CHECK constraint",
                severity: 'critical',
                fix: "Change to status = 'archived' or remove status update, use deleted_at only"
            });
        }

        // 2. HIGH: CURRENT_TIMESTAMP en SET (preferir NOW())
        if (trimmed.match(/SET.*CURRENT_TIMESTAMP/i) && !trimmed.includes('DEFAULT') && !trimmed.includes('ON UPDATE')) {
            issues.push({
                endpoint: 'Various',
                method: 'UPDATE',
                service: serviceName,
                file: filePath,
                line: lineNum,
                issue: 'CURRENT_TIMESTAMP in SET clause (prefer NOW() for MySQL)',
                severity: 'high',
                fix: 'Replace CURRENT_TIMESTAMP with NOW()'
            });
        }

        // 3. HIGH: Verificar constraints de otras tablas
        if (trimmed.match(/status\s*=\s*['"](?!draft|active|paused|completed|archived)[^'"]+['"]/i)) {
            const match = trimmed.match(/status\s*=\s*['"]([^'"]+)['"]/i);
            if (match && !['draft', 'active', 'paused', 'completed', 'archived'].includes(match[1])) {
                issues.push({
                    endpoint: 'Various',
                    method: 'UPDATE',
                    service: serviceName,
                    file: filePath,
                    line: lineNum,
                    issue: `status = '${match[1]}' may violate MySQL CHECK constraint`,
                    severity: 'high',
                    fix: `Verify if '${match[1]}' is allowed in CHECK constraint or change to allowed value`
                });
            }
        }

        // 4. MEDIUM: Verificar uso de boolean en WHERE
        if (trimmed.match(/WHERE.*\b(true|false)\b/i) && !trimmed.match(/['"]/)) {
            issues.push({
                endpoint: 'Various',
                method: 'SELECT',
                service: serviceName,
                file: filePath,
                line: lineNum,
                issue: 'Boolean literal in WHERE clause (MySQL uses 1/0 or TINYINT)',
                severity: 'medium',
                fix: 'Verify boolean handling - MySQL may need 1/0 instead of true/false'
            });
        }

        // 5. MEDIUM: Verificar JSON parsing
        if (trimmed.match(/JSON\.parse|JSON\.stringify/) && trimmed.match(/default_modules|settings|config|structure/)) {
            // Verificar que se maneja el caso de string JSON
            const nextLines = lines.slice(index, index + 5).join('\n');
            if (!nextLines.match(/typeof.*===.*['"]string['"]/)) {
                issues.push({
                    endpoint: 'Various',
                    method: 'GET/SELECT',
                    service: serviceName,
                    file: filePath,
                    line: lineNum,
                    issue: 'JSON field may need string parsing check (MySQL stores JSON as TEXT)',
                    severity: 'medium',
                    fix: 'Add typeof check before JSON.parse: if (typeof field === "string") { field = JSON.parse(field); }'
                });
            }
        }

        // 6. LOW: Verificar rowCount usage (ya manejado por wrapper, pero verificar)
        if (trimmed.match(/\.rowCount\s*[=!<>]/)) {
            // Esto está bien si se usa el wrapper, pero verificar
            const context = lines.slice(Math.max(0, index - 3), index + 3).join('\n');
            if (!context.includes('pool.query') && !context.includes('client.query')) {
                issues.push({
                    endpoint: 'Various',
                    method: 'Various',
                    service: serviceName,
                    file: filePath,
                    line: lineNum,
                    issue: 'rowCount usage - verify wrapper handles MySQL affectedRows correctly',
                    severity: 'low',
                    fix: 'Verify database wrapper converts affectedRows to rowCount'
                });
            }
        }
    });
}

/**
 * Mapea controllers a servicios
 */
const controllerToService: Record<string, string[]> = {
    'research.controller.ts': ['research.service.ts', 'research-in-progress.service.ts'],
    'research-types.controller.ts': ['research-types.service.ts'],
    'research-techniques.controller.ts': ['research-techniques.service.ts'],
    'enterprises.controller.ts': ['enterprises.service.ts'],
    'users.controller.ts': ['users.service.ts'],
    'modules.controller.ts': ['modules.service.ts'],
    'questions.controller.ts': ['questions.service.ts'],
    'stage-templates.controller.ts': ['stage-templates.service.ts'],
    'module-templates.controller.ts': ['module-templates.service.ts'],
    'auth.controller.ts': ['auth.service.local.ts'],
    'public.controller.ts': ['public.service.ts'],
    'media.controller.ts': ['media.service.local.ts', 'media.service.ts'],
    'analytics.controller.ts': ['analytics.service.ts'],
    'analysis.controller.ts': ['analysis.service.ts'],
    'responses.controller.ts': ['responses.service.ts'],
};

/**
 * Recorre directorios
 */
function walkDirectory(dir: string, fileList: string[] = []): string[] {
    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
            walkDirectory(filePath, fileList);
        } else if (file.endsWith('.service.ts') && !file.endsWith('.d.ts') && !file.includes('.test.')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Analizar todos los servicios
const srcDir = join(__dirname, '../src/modules');
const serviceFiles = walkDirectory(srcDir);

console.log(`\n🔍 Analizando ${serviceFiles.length} archivos de servicio...\n`);

serviceFiles.forEach(file => {
    const fileName = file.split('/').pop() || '';
    const moduleName = file.split('/modules/')[1]?.split('/')[0] || 'unknown';
    analyzeServiceFile(file, `${moduleName}/${fileName}`);
});

// Generar reporte
console.log('\n' + '='.repeat(80));
console.log('📊 REPORTE DE COMPATIBILIDAD MYSQL - TODOS LOS ENDPOINTS');
console.log('='.repeat(80) + '\n');

const critical = issues.filter(i => i.severity === 'critical');
const high = issues.filter(i => i.severity === 'high');
const medium = issues.filter(i => i.severity === 'medium');
const low = issues.filter(i => i.severity === 'low');

console.log(`📈 RESUMEN:`);
console.log(`   Total de problemas encontrados: ${issues.length}`);
console.log(`   🔴 Críticos: ${critical.length}`);
console.log(`   🟠 Altos: ${high.length}`);
console.log(`   🟡 Medios: ${medium.length}`);
console.log(`   🟢 Bajos: ${low.length}\n`);

if (critical.length > 0) {
    console.log('🔴 PROBLEMAS CRÍTICOS (Deben corregirse INMEDIATAMENTE):\n');
    critical.forEach((issue, idx) => {
        console.log(`${idx + 1}. [${issue.service}] Línea ${issue.line}`);
        console.log(`   Problema: ${issue.issue}`);
        console.log(`   Solución: ${issue.fix}`);
        console.log(`   Archivo: ${issue.file.split('/src/')[1] || issue.file}\n`);
    });
}

if (high.length > 0) {
    console.log('\n🟠 PROBLEMAS DE ALTA PRIORIDAD:\n');
    high.forEach((issue, idx) => {
        console.log(`${idx + 1}. [${issue.service}] Línea ${issue.line}`);
        console.log(`   Problema: ${issue.issue}`);
        console.log(`   Solución: ${issue.fix}`);
        console.log(`   Archivo: ${issue.file.split('/src/')[1] || issue.file}\n`);
    });
}

// Agrupar por servicio
const byService = issues.reduce((acc, issue) => {
    if (!acc[issue.service]) {
        acc[issue.service] = [];
    }
    acc[issue.service].push(issue);
    return acc;
}, {} as Record<string, EndpointIssue[]>);

console.log('\n📋 PROBLEMAS POR SERVICIO:\n');
Object.entries(byService)
    .sort((a, b) => {
        const aCritical = a[1].filter(i => i.severity === 'critical').length;
        const bCritical = b[1].filter(i => i.severity === 'critical').length;
        if (aCritical !== bCritical) return bCritical - aCritical;
        return b[1].length - a[1].length;
    })
    .forEach(([service, serviceIssues]) => {
        const criticalCount = serviceIssues.filter(i => i.severity === 'critical').length;
        const highCount = serviceIssues.filter(i => i.severity === 'high').length;
        console.log(`  ${service}: ${serviceIssues.length} problemas (${criticalCount} críticos, ${highCount} altos)`);
    });

console.log('\n' + '='.repeat(80));
console.log('✅ Análisis completado\n');
