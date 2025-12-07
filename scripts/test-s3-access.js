#!/usr/bin/env node

// Script para probar el acceso a los buckets de S3
const { execSync } = require('child_process');

console.log('=== Prueba de Acceso a Buckets S3 ===\n');

// Función para ejecutar comandos de AWS
function testAwsCommand(description, command) {
  try {
    console.log(`Probando: ${description}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`   ✅ ÉXITO: ${result.trim()}\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message.trim()}\n`);
    return false;
  }
}

// Probar acceso al bucket de research-frontend
testAwsCommand(
  'Listar contenido del bucket RESEARCH_FRONTEND_S3_BUCKET',
  'aws s3 ls s3://$(gh secret list --json name,value | jq -r \'.[] | select(.name=="RESEARCH_FRONTEND_S3_BUCKET") | .value\')'
);

// Probar acceso al bucket de participant-frontend
testAwsCommand(
  'Listar contenido del bucket PARTICIPANT_FRONTEND_S3_BUCKET',
  'aws s3 ls s3://$(gh secret list --json name,value | jq -r \'.[] | select(.name=="PARTICIPANT_FRONTEND_S3_BUCKET") | .value\')'
);

console.log('=== Fin de las pruebas ===');