#!/bin/bash

# Configuration
# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-emotioxv3-research-frontend}"
DISTRIBUTION_ID="E346VL90X0G11J" # portal.emotiox.org
REGION="us-east-1"

echo "🚀 Deploying Research Frontend..."
echo "--------------------------------"
echo "Bucket: $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"
echo "Region: $REGION"
echo ""

# 1. Build
echo "Building project..."
export VITE_API_URL="${VITE_API_URL:-https://api.emotiox.org}"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# 1.5 Create runtime-config.json
echo "Creating runtime-config.json..."
cat > dist/runtime-config.json <<EOF
{
  "apiBaseUrl": "https://api.emotiox.org"
}
EOF

# 2. Sync to S3
echo "Syncing to S3..."
# Sync only to the research-frontend prefix
aws s3 sync dist/ s3://$BUCKET_NAME/research-frontend --delete --region $REGION
if [ $? -ne 0 ]; then
    echo "❌ S3 sync failed"
    exit 1
fi

# 3. Invalidate CloudFront
echo "Invalidating CloudFront cache..."
# Only invalidate if DISTRIBUTION_ID is set correctly
if [ "$DISTRIBUTION_ID" != "CLOUDFRONT_DIST_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region $REGION
else 
    echo "⚠️ Skipping invalidation (DISTRIBUTION_ID not set)"
fi

echo ""
echo "✅ Deployment complete!"
echo "URL: https://research.emotiox.org"
