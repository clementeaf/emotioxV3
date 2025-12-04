#!/usr/bin/env node

/**
 * Script de Análisis de Formularios
 * Analiza todos los formularios en public-tests y genera reportes para migración
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Equivalente a __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patrones a buscar en los archivos
const PATTERNS = {
  useState: /useState\s*<.*?>\s*\(/g,
  useStandardizedForm: /useStandardizedForm\s*<.*?>\s*\(/g,
  useStepResponseManager: /useStepResponseManager\s*<.*?>\s*\(/g,
  useResponseAPI: /useResponseAPI\s*\(/g,
  useParticipantLogin: /useParticipantLogin\s*\(/g,
  formElements: /<(form|input|textarea|select|button)[^>]*>/g,
  validationManual: /(validateForm|validation|validate)\s*\(/g,
  errorHandling: /(error|Error)\s*:/g,
  loadingStates: /(loading|Loading|isLoading)\s*:/g
};

// Categorías de migración
const MIGRATION_CATEGORIES = {
  HIGH_PRIORITY: 'Alta Prioridad - Migración Inmediata',
  MEDIUM_PRIORITY: 'Media Prioridad - Migración Prioritaria', 
  LOW_PRIORITY: 'Baja Prioridad - Ya migrados o compatibles',
  UNKNOWN: 'Análisis Manual Requerido'
};

class FormAnalyzer {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.results = {
      totalFiles: 0,
      formFiles: [],
      migrationReport: {
        [MIGRATION_CATEGORIES.HIGH_PRIORITY]: [],
        [MIGRATION_CATEGORIES.MEDIUM_PRIORITY]: [],
        [MIGRATION_CATEGORIES.LOW_PRIORITY]: [],
        [MIGRATION_CATEGORIES.UNKNOWN]: []
      },
      patterns: {},
      summary: {}
    };
  }

  async analyze() {
    console.log('🔍 Iniciando análisis de formularios...\n');
    
    await this.scanDirectory(this.baseDir);
    this.generateSummary();
    this.generateReport();
    
    console.log('✅ Análisis completado\n');
    return this.results;
  }

  async scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !this.shouldSkipDir(item)) {
        await this.scanDirectory(fullPath);
      } else if (this.isFormFile(item)) {
        await this.analyzeFile(fullPath);
      }
    }
  }

  shouldSkipDir(dirName) {
    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'templates', 'scripts'];
    return skipDirs.includes(dirName);
  }

  isFormFile(fileName) {
    return fileName.endsWith('.tsx') || fileName.endsWith('.ts');
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.baseDir, filePath);
      
      this.results.totalFiles++;
      
      // Verificar si es un archivo de formulario
      if (this.hasFormContent(content)) {
        const analysis = this.analyzeFormFile(content, relativePath);
        this.results.formFiles.push(analysis);
        this.categorizeForMigration(analysis);
      }
    } catch (error) {
      console.error(`❌ Error analizando ${filePath}:`, error.message);
    }
  }

  hasFormContent(content) {
    const formIndicators = [
      'form', 'input', 'textarea', 'select', 'button',
      'useState', 'useForm', 'validation', 'submit',
      'Form', 'Field', 'Question'
    ];
    
    return formIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  analyzeFormFile(content, filePath) {
    const analysis = {
      file: filePath,
      patterns: {},
      complexity: 0,
      issues: [],
      recommendations: []
    };

    // Analizar patrones
    for (const [patternName, regex] of Object.entries(PATTERNS)) {
      const matches = content.match(regex) || [];
      analysis.patterns[patternName] = matches.length;
      
      if (!this.results.patterns[patternName]) {
        this.results.patterns[patternName] = 0;
      }
      this.results.patterns[patternName] += matches.length;
    }

    // Calcular complejidad
    analysis.complexity = this.calculateComplexity(analysis.patterns);

    // Identificar issues y recomendaciones
    this.identifyIssuesAndRecommendations(analysis, content);

    return analysis;
  }

  calculateComplexity(patterns) {
    const weights = {
      useState: 1,
      useStandardizedForm: -2, // Reduce complejidad
      useStepResponseManager: 2,
      useResponseAPI: 3,
      validationManual: 2,
      errorHandling: 1,
      loadingStates: 1
    };

    return Object.entries(patterns).reduce((total, [pattern, count]) => {
      return total + (weights[pattern] || 0) * count;
    }, 0);
  }

  identifyIssuesAndRecommendations(analysis, content) {
    const { patterns } = analysis;

    // Issues comunes
    if (patterns.useState > 3 && patterns.useStandardizedForm === 0) {
      analysis.issues.push('Múltiples useState sin useStandardizedForm');
      analysis.recommendations.push('Migrar a useStandardizedForm');
    }

    if (patterns.useResponseAPI > 0 && patterns.useStandardizedForm === 0) {
      analysis.issues.push('Uso manual de useResponseAPI');
      analysis.recommendations.push('Migrar a useStandardizedForm con auto-save');
    }

    if (patterns.useStepResponseManager > 0 && patterns.useState > 0) {
      analysis.issues.push('Duplicación de estado (useStepResponseManager + useState)');
      analysis.recommendations.push('Eliminar duplicación usando solo useStandardizedForm');
    }

    if (patterns.validationManual > 0 && patterns.useStandardizedForm === 0) {
      analysis.issues.push('Validación manual implementada');
      analysis.recommendations.push('Usar validationRules de useStandardizedForm');
    }

    if (patterns.loadingStates > 2) {
      analysis.issues.push('Múltiples estados de loading');
      analysis.recommendations.push('Unificar estados con useStandardizedForm');
    }

    // Detectar patrones específicos en contenido
    if (content.includes('setFormFieldResponses') && content.includes('useStepResponseManager')) {
      analysis.issues.push('Patrón DemographicsForm detectado');
      analysis.recommendations.push('Prioridad MEDIA - Eliminar duplicación de estado');
    }

    if (content.includes('localStorage.setItem') && content.includes('useState')) {
      analysis.issues.push('Gestión manual de persistencia');
      analysis.recommendations.push('Usar auto-save de useStandardizedForm');
    }
  }

  categorizeForMigration(analysis) {
    const { patterns, issues, complexity } = analysis;

    // Prioridad ALTA - Migración inmediata
    if (patterns.useState > 2 && patterns.useStandardizedForm === 0 && patterns.useStepResponseManager === 0) {
      this.results.migrationReport[MIGRATION_CATEGORIES.HIGH_PRIORITY].push(analysis);
    }
    // Patrón useResponseAPI manual
    else if (patterns.useResponseAPI > 0 && patterns.useStandardizedForm === 0) {
      this.results.migrationReport[MIGRATION_CATEGORIES.HIGH_PRIORITY].push(analysis);
    }
    // Prioridad MEDIA
    else if (patterns.useStepResponseManager > 0) {
      this.results.migrationReport[MIGRATION_CATEGORIES.MEDIUM_PRIORITY].push(analysis);
    }
    // Hooks especializados
    else if (patterns.useParticipantLogin > 0) {
      this.results.migrationReport[MIGRATION_CATEGORIES.MEDIUM_PRIORITY].push(analysis);
    }
    // Prioridad BAJA - Ya migrados
    else if (patterns.useStandardizedForm > 0) {
      this.results.migrationReport[MIGRATION_CATEGORIES.LOW_PRIORITY].push(analysis);
    }
    // Requiere análisis manual
    else if (complexity > 5 || issues.length > 3) {
      this.results.migrationReport[MIGRATION_CATEGORIES.UNKNOWN].push(analysis);
    }
    // Sin categorizar (probablemente no son formularios críticos)
    else {
      this.results.migrationReport[MIGRATION_CATEGORIES.LOW_PRIORITY].push(analysis);
    }
  }

  generateSummary() {
    const { formFiles, patterns, migrationReport } = this.results;
    
    this.results.summary = {
      totalFormFiles: formFiles.length,
      averageComplexity: formFiles.reduce((sum, f) => sum + f.complexity, 0) / formFiles.length,
      migrationStats: {
        highPriority: migrationReport[MIGRATION_CATEGORIES.HIGH_PRIORITY].length,
        mediumPriority: migrationReport[MIGRATION_CATEGORIES.MEDIUM_PRIORITY].length,
        lowPriority: migrationReport[MIGRATION_CATEGORIES.LOW_PRIORITY].length,
        unknown: migrationReport[MIGRATION_CATEGORIES.UNKNOWN].length
      },
      mostUsedPatterns: Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([pattern, count]) => ({ pattern, count }))
    };
  }

  generateReport() {
    const { summary, migrationReport } = this.results;
    
    console.log('📊 REPORTE DE ANÁLISIS DE FORMULARIOS');
    console.log('=====================================\n');
    
    console.log(`📁 Total de archivos analizados: ${this.results.totalFiles}`);
    console.log(`📄 Archivos con formularios: ${summary.totalFormFiles}`);
    console.log(`📈 Complejidad promedio: ${summary.averageComplexity.toFixed(2)}\n`);
    
    console.log('🎯 ESTADÍSTICAS DE MIGRACIÓN:');
    console.log(`   🔴 Alta prioridad: ${summary.migrationStats.highPriority} archivos`);
    console.log(`   🟡 Media prioridad: ${summary.migrationStats.mediumPriority} archivos`);
    console.log(`   🟢 Baja prioridad: ${summary.migrationStats.lowPriority} archivos`);
    console.log(`   ⚪ Análisis manual: ${summary.migrationStats.unknown} archivos\n`);
    
    console.log('🔍 PATRONES MÁS USADOS:');
    summary.mostUsedPatterns.forEach(({ pattern, count }) => {
      console.log(`   ${pattern}: ${count} ocurrencias`);
    });
    console.log('');
    
    // Detalles por categoría
    for (const [category, files] of Object.entries(migrationReport)) {
      if (files.length > 0) {
        console.log(`\n📋 ${category.toUpperCase()}:`);
        files.forEach(file => {
          console.log(`   📄 ${file.file}`);
          console.log(`      Complejidad: ${file.complexity}`);
          if (file.issues.length > 0) {
            console.log(`      Issues: ${file.issues.join(', ')}`);
          }
          if (file.recommendations.length > 0) {
            console.log(`      Recomendaciones: ${file.recommendations.join(', ')}`);
          }
          console.log('');
        });
      }
    }
    
    // Generar archivo de reporte
    this.saveReport();
  }

  saveReport() {
    const reportPath = path.join(this.baseDir, '../FORM_ANALYSIS_REPORT.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`💾 Reporte guardado en: ${reportPath}`);
    } catch (error) {
      console.error('❌ Error guardando reporte:', error.message);
    }
  }
}

// Ejecutar análisis
async function main() {
  const baseDir = path.join(__dirname, '../src');
  const analyzer = new FormAnalyzer(baseDir);
  
  try {
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { FormAnalyzer }; 