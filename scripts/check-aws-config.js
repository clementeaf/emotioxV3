#!/usr/bin/env node

// Script para diagnosticar la configuración de AWS y secrets
console.log('=== Diagnóstico de Configuración de AWS ===\n');

// Verificar que estamos en el entorno correcto
console.log('1. Verificando entorno...');
console.log('   Directorio actual:', process.cwd());

// Verificar la existencia de archivos de configuración
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  '.github/workflows/deploy-backend.yml',
  '.github/workflows/deploy-participant-frontend.yml',
  '.github/workflows/deploy-research-frontend.yml'
];

console.log('\n2. Verificando archivos de workflow...');
requiredFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file} - ENCONTRADO`);
  } else {
    console.log(`   ❌ ${file} - NO ENCONTRADO`);
  }
});

// Verificar estructura de directorios
console.log('\n3. Verificando estructura de directorios...');
const dirs = ['backend', 'participant-frontend', 'research-frontend'];
dirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory()) {
    console.log(`   ✅ ${dir} - ENCONTRADO`);
  } else {
    console.log(`   ❌ ${dir} - NO ENCONTRADO`);
  }
});

console.log('\n=== Fin del diagnóstico ===');
console.log('\nPara verificar secrets de GitHub, ejecuta:');
console.log('gh secret list');