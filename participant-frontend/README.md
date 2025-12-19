# Participant Frontend

React + TypeScript + Vite application for participant-facing research interface.

## ⚠️ API Configuration - CRITICAL

**DO NOT use `VITE_API_URL` in `.env` files!**

Setting `VITE_API_URL` in `.env` will hardcode the API URL into the JavaScript bundle during build, making it impossible to change without rebuilding the entire application. This causes deployment issues where the wrong API endpoint gets baked into production builds.

### Correct approach:

Use `/public/runtime-config.json` for dynamic API configuration:

```json
{
  "apiBaseUrl": "https://your-api-gateway.execute-api.region.amazonaws.com/stage"
}
```

This file:
- ✅ Can be updated post-deployment without rebuilding
- ✅ Is fetched at runtime with cache-busting
- ✅ Works for both local development and production
- ✅ Allows different environments to use different APIs

### Why this matters:

The app uses `configService` which:
1. Fetches `/runtime-config.json?t=<timestamp>` to bypass cache
2. Reads `apiBaseUrl` from the JSON
3. Fetches `/config` from that base URL to get full API configuration
4. Uses service discovery pattern - no hardcoded routes

If `VITE_API_URL` is set, Vite compiles it into the bundle, breaking this dynamic configuration system.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# Build 1766157525
