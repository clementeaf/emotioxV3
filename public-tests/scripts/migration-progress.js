#!/usr/bin/env node

/**
 * Script de Seguimiento de Progreso de Migración
 * Compara el estado actual con el baseline y reporta progreso
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FormAnalyzer } from './analyze-forms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationProgressTracker {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.baselineFile = path.join(__dirname, '../FORM_ANALYSIS_REPORT.json');
    this.progressFile = path.join(__dirname, '../MIGRATION_PROGRESS.json');
  }

  async trackProgress() {
    console.log('📊 Iniciando seguimiento de progreso de migración...\n');

    // Cargar baseline si existe
    const baseline = this.loadBaseline();
    if (!baseline) {
      console.log('❌ No se encontró baseline. Ejecuta primero analyze-forms.js');
      return;
    }

    // Análisis actual
    const analyzer = new FormAnalyzer(this.baseDir);
    const currentAnalysis = await analyzer.analyze();

    // Comparar y generar reporte de progreso
    const progress = this.compareAnalyses(baseline, currentAnalysis);
    this.generateProgressReport(progress);
    this.saveProgress(progress);

    return progress;
  }

  loadBaseline() {
    try {
      if (fs.existsSync(this.baselineFile)) {
        const data = fs.readFileSync(this.baselineFile, 'utf8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Error cargando baseline:', error.message);
      return null;
    }
  }

  compareAnalyses(baseline, current) {
    const progress = {
      timestamp: new Date().toISOString(),
      baseline: {
        highPriority: baseline.summary.migrationStats.highPriority,
        mediumPriority: baseline.summary.migrationStats.mediumPriority,
        lowPriority: baseline.summary.migrationStats.lowPriority,
        total: baseline.summary.totalFormFiles
      },
      current: {
        highPriority: current.summary.migrationStats.highPriority,
        mediumPriority: current.summary.migrationStats.mediumPriority,
        lowPriority: current.summary.migrationStats.lowPriority,
        total: current.summary.totalFormFiles
      },
      changes: {},
      migratedFiles: [],
      newIssues: [],
      resolvedIssues: []
    };

    // Calcular cambios
    progress.changes = {
      highPriority: progress.current.highPriority - progress.baseline.highPriority,
      mediumPriority: progress.current.mediumPriority - progress.baseline.mediumPriority,
      lowPriority: progress.current.lowPriority - progress.baseline.lowPriority,
      total: progress.current.total - progress.baseline.total
    };

    // Identificar archivos migrados
    progress.migratedFiles = this.findMigratedFiles(baseline, current);
    
    // Identificar nuevos issues y resueltos
    const { newIssues, resolvedIssues } = this.compareIssues(baseline, current);
    progress.newIssues = newIssues;
    progress.resolvedIssues = resolvedIssues;

    // Calcular métricas de progreso
    progress.metrics = this.calculateProgressMetrics(progress);

    return progress;
  }

  findMigratedFiles(baseline, current) {
    const migratedFiles = [];
    
    // Files que pasaron de alta/media prioridad a baja prioridad
    const baselineHighMed = [
      ...this.getFilesByCategory(baseline, 'ALTA PRIORIDAD - MIGRACIÓN INMEDIATA'),
      ...this.getFilesByCategory(baseline, 'MEDIA PRIORIDAD - MIGRACIÓN PRIORITARIA')
    ];
    
    const currentLow = this.getFilesByCategory(current, 'BAJA PRIORIDAD - YA MIGRADOS O COMPATIBLES');
    
    for (const baselineFile of baselineHighMed) {
      const migrated = currentLow.find(file => file.file === baselineFile.file);
      if (migrated) {
        migratedFiles.push({
          file: baselineFile.file,
          fromComplexity: baselineFile.complexity,
          toComplexity: migrated.complexity,
          reducedIssues: baselineFile.issues.length - migrated.issues.length
        });
      }
    }

    return migratedFiles;
  }

  getFilesByCategory(analysis, category) {
    return analysis.migrationReport[category] || [];
  }

  compareIssues(baseline, current) {
    const baselineIssues = this.extractAllIssues(baseline);
    const currentIssues = this.extractAllIssues(current);

    const newIssues = currentIssues.filter(issue => 
      !baselineIssues.some(b => b.file === issue.file && b.issue === issue.issue)
    );

    const resolvedIssues = baselineIssues.filter(issue =>
      !currentIssues.some(c => c.file === issue.file && c.issue === issue.issue)
    );

    return { newIssues, resolvedIssues };
  }

  extractAllIssues(analysis) {
    const allIssues = [];
    
    for (const formFile of analysis.formFiles) {
      for (const issue of formFile.issues) {
        allIssues.push({
          file: formFile.file,
          issue: issue,
          complexity: formFile.complexity
        });
      }
    }
    
    return allIssues;
  }

  calculateProgressMetrics(progress) {
    const totalMigrationNeeded = progress.baseline.highPriority + progress.baseline.mediumPriority;
    const totalMigrated = Math.max(0, -progress.changes.highPriority - progress.changes.mediumPriority);
    
    const completionPercentage = totalMigrationNeeded > 0 
      ? Math.round((totalMigrated / totalMigrationNeeded) * 100)
      : 100;

    const avgComplexityReduction = progress.migratedFiles.length > 0
      ? progress.migratedFiles.reduce((sum, file) => sum + (file.fromComplexity - file.toComplexity), 0) / progress.migratedFiles.length
      : 0;

    return {
      completionPercentage,
      totalMigrationNeeded,
      totalMigrated,
      remainingHighPriority: progress.current.highPriority,
      remainingMediumPriority: progress.current.mediumPriority,
      avgComplexityReduction: Math.round(avgComplexityReduction * 100) / 100,
      totalIssuesResolved: progress.resolvedIssues.length,
      newIssuesFound: progress.newIssues.length
    };
  }

  generateProgressReport(progress) {
    const { metrics, migratedFiles, changes } = progress;
    
    console.log('📈 REPORTE DE PROGRESO DE MIGRACIÓN');
    console.log('===================================\n');
    
    console.log(`🎯 Progreso General: ${metrics.completionPercentage}% completado`);
    console.log(`📊 Migrados: ${metrics.totalMigrated}/${metrics.totalMigrationNeeded} archivos críticos\n`);
    
    console.log('📋 CAMBIOS EN CATEGORÍAS:');
    console.log(`   🔴 Alta prioridad: ${progress.baseline.highPriority} → ${progress.current.highPriority} (${changes.highPriority >= 0 ? '+' : ''}${changes.highPriority})`);
    console.log(`   🟡 Media prioridad: ${progress.baseline.mediumPriority} → ${progress.current.mediumPriority} (${changes.mediumPriority >= 0 ? '+' : ''}${changes.mediumPriority})`);
    console.log(`   🟢 Baja prioridad: ${progress.baseline.lowPriority} → ${progress.current.lowPriority} (${changes.lowPriority >= 0 ? '+' : ''}${changes.lowPriority})\n`);
    
    if (migratedFiles.length > 0) {
      console.log('✅ ARCHIVOS MIGRADOS EXITOSAMENTE:');
      migratedFiles.forEach(file => {
        console.log(`   📄 ${file.file}`);
        console.log(`      Complejidad: ${file.fromComplexity} → ${file.toComplexity} (${file.fromComplexity - file.toComplexity >= 0 ? '-' : '+'}${Math.abs(file.fromComplexity - file.toComplexity)})`);
        console.log(`      Issues resueltos: ${file.reducedIssues}`);
        console.log('');
      });
    }
    
    if (progress.resolvedIssues.length > 0) {
      console.log('🔧 ISSUES RESUELTOS:');
      progress.resolvedIssues.slice(0, 10).forEach(issue => {
        console.log(`   ✅ ${issue.file}: ${issue.issue}`);
      });
      if (progress.resolvedIssues.length > 10) {
        console.log(`   ... y ${progress.resolvedIssues.length - 10} más\n`);
      } else {
        console.log('');
      }
    }
    
    if (progress.newIssues.length > 0) {
      console.log('⚠️ NUEVOS ISSUES DETECTADOS:');
      progress.newIssues.slice(0, 5).forEach(issue => {
        console.log(`   ❗ ${issue.file}: ${issue.issue}`);
      });
      if (progress.newIssues.length > 5) {
        console.log(`   ... y ${progress.newIssues.length - 5} más\n`);
      } else {
        console.log('');
      }
    }
    
    console.log('📊 MÉTRICAS CLAVE:');
    console.log(`   🎯 Progreso: ${metrics.completionPercentage}%`);
    console.log(`   📉 Reducción promedio de complejidad: ${metrics.avgComplexityReduction}`);
    console.log(`   🔧 Issues resueltos: ${metrics.totalIssuesResolved}`);
    console.log(`   ⚠️ Nuevos issues: ${metrics.newIssuesFound}`);
    console.log(`   🔴 Prioridad alta restante: ${metrics.remainingHighPriority}`);
    console.log(`   🟡 Prioridad media restante: ${metrics.remainingMediumPriority}\n`);

    // Recomendaciones basadas en progreso
    this.generateRecommendations(progress);
  }

  generateRecommendations(progress) {
    const { metrics } = progress;
    
    console.log('💡 RECOMENDACIONES:');
    
    if (metrics.completionPercentage === 0) {
      console.log('   🚀 Comenzar con archivos de mayor complejidad para máximo impacto');
    } else if (metrics.completionPercentage < 25) {
      console.log('   ⚡ Excelente progreso! Continuar con componentes SmartVOC');
    } else if (metrics.completionPercentage < 75) {
      console.log('   🎯 Gran avance! Enfocar en componentes restantes de alta prioridad');
    } else if (metrics.completionPercentage < 100) {
      console.log('   🏁 Casi terminado! Finalizar migraciones restantes');
    } else {
      console.log('   🎉 ¡Migración completada! Considerar optimizaciones adicionales');
    }
    
    if (metrics.newIssuesFound > 0) {
      console.log('   ⚠️ Revisar nuevos issues antes de continuar');
    }
    
    if (metrics.avgComplexityReduction > 5) {
      console.log('   📈 Excelente reducción de complejidad - documentar mejoras');
    }
    
    console.log('');
  }

  saveProgress(progress) {
    try {
      // Cargar progreso histórico
      let history = [];
      if (fs.existsSync(this.progressFile)) {
        const data = fs.readFileSync(this.progressFile, 'utf8');
        history = JSON.parse(data);
      }
      
      // Añadir nuevo punto de datos
      history.push(progress);
      
      // Mantener solo últimos 50 puntos
      if (history.length > 50) {
        history = history.slice(-50);
      }
      
      fs.writeFileSync(this.progressFile, JSON.stringify(history, null, 2));
      console.log(`💾 Progreso guardado en: ${this.progressFile}`);
    } catch (error) {
      console.error('❌ Error guardando progreso:', error.message);
    }
  }
}

// Ejecutar seguimiento
async function main() {
  const baseDir = path.join(__dirname, '../src');
  const tracker = new MigrationProgressTracker(baseDir);
  
  try {
    await tracker.trackProgress();
  } catch (error) {
    console.error('❌ Error en seguimiento:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationProgressTracker }; 