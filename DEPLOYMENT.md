# EmotioX v3 - Production Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Production Setup                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ Research Frontend│         │Participant Frontend│         │
│  │   (S3+CloudFront)│         │  (S3+CloudFront)  │         │
│  └────────┬─────────┘         └─────────┬────────┘          │
│           │                              │                    │
│           └──────────────┬───────────────┘                   │
│                          │                                    │
│                   ┌──────▼──────┐                            │
│                   │   Backend   │                            │
│                   │ (API Gateway │                            │
│                   │  + Lambda)  │                            │
│                   └──────┬──────┘                            │
│                          │                                    │
│                   ┌──────▼──────┐                            │
│                   │ RDS Postgres│                            │
│                   └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **AWS Account** with administrator access
2. **AWS CLI** installed and configured
3. **GitHub Repository** with appropriate permissions
4. **Node.js 20+** installed locally

## Step-by-Step Deployment

### 1. Configure AWS Credentials

```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### 2. Create AWS Infrastructure

Run the automated setup script:

```bash
cd scripts
./setup-aws-infrastructure.sh
```

This script will create:
- S3 buckets for research-frontend, participant-frontend, and media storage
- Proper CORS configuration
- Website hosting settings

### 3. Create RDS PostgreSQL Database

#### Option A: Using AWS Console (Recommended)

1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "PostgreSQL"
4. Select "Free tier" or production template
5. Configure:
   - DB instance identifier: `emotioxv3-db`
   - Master username: `emotioxadmin`
   - Master password: (secure password)
   - DB name: `emotioxv3`
   - VPC: Default or custom
   - Public access: Yes (for initial setup, restrict later)
   - Security group: Allow PostgreSQL (5432) from your IP

#### Option B: Using AWS CLI

```bash
aws rds create-db-instance \
  --db-instance-identifier emotioxv3-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username emotioxadmin \
  --master-user-password YourSecurePassword123 \
  --allocated-storage 20 \
  --db-name emotioxv3 \
  --publicly-accessible \
  --backup-retention-period 7
```

Wait for the database to be available (5-10 minutes):

```bash
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

Get the endpoint:

```bash
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### 4. Run Database Migrations

Connect to your RDS instance and run migrations:

```bash
# Set environment variables
export DB_HOST=<rds-endpoint>
export DB_PORT=5432
export DB_NAME=emotioxv3
export DB_USER=emotioxadmin
export DB_PASSWORD=<your-password>

# Run migrations from backend directory
cd backend
npm run migrate
```

### 5. Create CloudFront Distributions

#### For Research Frontend:

1. Go to AWS CloudFront Console
2. Click "Create Distribution"
3. Configure:
   - **Origin domain**: Select your `emotioxv3-research-frontend` S3 bucket
   - **Origin access**: Origin Access Identity (create new)
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Default root object**: `index.html`
   - **Custom error responses**:
     - 403 → /index.html (200)
     - 404 → /index.html (200)

4. Copy the CloudFront Distribution ID and Domain Name

#### For Participant Frontend:

Repeat the same process for `emotioxv3-participant-frontend` bucket.

### 6. Deploy Backend (First Time)

```bash
cd backend

# Set environment variables for deployment
export DB_HOST=<rds-endpoint>
export DB_PORT=5432
export DB_NAME=emotioxv3
export DB_USER=emotioxadmin
export DB_PASSWORD=<your-password>
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=emotioxv3-media
export COGNITO_USER_POOL_ID=<optional>
export COGNITO_CLIENT_ID=<optional>

# Deploy to AWS Lambda
npm run deploy
```

Recommended: configure an API Gateway **Custom Domain** so frontends never depend on `*.execute-api...` hostnames.

Expected URL format:
- Without custom domain: `https://<api-id>.execute-api.<region>.amazonaws.com/<stage>`
- With custom domain (optional): `https://api.<cliente>.com/<stage>`

### 7. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

#### AWS Credentials
```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
```

#### S3 Buckets
```
RESEARCH_FRONTEND_S3_BUCKET=emotioxv3-research-frontend
PARTICIPANT_FRONTEND_S3_BUCKET=emotioxv3-participant-frontend
S3_BUCKET_NAME=emotioxv3-media
```

