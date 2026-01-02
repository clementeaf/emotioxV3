#!/bin/bash

# 🎯 DEPLOY SCRIPT PARA test-link EN AWS S3/CLOUDFRONT
# Uso: ./deploy.sh

set -e

# 🎯 CONFIGURACIÓN
BUCKET_NAME="emotioxv3-test-link"
REGION="us-east-1"

# 🎯 OBTENER DIRECTORIO DEL SCRIPT
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Iniciando deploy de test-link a AWS..."
echo "📂 Directorio: $SCRIPT_DIR"

# 🎯 VERIFICAR DEPENDENCIAS
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

# 🎯 CAMBIAR AL DIRECTORIO DEL PROYECTO
cd "$SCRIPT_DIR"

# 🎯 INSTALAR DEPENDENCIAS
echo "📦 Instalando dependencias..."
npm ci

# 🎯 BUILD DE LA APLICACIÓN
echo "🔨 Construyendo aplicación..."
npm run build

# 🎯 VERIFICAR QUE EL BUILD EXISTE
if [ ! -d "dist" ]; then
    echo "❌ Error: No se encontró el directorio dist/"
    exit 1
fi

# 🎯 CREAR BUCKET SI NO EXISTE
echo "🪣 Verificando bucket S3..."
if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 > /dev/null; then
    echo "📦 Creando bucket S3..."
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION

    # 🎯 DESHABILITAR BLOCK PUBLIC ACCESS
    echo "🔓 Configurando acceso público..."
    aws s3api put-public-access-block \
        --bucket $BUCKET_NAME \
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    # 🎯 CONFIGURAR BUCKET PARA WEBSITE STATIC
    aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html

    # 🎯 APLICAR POLICY PÚBLICA
    cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

    aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json
    rm /tmp/bucket-policy.json
    
    echo "✅ Bucket creado y configurado"
fi

# 🎯 SYNC CON S3
echo "📤 Subiendo archivos a S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete

# 🎯 BUSCAR O CREAR DISTRIBUCIÓN CLOUDFRONT
echo "☁️ Verificando CloudFront..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='${BUCKET_NAME}.s3.amazonaws.com'].Id" --output text 2>/dev/null || echo "")

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo "📦 Creando distribución CloudFront..."
    
    # Crear archivo de configuración para CloudFront
    cat > /tmp/cloudfront-config.json <<EOF
{
    "CallerReference": "test-link-$(date +%s)",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${BUCKET_NAME}",
                "DomainName": "${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only",
                    "OriginSslProtocols": {
                        "Quantity": 1,
                        "Items": ["TLSv1.2"]
                    }
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${BUCKET_NAME}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["HEAD", "GET"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"]
            }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
    },
    "Comment": "test-link distribution",
    "Enabled": true,
    "DefaultRootObject": "index.html",
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
    }
}
EOF

    DISTRIBUTION_RESULT=$(aws cloudfront create-distribution --distribution-config file:///tmp/cloudfront-config.json)
    DISTRIBUTION_ID=$(echo $DISTRIBUTION_RESULT | grep -o '"Id": "[^"]*"' | head -1 | cut -d'"' -f4)
    CLOUDFRONT_DOMAIN=$(echo $DISTRIBUTION_RESULT | grep -o '"DomainName": "[^"]*"' | head -1 | cut -d'"' -f4)
    
    rm /tmp/cloudfront-config.json
    
    echo "✅ CloudFront creado: $CLOUDFRONT_DOMAIN"
    echo "📝 Distribution ID: $DISTRIBUTION_ID"
else
    echo "🔄 Invalidando cache de CloudFront..."
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" > /dev/null
    
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query "Distribution.DomainName" --output text)
fi

echo ""
echo "✅ Deploy completado exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 S3 Website: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo "☁️ CloudFront: https://${CLOUDFRONT_DOMAIN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
