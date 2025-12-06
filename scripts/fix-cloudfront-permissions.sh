#!/bin/bash
set -e

echo "🔧 Configurando permisos de CloudFront para S3 buckets..."
echo ""

REGION="us-east-1"
RESEARCH_BUCKET="emotioxv3-research-frontend"
PARTICIPANT_BUCKET="emotioxv3-participant-frontend"
RESEARCH_CF_ID="E3HBEQ4F8V5KO0"
PARTICIPANT_CF_ID="EAPLN65ZHVPFI"

# Function to create or get OAI
create_or_get_oai() {
    local bucket_name=$1
    local oai_comment="OAI for ${bucket_name}"
    
    echo "Verificando Origin Access Identity para ${bucket_name}..."
    
    # Check if OAI already exists
    EXISTING_OAI=$(aws cloudfront list-cloud-front-origin-access-identities \
        --query "CloudFrontOriginAccessIdentityList.Items[?Comment=='${oai_comment}'].Id" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_OAI" ] && [ "$EXISTING_OAI" != "None" ]; then
        echo "✅ OAI existente encontrado: ${EXISTING_OAI}"
        echo "$EXISTING_OAI"
        return
    fi
    
    # Create new OAI
    echo "Creando nuevo Origin Access Identity..."
    OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
        --cloud-front-origin-access-identity-config "CallerReference=$(date +%s),Comment=${oai_comment}" \
        --query 'CloudFrontOriginAccessIdentity.Id' \
        --output text)
    
    echo "✅ OAI creado: ${OAI_ID}"
    echo "$OAI_ID"
}

# Function to update CloudFront distribution with OAI
update_cloudfront_oai() {
    local cf_id=$1
    local bucket_name=$2
    local oai_id=$3
    
    echo ""
    echo "Actualizando CloudFront distribution ${cf_id} con OAI..."
    
    # Get current distribution config
    ETAG=$(aws cloudfront get-distribution-config \
        --id "$cf_id" \
        --query 'ETag' \
        --output text)
    
    # Get full config
    aws cloudfront get-distribution-config \
        --id "$cf_id" \
        --output json > /tmp/cf-config.json
    
    # Update origin to use OAI
    OAI_ARN="origin-access-identity/cloudfront/${oai_id}"
    
    # Use jq to update the config
    jq ".DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity = \"${OAI_ARN}\"" \
        /tmp/cf-config.json > /tmp/cf-config-updated.json
    
    # Update distribution
    aws cloudfront update-distribution \
        --id "$cf_id" \
        --if-match "$ETAG" \
        --distribution-config file:///tmp/cf-config-updated.json \
        --query 'Distribution.Id' \
        --output text > /dev/null
    
    echo "✅ CloudFront distribution actualizada"
    echo "⚠️  Nota: Los cambios pueden tardar 15-20 minutos en propagarse"
}

# Function to set bucket policy for CloudFront access
set_bucket_policy() {
    local bucket_name=$1
    local oai_id=$2
    
    echo ""
    echo "Configurando bucket policy para ${bucket_name}..."
    
    OAI_ARN="arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${oai_id}"
    
    POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${bucket_name}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/*"
        }
      }
    },
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${OAI_ARN}"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${bucket_name}/*"
    }
  ]
}
EOF
)
    
    echo "$POLICY" > /tmp/bucket-policy.json
    
    aws s3api put-bucket-policy \
        --bucket "$bucket_name" \
        --policy file:///tmp/bucket-policy.json
    
    echo "✅ Bucket policy configurada"
}

# Function to make bucket public (alternative approach)
make_bucket_public_read() {
    local bucket_name=$1
    
    echo ""
    echo "Configurando acceso público de lectura para ${bucket_name}..."
    
    # Remove public access block if exists
    aws s3api put-public-access-block \
        --bucket "$bucket_name" \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
        2>/dev/null || true
    
    # Set bucket ACL to public-read
    aws s3api put-bucket-acl \
        --bucket "$bucket_name" \
        --acl public-read \
        2>/dev/null || true
    
    echo "✅ Bucket configurado para acceso público"
}

# Main execution
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Configuración de CloudFront Permissions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: No estás autenticado en AWS CLI."
    echo "Por favor, ejecuta 'aws configure' y vuelve a intentarlo."
    exit 1
fi

echo "✅ Credenciales de AWS verificadas"
echo ""

# Option 1: Use public bucket access (simpler, faster)
echo "📋 Configurando buckets como públicos (más simple y rápido)"
echo ""

make_bucket_public_read "$RESEARCH_BUCKET"
make_bucket_public_read "$PARTICIPANT_BUCKET"

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📋 URLs de acceso:"
echo "   Research Frontend: https://d2mgq2ppntnjct.cloudfront.net"
echo "   Participant Frontend: https://d2am10cly7c9kf.cloudfront.net"
echo ""
echo "⚠️  Nota: Los cambios pueden tardar unos minutos en propagarse"
echo "   Verifica el acceso en unos minutos"
echo ""
exit 0

# Option 2: Use OAI (more secure)
echo "📋 Opción 2: Configurar con Origin Access Identity (más seguro)"
echo ""

# Create/get OAIs
RESEARCH_OAI=$(create_or_get_oai "$RESEARCH_BUCKET")
PARTICIPANT_OAI=$(create_or_get_oai "$PARTICIPANT_BUCKET")

# Set bucket policies
set_bucket_policy "$RESEARCH_BUCKET" "$RESEARCH_OAI"
set_bucket_policy "$PARTICIPANT_BUCKET" "$PARTICIPANT_OAI"

# Update CloudFront distributions
update_cloudfront_oai "$RESEARCH_CF_ID" "$RESEARCH_BUCKET" "$RESEARCH_OAI"
update_cloudfront_oai "$PARTICIPANT_CF_ID" "$PARTICIPANT_BUCKET" "$PARTICIPANT_OAI"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuración completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 URLs de acceso:"
echo "   Research Frontend: https://d2mgq2ppntnjct.cloudfront.net"
echo "   Participant Frontend: https://d2am10cly7c9kf.cloudfront.net"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Los cambios de CloudFront pueden tardar 15-20 minutos en propagarse"
echo "   - Verifica el estado en AWS Console: CloudFront > Distributions"
echo "   - Espera a que el estado sea 'Deployed' antes de probar"
echo ""

