# Testing Patterns

**Analysis Date:** 2025-03-09

## Test Framework

**Runner:**
- Vitest 4.x (participant-frontend only)
- Config: inline in `participant-frontend/vite.config.ts` (no separate vitest config file)
- No test framework configured for backend or research-frontend

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`)

**Additional Libraries:**
- `@testing-library/react` 16.x (participant-frontend)
- `jsdom` 27.x (participant-frontend, for DOM environment)

**Run Commands:**
```bash
cd participant-frontend && npm test    # Run vitest (watch mode by default)
cd participant-frontend && npx vitest run  # Single run
```

## Test File Organization

**Location:**
- Co-located with source files (test file next to implementation)
- Example: `participant-frontend/src/components/steps/DemographicsStep.test.tsx` alongside `DemographicsStep.tsx`

**Naming:**
- `ComponentName.test.tsx` pattern

**Coverage:**
- Only 1 test file exists in entire codebase: `participant-frontend/src/components/steps/DemographicsStep.test.tsx`
- No test files in backend
- No test files in research-frontend
- No coverage thresholds configured
- No coverage reporting configured

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ComponentName - Feature Area', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset test state
    });

    const mockData: TypeName = {
        // Inline test fixtures
    };

    it('should do expected behavior when condition', async () => {
        const onComplete = vi.fn();
        render(<Component prop={mockData} onComplete={onComplete} />);

        // Interact
        fireEvent.change(screen.getByPlaceholderText('...'), { target: { value: '...' } });
        fireEvent.click(screen.getByText('Continue'));

        // Assert
        await waitFor(() => {
            expect(serviceMock).toHaveBeenCalledWith(expectedArgs);
            expect(onComplete).toHaveBeenCalled();
        });
    });
});
```

**Patterns:**
- `beforeEach` with `vi.clearAllMocks()` for clean state between tests
- Inline mock data objects (not extracted to fixtures)
- Async tests using `waitFor` for assertions after state changes
- `fireEvent` for user interactions (not `userEvent`)

## Mocking

**Framework:** Vitest (`vi.mock`, `vi.fn`, `vi.mocked`)

**Patterns:**
```typescript
// Module-level mocking of stores
vi.mock('../../stores/useSessionStore', () => ({
    useSessionStore: () => ({
        config: {
            id: 'test-research-id',
            settings: { /* ... */ }
        }
    })
}));

// Module-level mocking of services
vi.mock('../../services/public.service', () => ({
    publicService: {
        validateDemographics: vi.fn()
    }
}));

// Mocking browser globals
const mockLocation = { href: '', pathname: '/research/test-research-id/step/1' };
Object.defineProperty(window, 'location', {
    writable: true,
    value: mockLocation,
});

// Setting up mock return values per test
vi.mocked(publicService.validateDemographics).mockResolvedValue({ valid: true });

// Asserting mock calls
expect(publicService.validateDemographics).toHaveBeenCalledWith(
    'test-research-id',
    expect.objectContaining({ age: '25', country: 'Other' })
);
```

**What to Mock:**
- Zustand stores (return static state objects)
- Service layer functions (mock API calls)
- Browser globals (`window.location`)

**What NOT to Mock:**
- React components being tested
- Utility functions
- React hooks from testing-library

## Fixtures and Factories

**Test Data:**
- Inline mock objects within test files (no shared fixtures)
- No factory functions or builder patterns for test data

```typescript
const mockModule: ModuleConfig = {
    id: 'test',
    name: 'Test Demographics',
    description: 'Test Description',
    structure: { components: [] },
    config: {
        demographics: {
            age: { enabled: true },
            country: { enabled: true }
        }
    }
};
```

**Location:**
- No dedicated fixtures directory
- All test data inline in test files

## Coverage

**Requirements:** None enforced
**Tooling:** No coverage tool configured
**Current state:** Effectively 0% coverage -- single test file for one component

## Test Types

**Unit Tests:**
- 1 component test exists (`DemographicsStep.test.tsx`)
- Tests component rendering, user interaction, and service call behavior
- Tests redirect behavior for different backend validation responses

**Integration Tests:**
- Not present

**E2E Tests:**
- Not present
- No Cypress, Playwright, or similar framework configured

**Backend endpoint tests:**
- A script exists at `backend/scripts/test-all-endpoints-cpanel.ts` (run via `npm run test:endpoints:cpanel`)
- This is a manual HTTP test script, not an automated test suite
- No unit or integration tests for backend services

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operations', async () => {
    vi.mocked(service.method).mockResolvedValue({ valid: true });

    render(<Component />);
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
        expect(service.method).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
    });
});
```

**Error/Redirect Testing:**
```typescript
it('should redirect on validation failure', async () => {
    vi.mocked(service.validate).mockResolvedValue({
        valid: false,
        reason: 'DISQUALIFIED',
    });

    render(<Component />);
    // ... interactions ...

    await waitFor(() => {
        expect(window.location.href).toBe('https://example.com/disqualified');
        expect(onComplete).not.toHaveBeenCalled();
    });
});
```

## Pre-commit vs Testing

- Pre-commit hook runs `type-check` and `lint` but does NOT run tests
- Root `package.json` test script is a stub: `echo "Error: no test specified" && exit 1`
- No CI step for automated test execution (GitHub Actions workflows only handle deploy)

## Recommendations for Adding Tests

**When adding new tests:**
- Place test file alongside source: `ComponentName.test.tsx`
- Use Vitest + Testing Library pattern from `DemographicsStep.test.tsx`
- Mock stores at module level with `vi.mock`
- Mock services at module level, set return values in `beforeEach` or per-test
- Use `waitFor` for async assertions

**For backend tests:**
- No test infrastructure exists -- would need to add Vitest or Jest to backend
- Backend uses `APIGatewayProxyEvent` types even though deployed on cPanel/Passenger -- mocking would require constructing full event objects

---

*Testing analysis: 2025-03-09*
