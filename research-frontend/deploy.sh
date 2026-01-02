#!/bin/bash

# Configuration
BUCKET_NAME="emotioxv3-research-frontend"
DISTRIBUTION_ID="E3HBEQ4F8V5KO0" # research.emotiox.org
REGION="us-east-1"

echo "🚀 Deploying Research Frontend..."
echo "--------------------------------"
echo "Bucket: $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"
echo "Region: $REGION"
echo ""

# 1. Build
echo "Building project..."
export VITE_API_URL="https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# 1.5 Create runtime-config.json
echo "Creating runtime-config.json..."
cat > dist/runtime-config.json <<EOF
{
  "apiBaseUrl": "https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev"
}
EOF

# 2. Sync to S3
echo "Syncing to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete --region $REGION
if [ $? -ne 0 ]; then
    echo "❌ S3 sync failed"
    exit 1
fi

# 3. Invalidate CloudFront
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --region $REGION
if [ $? -ne 0 ]; then
    echo "❌ CloudFront invalidation failed"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo "URL: https://research.emotiox.org"
