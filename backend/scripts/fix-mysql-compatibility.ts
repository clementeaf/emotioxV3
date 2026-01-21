/**
 * Script para identificar y corregir problemas de compatibilidad MySQL vs PostgreSQL
 * 
 * Este script busca patrones comunes que pueden causar problemas:
 * 1. CURRENT_TIMESTAMP -> NOW() (aunque ambos funcionan, NOW() es más estándar en MySQL)
 * 2. rowCount usage (ya está manejado por el wrapper, pero verificar)
 * 3. UUID generation (ya está manejado, pero verificar)
 * 4. JSON handling (verificar parseo correcto)
 * 5. Boolean handling (TINYINT(1) vs boolean)
 * 6. Status constraints (verificar valores permitidos)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Issue {
    file: string;
    line: number;
    type: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
}

const issues: Issue[] = [];

/**
 * Busca problemas en un archivo
 */
function analyzeFile(filePath: string): void {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // 1. CURRENT_TIMESTAMP en UPDATE/SET (preferir NOW() en MySQL)
        if (line.match(/SET.*CURRENT_TIMESTAMP/i) && !line.includes('DEFAULT')) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'timestamp',
                description: 'Consider using NOW() instead of CURRENT_TIMESTAMP in SET clauses for MySQL compatibility',
                severity: 'info'
            });
        }

        // 2. Verificar uso de status = 'deleted' (no permitido por constraint)
        if (line.match(/status\s*=\s*['"]deleted['"]/i)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'constraint',
                description: "status = 'deleted' violates MySQL CHECK constraint. Use 'archived' instead or only set deleted_at",
                severity: 'error'
            });
        }

        // 3. Verificar uso de RETURNING (no soportado en MySQL)
        if (line.match(/RETURNING/i)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'syntax',
                description: 'RETURNING clause is not supported in MySQL. Use separate SELECT query instead.',
                severity: 'error'
            });
        }

        // 4. Verificar parámetros PostgreSQL ($1, $2, etc.)
        if (line.match(/\$\d+/)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'syntax',
                description: 'PostgreSQL parameter syntax ($1, $2) detected. Use ? placeholders for MySQL.',
                severity: 'error'
            });
        }

        // 5. Verificar uso de uuid_generate_v4() (PostgreSQL específico)
        if (line.match(/uuid_generate_v4\s*\(/i)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'function',
                description: 'uuid_generate_v4() is PostgreSQL specific. Use UUID() or crypto.randomUUID() for MySQL.',
                severity: 'error'
            });
        }

        // 6. Verificar uso de gen_random_uuid() (PostgreSQL específico)
        if (line.match(/gen_random_uuid\s*\(/i)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'function',
                description: 'gen_random_uuid() is PostgreSQL specific. Use UUID() or crypto.randomUUID() for MySQL.',
                severity: 'error'
            });
        }

        // 7. Verificar boolean en queries (MySQL usa TINYINT(1))
        if (line.match(/WHERE.*\b(true|false)\b/i) && !line.match(/['"]/)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'boolean',
                description: 'Boolean literals in WHERE clauses. MySQL uses 1/0 or true/false as strings. Verify correct usage.',
                severity: 'warning'
            });
        }
    });
}

/**
 * Recorre directorios recursivamente
 */
function walkDirectory(dir: string, fileList: string[] = []): string[] {
    const files = readdirSync(dir);

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
            walkDirectory(filePath, fileList);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts') && !file.includes('.test.')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Genera reporte
 */
function generateReport(): void {
    console.log('\n=== MySQL Compatibility Issues Report ===\n');

    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    console.log(`Total Issues: ${issues.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Info: ${infos.length}\n`);

    if (errors.length > 0) {
        console.log('=== ERRORS (Must Fix) ===\n');
        errors.forEach(issue => {
            console.log(`[${issue.type.toUpperCase()}] ${issue.file}:${issue.line}`);
            console.log(`  ${issue.description}\n`);
        });
    }

    if (warnings.length > 0) {
        console.log('=== WARNINGS (Should Fix) ===\n');
        warnings.forEach(issue => {
            console.log(`[${issue.type.toUpperCase()}] ${issue.file}:${issue.line}`);
            console.log(`  ${issue.description}\n`);
        });
    }

    if (infos.length > 0) {
        console.log('=== INFO (Consider Fixing) ===\n');
        infos.forEach(issue => {
            console.log(`[${issue.type.toUpperCase()}] ${issue.file}:${issue.line}`);
            console.log(`  ${issue.description}\n`);
        });
    }

    // Agrupar por tipo
    const byType = issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('\n=== Summary by Type ===\n');
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
}

// Ejecutar análisis
const srcDir = join(__dirname, '../src');
const files = walkDirectory(srcDir);

console.log(`Analyzing ${files.length} TypeScript files...\n`);

files.forEach(file => {
    try {
        analyzeFile(file);
    } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
    }
});

generateReport();

// Exportar resultados como JSON
writeFileSync(
    join(__dirname, '../mysql-compatibility-report.json'),
    JSON.stringify(issues, null, 2)
);

console.log('\nReport saved to: mysql-compatibility-report.json\n');
