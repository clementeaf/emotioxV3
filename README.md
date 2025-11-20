# EmotioxV3

Monorepo for EmotioxV3 project with backend and frontend applications.

## Project Structure

```
emotioxV3/
├── backend/              # Node.js + TypeScript + Serverless (AWS Lambda)
├── research-frontend/    # React + Vite + TypeScript frontend
└── participant-frontend/ # React + Vite + TypeScript frontend
```

## Backend

**Tech Stack:**
- Node.js
- TypeScript
- Serverless Framework v3 (AWS Lambda)
- serverless-offline for local development

**Commands:**
```bash
cd backend
npm install
npm run build    # Compile TypeScript
npm run dev      # Run locally with serverless-offline
npm run deploy   # Deploy to AWS
```

## Research Frontend

**Tech Stack:**
- React
- Vite
- TypeScript
- React Router Dom
- TanStack Query (React Query)
- TanStack React Table
- Axios
- Zustand
- date-fns
- Tailwind CSS v3

**Commands:**
```bash
cd research-frontend
npm install
npm run dev      # Start development server
npm run build    # Build for production
```

## Participant Frontend

**Tech Stack:**
- React
- Vite
- TypeScript
- React Router Dom
- TanStack Query (React Query)
- TanStack React Table
- Axios
- Zustand
- date-fns
- Tailwind CSS v3

**Commands:**
```bash
cd participant-frontend
npm install
npm run dev      # Start development server
npm run build    # Build for production
```

## Getting Started

1. Install dependencies in each project:
```bash
cd backend && npm install
cd ../research-frontend && npm install
cd ../participant-frontend && npm install
```

2. Start development servers as needed

## Notes

- All projects are initialized without sample code
- Tailwind CSS is configured and ready to use in both frontends
- Backend is configured for AWS Lambda deployment
