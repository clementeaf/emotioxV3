#!/usr/bin/env node

// Script para verificar el despliegue de las aplicaciones frontend
const { execSync } = require('child_process');

console.log('=== Verificación de Despliegue de Aplicaciones Frontend ===\n');

// Función para ejecutar comandos de AWS
function checkDeployment(bucketSecretName, appName) {
  try {
    console.log(`Verificando despliegue de ${appName}...`);
    
    // Obtener el nombre del bucket desde los secrets de GitHub
    const bucketName = execSync(
      `gh secret list --json name,value | jq -r '.[] | select(.name==\"${bucketSecretName}\") | .value'`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    
    // Verificar que obtuvimos un nombre de bucket válido
    if (!bucketName) {
      console.log(`   ❌ No se pudo obtener el nombre del bucket para ${bucketSecretName}`);
      return false;
    }
    
    console.log(`   Bucket: ${bucketName}`);
    
    // Listar el contenido del bucket
    const content = execSync(
      `aws s3 ls s3://${bucketName} --recursive | head -10`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    if (content.trim()) {
      console.log(`   ✅ ${appName} desplegado correctamente`);
      console.log(`   Contenido (primeras 10 líneas):`);
      console.log(content);
    } else {
      console.log(`   ⚠️  ${appName} bucket vacío`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR verificando ${appName}: ${error.message.trim()}`);
    return false;
  }
}

// Verificar despliegue de research-frontend
checkDeployment('RESEARCH_FRONTEND_S3_BUCKET', 'Research Frontend');

console.log('');

// Verificar despliegue de participant-frontend
checkDeployment('PARTICIPANT_FRONTEND_S3_BUCKET', 'Participant Frontend');

console.log('=== Fin de la verificación ===');