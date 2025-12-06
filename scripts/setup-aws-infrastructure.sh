#!/bin/bash

# EmotioX v3 - AWS Infrastructure Setup Script
# This script creates the necessary AWS resources for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}EmotioX v3 - AWS Infrastructure Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi

# Get AWS Account ID and Region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${YELLOW}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${YELLOW}AWS Region: ${AWS_REGION}${NC}"
echo ""

# Project configuration
PROJECT_NAME="emotioxv3"
RESEARCH_BUCKET_NAME="${PROJECT_NAME}-research-frontend"
PARTICIPANT_BUCKET_NAME="${PROJECT_NAME}-participant-frontend"
MEDIA_BUCKET_NAME="${PROJECT_NAME}-media"

echo -e "${GREEN}Creating S3 Buckets...${NC}"

# Function to create S3 bucket with CloudFront configuration
create_frontend_bucket() {
    local BUCKET_NAME=$1
    local FRONTEND_TYPE=$2
    
    echo -e "${YELLOW}Creating bucket: ${BUCKET_NAME}${NC}"
    
    # Create bucket
    aws s3api create-bucket \
        --bucket ${BUCKET_NAME} \
        --region ${AWS_REGION} \
        --create-bucket-configuration LocationConstraint=${AWS_REGION} 2>/dev/null || echo "Bucket already exists"
    
    # Enable static website hosting
    aws s3 website s3://${BUCKET_NAME}/ \
        --index-document index.html \
        --error-document index.html
    
    # Block public access (CloudFront will access via OAI)
    aws s3api put-public-access-block \
        --bucket ${BUCKET_NAME} \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    echo -e "${GREEN}✓ Bucket ${BUCKET_NAME} created${NC}"
}

# Create buckets
create_frontend_bucket ${RESEARCH_BUCKET_NAME} "research"
create_frontend_bucket ${PARTICIPANT_BUCKET_NAME} "participant"

# Create media bucket
echo -e "${YELLOW}Creating media bucket: ${MEDIA_BUCKET_NAME}${NC}"
aws s3api create-bucket \
    --bucket ${MEDIA_BUCKET_NAME} \
    --region ${AWS_REGION} \
    --create-bucket-configuration LocationConstraint=${AWS_REGION} 2>/dev/null || echo "Bucket already exists"

# Enable CORS for media bucket
cat > /tmp/cors-config.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
    --bucket ${MEDIA_BUCKET_NAME} \
    --cors-configuration file:///tmp/cors-config.json

echo -e "${GREEN}✓ Media bucket ${MEDIA_BUCKET_NAME} created${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFront Distributions${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}To create CloudFront distributions, you can:${NC}"
echo ""
echo "1. Use AWS Console (recommended for first setup)"
echo "   - Go to CloudFront console"
echo "   - Create distribution for each S3 bucket"
echo "   - Configure Origin Access Identity (OAI)"
echo "   - Set default root object to 'index.html'"
echo "   - Configure custom error responses (404 -> /index.html for SPA)"
echo ""
echo "2. Or use AWS CLI (advanced)"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub Secrets Configuration${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Add these secrets to your GitHub repository:"
echo ""
echo "AWS_ACCESS_KEY_ID=<your-access-key>"
echo "AWS_SECRET_ACCESS_KEY=<your-secret-key>"
echo "AWS_REGION=${AWS_REGION}"
echo ""
echo "# S3 Buckets"
echo "RESEARCH_FRONTEND_S3_BUCKET=${RESEARCH_BUCKET_NAME}"
echo "PARTICIPANT_FRONTEND_S3_BUCKET=${PARTICIPANT_BUCKET_NAME}"
echo "S3_BUCKET_NAME=${MEDIA_BUCKET_NAME}"
echo ""
echo "# CloudFront (get these IDs after creating distributions)"
echo "RESEARCH_FRONTEND_CLOUDFRONT_ID=<distribution-id>"
echo "PARTICIPANT_FRONTEND_CLOUDFRONT_ID=<distribution-id>"
echo ""
echo "# Backend API (get this after serverless deploy)"
echo "VITE_API_URL_PRODUCTION=<api-gateway-url>"
echo ""
echo "# Participant Frontend URL (get this after CloudFront setup)"
echo "VITE_PARTICIPANT_FRONTEND_URL=<cloudfront-url>"
echo ""
echo "# Database (RDS)"
echo "DB_HOST=<rds-endpoint>"
echo "DB_PORT=5432"
echo "DB_NAME=emotioxv3"
echo "DB_USER=<db-user>"
echo "DB_PASSWORD=<db-password>"
echo ""
echo "# Cognito (if using)"
echo "COGNITO_USER_POOL_ID=<pool-id>"
echo "COGNITO_CLIENT_ID=<client-id>"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Next Steps${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. Create RDS PostgreSQL instance"
echo "2. Run database migrations"
echo "3. Create CloudFront distributions"
echo "4. Configure GitHub secrets"
echo "5. Push to main branch to trigger deployment"
echo ""
echo -e "${GREEN}Done!${NC}"
