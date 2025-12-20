# Cloudflare Turnstile Setup Guide

This guide explains how to configure Cloudflare Turnstile for anti-bot protection in Emotio v3.

## What is Turnstile?

Cloudflare Turnstile is a user-friendly CAPTCHA alternative that protects your application from automated bots while providing a better user experience than traditional CAPTCHAs.

**Benefits:**
- ✅ Free (included in Cloudflare Free plan)
- ✅ Better UX than reCAPTCHA
- ✅ No cookies (GDPR compliant)
- ✅ No Google account required
- ✅ Invisible mode available
- ✅ 99.9% uptime

## Setup Instructions

### 1. Create Cloudflare Turnstile Site

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Turnstile** in the left sidebar
3. Click **Add Site**
4. Fill in the details:
   - **Site name**: Emotio Participant Frontend
   - **Domain**: Your participant-frontend domain (e.g., `participants.emotiox.com`)
   - **Widget mode**: Choose based on your needs:
     - **Managed** (Recommended): Shows challenge only when needed
     - **Non-interactive**: Always runs in background
     - **Invisible**: Completely hidden
5. Click **Create**
6. Copy the **Site Key** and **Secret Key**

### 2. Configure Frontend (participant-frontend)

#### Option A: Using Environment Variables (Development)

1. Copy `.env.example` to `.env`:
   ```bash
   cd participant-frontend
   cp .env.example .env
   ```

2. Edit `.env` and add your Turnstile Site Key:
   ```env
   VITE_TURNSTILE_SITE_KEY=your_site_key_here
   ```

#### Option B: Using runtime-config.json (Production - Recommended)

1. Create or update `public/runtime-config.json`:
   ```json
   {
     "apiBaseUrl": "https://your-backend-api.com",
     "turnstileSiteKey": "your_site_key_here"
   }
   ```

2. The app will automatically load the config on startup

### 3. Configure Backend

1. Add Turnstile Secret Key to environment variables:

   **For Lambda/Serverless:**
   ```bash
   # Add to your deployment configuration (e.g., serverless.yml)
   environment:
     TURNSTILE_SECRET_KEY: ${env:TURNSTILE_SECRET_KEY}
   ```

   **For local development:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add:
   TURNSTILE_SECRET_KEY=your_secret_key_here
   ```

2. Deploy the backend with the new environment variable

### 4. Testing

#### Development Testing (Always Pass)

For development and testing, Cloudflare provides test keys that always pass:

**Site Key (Frontend):**
```
1x00000000000000000000AA
```

**Secret Key (Backend):**
```
1x0000000000000000000000000000000AA
```

These are already configured in `.env.example` files.

#### Production Testing

1. Open your participant-frontend URL
2. Navigate to a research
3. On the Welcome screen, you should see the Turnstile widget
4. Complete the verification
5. Click "Next" - you should be able to proceed
6. Without verification, you should see an alert: "Por favor, completa la verificación de seguridad antes de continuar."

### 5. Monitoring

To monitor Turnstile verification in production:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Turnstile**
3. Select your site
4. View analytics:
   - Total verifications
   - Success rate
   - Failed attempts
   - Geographic distribution

### 6. Common Issues

#### Widget Not Showing

**Problem**: Turnstile widget doesn't appear on Welcome screen

**Solutions**:
1. Check console for errors
2. Verify `VITE_TURNSTILE_SITE_KEY` is set correctly
3. Check if domain is whitelisted in Cloudflare dashboard
4. Ensure you're not blocking Cloudflare domains in ad blocker

#### Verification Always Fails

**Problem**: Backend always rejects verification

**Solutions**:
1. Check backend logs for error messages
2. Verify `TURNSTILE_SECRET_KEY` is set correctly in backend
3. Ensure token is being sent in metadata (check network tab)
4. Verify backend can reach `https://challenges.cloudflare.com`

#### Preview Mode Issues

**Problem**: Preview mode shows verification error

**Solution**: This is expected behavior. Preview mode skips Turnstile verification (see logs: "No token provided in metadata").

### 7. Security Best Practices

1. **Never commit secret keys** to version control
2. **Rotate keys** if they're exposed
3. **Monitor failed attempts** for potential attacks
4. **Use production keys** only in production
5. **Keep secret key** in environment variables, never hardcode

### 8. Cost

Cloudflare Turnstile is **free** for up to:
- ✅ 1 million verifications/month
- ✅ Unlimited sites
- ✅ All features included

For higher volumes, contact Cloudflare for enterprise pricing.

## Implementation Details

### Frontend Flow

1. User opens research → Welcome screen renders
2. `TurnstileWidget` component loads
3. Cloudflare verifies user is human
4. Token stored in `useSessionStore.turnstileToken`
5. User clicks "Next" → Token validated locally
6. Token sent with all responses to backend

### Backend Flow

1. Receive response submission with `metadata.turnstileToken`
2. Call `verifyTurnstileToken(token)`
3. Make POST to Cloudflare API with secret key
4. If valid → Save responses
5. If invalid → Return error 400

### Code Locations

- **Frontend Widget**: `participant-frontend/src/components/security/TurnstileWidget.tsx`
- **Frontend Store**: `participant-frontend/src/stores/useSessionStore.ts`
- **Frontend Integration**: `participant-frontend/src/components/steps/WelcomeStep.tsx`
- **Backend Validation**: `backend/src/modules/public/public.service.ts` (function `verifyTurnstileToken`)

## Support

For issues with Turnstile setup:
1. Check [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
2. Review backend logs for verification errors
3. Test with development keys first
4. Contact Cloudflare support if needed

---

**Last Updated**: December 2024
**Emotio Version**: v3.0
