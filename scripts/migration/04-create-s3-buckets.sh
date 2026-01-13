#!/bin/bash

set -euo pipefail

echo "🪣 EmotioX V3 - Crear Bucket S3 Único"
echo "====================================="
echo ""

PROFILE="cefal"
REGION="us-east-1"

# Nombre del bucket único
BUCKET_NAME="emotioxv3-production"

echo "📌 Estructura del bucket único:"
echo "   $BUCKET_NAME/"
echo "   ├── research-frontend/    (React app estático)"
echo "   ├── participant-frontend/ (React app estático)"
echo "   └── media/                (Archivos de usuarios)"
echo ""

read -p "¿Continuar? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Cancelado"
    exit 0
fi

echo ""
echo "📦 Creando bucket: $BUCKET_NAME"

# Crear bucket
aws s3 mb "s3://$BUCKET_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" 2>/dev/null || echo "  ⚠️  Bucket ya existe o no se pudo crear"

# Configurar website hosting
echo "  → Configurando website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html \
    --profile "$PROFILE"

# Política de bucket con acceso público a frontends, privado a media
echo "  → Configurando política de acceso..."
cat > "/tmp/${BUCKET_NAME}_policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadFrontends",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}/research-frontend/*",
        "arn:aws:s3:::${BUCKET_NAME}/participant-frontend/*"
      ]
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy "file:///tmp/${BUCKET_NAME}_policy.json" \
    --profile "$PROFILE"

# CORS configuración completa
echo "  → Configurando CORS..."
cat > "/tmp/${BUCKET_NAME}_cors.json" <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    },
    {
      "AllowedOrigins": [
        "https://research.emotiox.org",
        "https://participant.emotiox.org",
        "http://localhost:5173",
        "http://localhost:5174"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration "file:///tmp/${BUCKET_NAME}_cors.json" \
    --profile "$PROFILE"

# Crear estructura de carpetas (folders) con archivos placeholder
echo "  → Creando estructura de carpetas..."
echo '{"status":"ready"}' | aws s3 cp - "s3://$BUCKET_NAME/research-frontend/.placeholder" --profile "$PROFILE" 2>/dev/null || true
echo '{"status":"ready"}' | aws s3 cp - "s3://$BUCKET_NAME/participant-frontend/.placeholder" --profile "$PROFILE" 2>/dev/null || true
echo '{"status":"ready"}' | aws s3 cp - "s3://$BUCKET_NAME/media/.placeholder" --profile "$PROFILE" 2>/dev/null || true

echo "  ✅ Bucket configurado"
echo ""
echo "✅ Bucket único creado exitosamente"
echo ""
echo "📋 Estructura creada:"
aws s3 ls "s3://$BUCKET_NAME/" --profile "$PROFILE" 2>/dev/null || echo "  → Bucket creado, estructura se poblará en deploy"
echo ""
echo "🔄 Siguiente paso: Copiar contenido de buckets antiguos"
echo ""
echo "   Para copiar contenido de frontends:"
echo "   aws s3 sync s3://emotioxv3-research-frontend s3://$BUCKET_NAME/research-frontend --profile $PROFILE"
echo "   aws s3 sync s3://emotioxv3-participant-frontend s3://$BUCKET_NAME/participant-frontend --profile $PROFILE"
echo ""
echo "   Para copiar contenido de media (si existe):"
echo "   aws s3 sync s3://emotioxv3-media-production s3://$BUCKET_NAME/media --profile $PROFILE"
echo ""
echo "📝 Recordar actualizar GitHub Secrets:"
echo "   RESEARCH_FRONTEND_S3_BUCKET=$BUCKET_NAME"
echo "   PARTICIPANT_FRONTEND_S3_BUCKET=$BUCKET_NAME"
echo "   S3_BUCKET_NAME=$BUCKET_NAME"
echo ""
echo "📝 Recordar configurar CloudFront Origins:"
echo "   Research Frontend Origin Path: /research-frontend"
echo "   Participant Frontend Origin Path: /participant-frontend"
echo ""
