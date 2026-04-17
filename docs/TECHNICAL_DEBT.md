# Technical Debt — EmotioX V3

> Generated: 2026-04-17 | Baseline: v0.60.3
> Last updated: 2026-04-17 (high-priority items resolved)

## 1. Dead Code

| File | Status |
|------|--------|
| ~~`participant-frontend/src/hooks/useFaceLandmarks.ts`~~ | **Resolved** — deleted (v0.60.4) |
| ~~`research-frontend/src/hooks/useCognitiveTaskAnalytics.ts`~~ | **Resolved** — deleted with unused `cognitiveTask.service.ts` (v0.60.4) |

## 2. Pending TODOs

| Location | Description | Status |
|----------|-------------|--------|
| `backend/src/modules/public/public.service.ts:831` | Turnstile CAPTCHA — code is conditional on `TURNSTILE_SECRET_KEY` env var | Working as designed — enable by setting the env var |
| ~~`participant-frontend/src/services/response.service.ts`~~ | Turnstile dead code paths (`TURNSTILE_ENABLED = false`) | **Resolved** — removed dead branches (v0.60.4) |
| ~~`backend/src/modules/research-types/research-types.service.ts`~~ | Cache disabled temporarily | **Resolved** — re-enabled with `CacheTTL.LONG` (v0.60.4) |
| `research-frontend/src/pages/research-types/ResearchTypeBuilderPage.tsx:67` | `TODO: Load modules when backend supports it` | Open |
| `participant-frontend/src/utils/validation.ts:37` | Empty file validation logic placeholder | Open |

## 3. Active Temporary Hacks

| Location | Hack | Status |
|----------|------|--------|
| ~~`backend/src/modules/auth/auth.controller.ts`~~ | "TEMPORAL" comments on token-in-body pattern | **Resolved** — comments clarified; token in body is the intentional auth flow, not a hack (v0.60.4) |
| ~~`research-frontend/src/services/api/client.ts`~~ | "TEMPORAL" comment + debug console.logs in interceptor | **Resolved** — cleaned comments and removed debug logging (v0.60.4) |
| ~~`participant-frontend/src/main.tsx`~~ | Dead `ENABLE_SW = false` service worker registration block | **Resolved** — removed dead code, kept stale SW cleanup (v0.60.4) |

## 4. Large Files (>800 lines)

| File | Lines | Suggested Action |
|------|-------|------------------|
| `backend/src/modules/analytics/analytics.service.ts` | 2903 | Split into domain modules: SmartVOC, CognitiveTask, IAT, EyeTracking |
| `backend/src/modules/research/research.service.ts` | 1847 | Extract collaborator queries, duplication logic, statistics |
| `research-frontend/src/components/research/ResearchConfigurationModule.tsx` | 1334 | Extract demographics, screening, logo sections as standalone components |
| `research-frontend/src/components/results/eye-tracking/EyeTrackingResults.tsx` | 1304 | Each tab (Heatmap, Scanpath, Emotions, Sequence, etc.) → own component |
| `research-frontend/src/pages/research/ResearchBuilderPage.tsx` | 1148 | Extract module collection rendering logic |
| `participant-frontend/src/components/renderers/EyeTrackingRenderer.tsx` | 1112 | Extract phases (calibration, viewing, complete) as components |
| `backend/src/modules/public/public.service.ts` | 1086 | Separate save responses, validation, quota checking |
| `participant-frontend/src/components/renderers/ImplicitAssociationRenderer.tsx` | 1050 | Extract each paradigm (Attribute Testing, Comparing Attribute, Objects Comparing) |
| `research-frontend/src/components/research/EditableComponent.tsx` | 1008 | Extract editor variants by component type |
| `participant-frontend/src/pages/ResearchPage.tsx` | 992 | Further extraction of flow control logic |
| `research-frontend/src/components/research/CountryConfigModal.tsx` | 979 | Extract city management, quota tabs |
| `research-frontend/src/components/results/cognitive-task/components/NavigationTestCard.tsx` | 939 | Extract heatmap, AOI, prediction sub-panels |
| `research-frontend/src/components/ui/FileUploadAdvanced.tsx` | 897 | Extract hitzone editor, image preview |
| `research-frontend/src/components/layout/ResearchBuilderSidebar.tsx` | 849 | Extract status modal, stage management |

## 5. Type Safety Issues

| Location | Issue |
|----------|-------|
| `research-frontend/.../ResearchConfigurationModule.tsx` | 7× `@typescript-eslint/no-explicit-any` — demographics config uses `Record<string, any>` |
| `backend/src/server-cpanel.ts:335` | `{} as any` for requestContext |
| `research-frontend/.../RankingResultsWrapper.tsx` | Responses cast to `any[]` |
| `research-frontend/.../NavigationFlowResultsWrapper.tsx` | Responses cast to `any[]` |
| `research-frontend/.../PreferenceTestResultsWrapper.tsx` | Responses cast to `any[]` |

Note: `backend/scripts/*.ts` also contain multiple `as any[]` casts but these are dev-only scripts, not production code.

## 6. Prioritization

### High — Direct Impact

1. ~~**Delete `useFaceLandmarks.ts`**~~ — **Done**
2. ~~**Remove API Gateway hacks**~~ — **Done** (clarified comments, removed debug logs)
3. ~~**Turnstile dead code in participant**~~ — **Done** (backend conditional on env var is fine)

### Medium — Maintainability

4. **Split `analytics.service.ts`** (2903 lines) into 4 domain-specific files
5. **Split `EyeTrackingResults.tsx`** into per-tab components
6. **Type demographics config** — replace `any` casts in `ResearchConfigurationModule`

### Low — Nice to Have

7. Split remaining files >800 lines
8. ~~Service worker dead code~~ — **Done**
9. ~~Research types cache~~ — **Done** (re-enabled)
10. ~~Delete `useCognitiveTaskAnalytics.ts` mock hook~~ — **Done**
