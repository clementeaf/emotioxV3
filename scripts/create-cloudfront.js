#!/usr/bin/env node

// Script para crear distribuciones de CloudFront para las aplicaciones frontend
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Creación de Distribuciones CloudFront ===\n');

// Configuración de las distribuciones
const distributions = [
  {
    name: 'Research Frontend',
    bucket: 'emotioxv3-research-frontend',
    comment: 'Research Frontend Distribution for EmotioX V3'
  },
  {
    name: 'Participant Frontend',
    bucket: 'emotioxv3-participant-frontend',
    comment: 'Participant Frontend Distribution for EmotioX V3'
  }
];

// Función para crear una distribución de CloudFront
function createCloudFrontDistribution(config) {
  try {
    console.log(`Creando distribución de CloudFront para ${config.name}...`);
    console.log(`   Bucket origen: ${config.bucket}`);
    
    // Crear archivo de configuración temporal
    const configTemplate = {
      "CallerReference": `emotiox-${config.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      "Comment": config.comment,
      "Enabled": true,
      "Aliases": {
        "Quantity": 0,
        "Items": []
      },
      "DefaultRootObject": "index.html",
      "Origins": {
        "Quantity": 1,
        "Items": [
          {
            "Id": `${config.bucket}-origin`,
            "DomainName": `${config.bucket}.s3.amazonaws.com`,
            "OriginPath": "",
            "CustomHeaders": {
              "Quantity": 0,
              "Items": []
            },
            "S3OriginConfig": {
              "OriginAccessIdentity": ""
            }
          }
        ]
      },
      "DefaultCacheBehavior": {
        "TargetOriginId": `${config.bucket}-origin`,
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["HEAD", "GET"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["HEAD", "GET"]
          }
        },
        "ForwardedValues": {
          "QueryString": false,
          "Cookies": {
            "Forward": "none"
          },
          "Headers": {
            "Quantity": 0,
            "Items": []
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
      },
      "CacheBehaviors": {
        "Quantity": 0,
        "Items": []
      },
      "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
          {
            "ErrorCode": 404,
            "ResponsePagePath": "/index.html",
            "ResponseCode": "200",
            "ErrorCachingMinTTL": 300
          }
        ]
      },
      "Restrictions": {
        "GeoRestriction": {
          "RestrictionType": "none",
          "Quantity": 0
        }
      },
      "WebACLId": "",
      "HttpVersion": "http2",
      "IsIPV6Enabled": true
    };
    
    // Guardar configuración en archivo temporal
    const configPath = path.join('/tmp', `cloudfront-config-${config.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2));
    
    console.log(`   Archivo de configuración creado: ${configPath}`);
    
    // Crear la distribución
    const result = execSync(
      `aws cloudfront create-distribution --distribution-config file://${configPath}`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    
    // Parsear resultado
    const distributionData = JSON.parse(result);
    const distributionId = distributionData.Distribution.Id;
    const domainName = distributionData.Distribution.DomainName;
    
    console.log(`   ✅ Distribución creada exitosamente`);
    console.log(`   ID de distribución: ${distributionId}`);
    console.log(`   Dominio: ${domainName}`);
    
    // Limpiar archivo temporal
    fs.unlinkSync(configPath);
    
    return {
      id: distributionId,
      domain: domainName
    };
  } catch (error) {
    console.log(`   ❌ ERROR creando distribución para ${config.name}: ${error.message.trim()}`);
    return null;
  }
}

// Crear ambas distribuciones
const results = [];
for (const distribution of distributions) {
  const result = createCloudFrontDistribution(distribution);
  results.push({ name: distribution.name, result });
  console.log('');
}

// Mostrar resumen
console.log('=== Resumen de Creación ===');
results.forEach(({ name, result }) => {
  if (result) {
    console.log(`✅ ${name}: ${result.id}`);
  } else {
    console.log(`❌ ${name}: Falló`);
  }
});

console.log('\n=== Fin de la creación ===');