#### CloudFront
```
RESEARCH_FRONTEND_CLOUDFRONT_ID=<distribution-id>
PARTICIPANT_FRONTEND_CLOUDFRONT_ID=<distribution-id>
```

#### API URLs
```
VITE_API_URL_PRODUCTION=https://<api-id>.execute-api.<region>.amazonaws.com/production
VITE_PARTICIPANT_FRONTEND_URL=https://xxxxxxxxxx.cloudfront.net
```

#### Database (for backend deployment)
```
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=emotioxadmin
DB_PASSWORD=<your-password>
```

#### Cognito (optional)
```
COGNITO_USER_POOL_ID=<pool-id>
COGNITO_CLIENT_ID=<client-id>
```

### 8. Deploy via GitHub Actions

Once all secrets are configured:

```bash
git add .
git commit -m "feat: add production deployment configuration"
git push origin main
```

GitHub Actions will automatically:
1. Build the backend and deploy to Lambda
2. Build research-frontend and deploy to S3/CloudFront
3. Build participant-frontend and deploy to S3/CloudFront

### 9. Verify Deployment

1. **Backend API**: 
   ```bash
   curl https://<api-gateway-url>/health
   ```

2. **Research Frontend**: 
   Open `https://<research-cloudfront-domain>`

3. **Participant Frontend**: 
   Open `https://<participant-cloudfront-domain>`

4. **QR Code Test**:
   - Create a research in research-frontend
   - Generate QR code
   - Verify URL points to participant CloudFront domain

## Environment Variables Summary

### Backend (.env)
```bash
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=emotioxadmin
DB_PASSWORD=<secure-password>
AWS_REGION=us-east-1
S3_BUCKET_NAME=emotioxv3-media
COGNITO_USER_POOL_ID=<optional>
COGNITO_CLIENT_ID=<optional>
API_STAGE=production
```

### Research Frontend (.env)
```bash
VITE_API_URL=https://<api-gateway-url>
VITE_PARTICIPANT_FRONTEND_URL=https://<participant-cloudfront-url>
```

### Participant Frontend (.env)
```bash
VITE_API_URL=https://<api-gateway-url>
```

## Troubleshooting

### Backend deployment fails
- Check AWS credentials
- Verify all environment variables are set
- Check Lambda execution role permissions

### Frontend shows blank page
- Check browser console for errors
- Verify API_URL is correct
- Check CloudFront error responses configuration

### Database connection fails
- Verify RDS security group allows inbound traffic
- Check VPC and subnet configuration
- Confirm Lambda has VPC access if needed

### QR Code points to wrong URL
- Verify `VITE_PARTICIPANT_FRONTEND_URL` in GitHub Secrets
- Check research-frontend build logs
- Confirm environment variable is being injected at build time

## Manual Deployment Commands

If you prefer manual deployment:

```bash
# Backend
cd backend
npm run build
npm run deploy

# Research Frontend
cd research-frontend
npm run build
aws s3 sync dist/ s3://emotioxv3-research-frontend --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"

# Participant Frontend
cd participant-frontend
npm run build
aws s3 sync dist/ s3://emotioxv3-participant-frontend --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Monitoring and Logs

- **Lambda Logs**: CloudWatch Logs → `/aws/lambda/emotioxv3-backend-production-api`
- **CloudFront Logs**: Enable logging in distribution settings
- **RDS Monitoring**: RDS Console → Monitoring tab

## Cost Estimation

**Monthly costs (approximate)**:
- RDS db.t3.micro: $15-20/month
- Lambda: $0-5/month (free tier covers most usage)
- S3: $1-5/month
- CloudFront: $1-10/month
- **Total**: ~$20-40/month

## Security Checklist

- [ ] Enable RDS encryption at rest
- [ ] Restrict RDS security group to Lambda only
- [ ] Enable CloudFront HTTPS only
- [ ] Set up AWS WAF for CloudFront (optional)
- [ ] Enable S3 versioning for backups
- [ ] Set up CloudWatch alarms
- [ ] Rotate database credentials regularly
- [ ] Use AWS Secrets Manager for sensitive data

## Next Steps

1. Set up custom domain names (Route 53)
2. Configure SSL certificates (ACM)
3. Implement CI/CD for staging environment
4. Set up monitoring and alerting
5. Configure backup and disaster recovery
