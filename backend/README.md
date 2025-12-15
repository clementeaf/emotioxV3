# EmotioxV3 Backend

TypeScript backend with AWS Lambda, PostgreSQL, S3, and Cognito.

## 🚀 Quick Start

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup local database
# Asegúrate de tener PostgreSQL corriendo en localhost:5432

# 3. Run migrations
cd ../database
# Ejecutar manualmente los archivos en migrations/

# 4. Start development server
cd ../backend
npm run dev
```

Server runs on: `http://localhost:3000`

### AWS Deployment

**Prerequisites:**
- AWS CLI configurado
- Base de datos PostgreSQL en la nube (Neon.tech o RDS)

```bash
# 1. Configurar base de datos de producción
bash setup-neon-db.sh

# 2. Deploy a AWS Lambda
bash deploy-aws.sh
```

---

## 📁 Structure

```
backend/
├── src/
│   ├── modules/          # Domain modules
│   │   ├── auth/         # Authentication (Cognito)
│   │   ├── research/     # Research management
│   │   ├── responses/    # Participant responses
│   │   ├── media/        # S3 file uploads
│   │   └── ...
│   ├── config/           # Configuration
│   │   ├── database.ts   # PostgreSQL connection
│   │   ├── cognito.ts    # Cognito config
│   │   └── cache.ts      # In-memory cache
│   ├── utils/            # Utilities
│   ├── router.ts         # API routes
│   ├── handler.ts        # Lambda handler
│   └── server.ts         # Local dev server
├── .env                  # Local environment
├── .env.production       # AWS environment
├── serverless.yml        # AWS deployment config
└── deploy-aws.sh         # Deployment script
```

---

## 🔧 Environment Configuration

### Local Development (`.env`)

```bash
# Database - Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-local-secret
JWT_REFRESH_SECRET=your-local-refresh-secret

# AWS S3
APP_AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=emotioxv3-media-041238861016

# Cognito
COGNITO_USER_POOL_ID=us-east-1_BVc7DMwZd
COGNITO_CLIENT_ID=3enuct41ton6u3achfe2qtu2ff
```

### Production (`.env.production`)

**Opción 1: Neon.tech (Recomendado)**

```bash
# 1. Crear cuenta gratuita: https://neon.tech
# 2. Crear proyecto 'emotioxv3'
# 3. Ejecutar: bash setup-neon-db.sh
```

**Opción 2: AWS RDS**

Ver [`SETUP_AWS_RDS.md`](./SETUP_AWS_RDS.md)

---

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start local server (port 3000)
npm run dev:nodemon      # With auto-reload

# Build
npm run build            # Compile TypeScript

# Deployment
bash deploy-aws.sh       # Deploy to AWS Lambda

# Serverless
npm run deploy           # Direct serverless deploy
serverless logs -f api -t  # View Lambda logs
serverless info          # Stack information
```

---

## 🗄️ Database Setup

### Local (PostgreSQL)

```bash
# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb emotioxv3

# Run migrations
cd database/migrations
for file in *.sql; do psql emotioxv3 < $file; done
```

### Production (Neon.tech)

```bash
cd backend
bash setup-neon-db.sh
```

This script will:
1. Guide you through Neon.tech signup
2. Parse connection string
3. Update `.env.production`
4. Run migrations
5. Test connection

---

## 🔒 Authentication

Uses AWS Cognito for user management:

- **Sign Up**: `/auth/register`
- **Login**: `/auth/login`
- **Refresh Token**: `/auth/refresh`
- **Get User**: `/auth/me`

Tokens are stored in httpOnly cookies.

---

## 📦 Key Features

### Environment-Aware Configuration

```typescript
// Automatically detects local vs AWS
const shouldUseSSL = () => {
  if (host === 'localhost') return false;
  if (host.includes('.rds.amazonaws.com')) return { rejectUnauthorized: false };
  return false;
};
```

### CORS Configuration

```typescript
const allowedOrigins = [
  'http://localhost:12500',  // research-frontend
  'http://localhost:12600',  // participant-frontend
  'https://research.useremotion.com',
  'https://participant.useremotion.com',
];
```

### Caching

In-memory cache for frequently accessed data:
- Research types
- Research techniques
- Module templates

```typescript
cache.getOrSet(key, async () => data, TTL);
```

---

## 🚀 Deployment Workflow

```bash
# 1. Ensure .env.production is configured
cat .env.production

# 2. Build TypeScript
npm run build

# 3. Deploy to AWS
bash deploy-aws.sh

# 4. Verify deployment
curl https://API_URL/dev/health

# 5. Check logs
serverless logs -f api -t
```

---

## 🧪 Testing Endpoints

```bash
# Health check
curl https://API_URL/dev/health

# Config
curl https://API_URL/dev/config

# Register user
curl -X POST https://API_URL/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","first_name":"Test","last_name":"User"}'

# Login
curl -X POST https://API_URL/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## 🔧 Troubleshooting

### Cannot connect to database

```bash
# Check environment variables
echo $DB_HOST
echo $DB_NAME

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Lambda deployment fails

```bash
# Check serverless logs
serverless logs -f api

# Verify environment variables are set
serverless info

# Re-deploy
bash deploy-aws.sh
```

### CORS errors

Update `src/utils/response.ts`:

```typescript
const allowedOrigins = [
  'your-frontend-url',  // Add your URL
];
```

---

## 📚 Documentation

- [`SETUP_AWS_RDS.md`](./SETUP_AWS_RDS.md) - AWS RDS setup guide
- [`DEPLOY_INSTRUCTIONS.md`](./DEPLOY_INSTRUCTIONS.md) - Deployment details
- [`deploy-aws.sh`](./deploy-aws.sh) - Automated deployment script
- [`setup-neon-db.sh`](./setup-neon-db.sh) - Neon.tech database setup

---

## 🌟 Architecture

```
┌─────────────────┐
│   Frontends     │
│ (research/      │
│  participant)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │
│  /dev/*         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  Lambda         │────▶│  PostgreSQL  │
│  (Node.js 20)   │     │  (Neon/RDS)  │
└────────┬────────┘     └──────────────┘
         │
         ├───────▶ S3 (Media)
         │
         └───────▶ Cognito (Auth)
```

---

## 📝 License

Private - EmotioxV3
