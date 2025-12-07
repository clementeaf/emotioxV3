#!/usr/bin/env node

// Script para verificar el estado de las distribuciones de CloudFront
const { execSync } = require('child_process');

console.log('=== Verificación de Distribuciones CloudFront ===\n');

// Función para verificar una distribución de CloudFront
function checkCloudFrontDistribution(secretName, appName) {
  try {
    console.log(`Verificando distribución de ${appName}...`);
    
    // Obtener el ID de la distribución desde los secrets de GitHub
    const distributionId = execSync(
      `gh secret list | grep "${secretName}" | awk '{print $1}'`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim().split(' ')[0];
    
    if (!distributionId) {
      console.log(`   ⚠️  No se encontró el ID de distribución para ${appName}`);
      return false;
    }
    
    console.log(`   ID de distribución: ${distributionId}`);
    
    // Obtener información sobre la distribución
    const distributionInfo = execSync(
      `aws cloudfront get-distribution --id ${distributionId}`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    // Parsear el JSON para obtener el estado
    const distributionData = JSON.parse(distributionInfo);
    const status = distributionData.Distribution.Status;
    const enabled = distributionData.Distribution.DistributionConfig.Enabled;
    
    console.log(`   Estado: ${status}`);
    console.log(`   Habilitada: ${enabled ? 'Sí' : 'No'}`);
    
    if (status === 'Deployed' && enabled) {
      console.log(`   ✅ ${appName} distribución CloudFront activa y desplegada`);
    } else {
      console.log(`   ⚠️  ${appName} distribución CloudFront no está lista`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR verificando ${appName}: ${error.message.trim()}`);
    return false;
  }
}

// Verificar distribución de Research Frontend
checkCloudFrontDistribution('RESEARCH_FRONTEND_CLOUDFRONT_ID', 'Research Frontend');

console.log('');

// Verificar distribución de Participant Frontend
checkCloudFrontDistribution('PARTICIPANT_FRONTEND_CLOUDFRONT_ID', 'Participant Frontend');

console.log('\n=== Fin de la verificación ===');