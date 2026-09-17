# AGENT.md

## Principle

Fixes make the system simpler, not more complex.
Prefer removing or consolidating code over adding a new layer, flag, or special case.
If a fix grows the system's surface area, look for the version that shrinks it.

## Zero Comments

No comments in the repo. Zero means zero:
- No explanatory comments or docblocks
- No TODO/FIXME/HACK/XXX notes
- No lint or type suppression directives
- No commented-out code

Express intent through names, structure, and tests.
Put rationale in commit messages or PR descriptions.
Interpreter shebangs are executable directives, not comments.

## Naming

Names replace comments. Every name must convey intent without context.
- Functions: verb + object. `parseToken`, `validateInput`, `buildQuery`.
- Booleans: `isActive`, `hasPermission`, `canRetry`. Never `flag`, `check`, `status` alone.
- Collections: plural. Iterators: singular of the collection.
- No abbreviations except universal ones (id, url, http, api, db).
- If naming is hard, the abstraction is wrong. Restructure first.

## Code Standards

- One way to do each thing. If two patterns coexist, pick one and migrate.
- No dead code. If it's unused, delete it.
- No backwards-compatibility shims. Change the code directly.
- No feature flags for unreleased work. Ship or don't.
- No abstractions with a single implementation. Inline it.
- Validate at system boundaries only. Trust internal code.

## Changes

- Smallest diff that solves the problem.
- Bug fix = root cause fix. Trace every caller before patching.
- No cleanup commits bundled with feature work. Separate concerns.

## Error Handling

- Fail fast. Surface errors at the point of detection, don't pass broken state downstream.
- No silent catches. Every caught error either recovers with a defined fallback or re-throws.
- No generic catch-all handlers except at the outermost boundary (main, request handler, entry point).
- Error messages state what failed and with what input. Never "something went wrong".

## Testing

- Non-trivial logic gets one runnable check: the smallest thing that fails if the logic breaks.
- Tests prove behavior, not implementation. No mocking internals.
- Flaky test = broken test. Fix or delete immediately.

## Dependencies

- Stdlib first. Platform native second. Existing dependency third.
- Never add a dependency for what a few lines can do.
- Pin versions. No floating ranges in production.

## Commits

- Conventional Commits format: `type(scope): description`.
- Subject ≤ 50 chars. Imperative mood. No period.
- Body explains WHY, not WHAT. The diff shows what changed.
- One logical change per commit. Never mix refactor with feature.
- Each commit compiles and passes tests on its own.

## Observability

- Log at system boundaries: inbound requests, outbound calls, errors, auth decisions.
- Structured logging (JSON). No free-form strings in production.
- Log levels mean something: ERROR = action needed, WARN = degraded but functional, INFO = business events, DEBUG = off in production.
- No logging of secrets, tokens, passwords, or PII.

## Pre-Change Checklist

Before proposing any change, verify:
- [ ] Existing tests pass
- [ ] New/changed logic has a test
- [ ] No lint or type errors introduced
- [ ] No secrets or credentials in the diff
- [ ] Commit message explains the why

## Agent Conduct

### Honesty

- Never claim something works without executing it and seeing the result.
- Never fabricate command output, test results, or API responses.
- "It should work" is not an answer. Run it. Show the output.
- If uncertain, say so. Wrong confidence is worse than admitted ignorance.
- Never silently skip a failing test or suppress an error to appear successful.

### Completion

Nothing is "done" until it survives the gauntlet:
- Unit tests pass for every branch and edge case.
- Integration tests confirm components interact correctly.
- Data integrity is preserved: no orphaned records, no broken constraints, no silent corruption.
- Business rules are enforced at every layer they apply: UI, API, database.
- Invalid input is rejected before it reaches persistence.
- The happy path works. Every known unhappy path works. Boundary values work.
- Performance under realistic load is acceptable, not just single-request demos.
- The agent ran the full test suite and reports the actual result, not a prediction.

"Done" = requirement met + gauntlet passed + evidence shown. Everything else is "in progress".

### Verification

- Read the file before editing it. Every time.
- Search the codebase before creating a new function, type, or utility.
- Run the test suite before and after every change. Compare results.
- Reproduce the bug before writing the fix. Confirm the fix eliminates the reproduction.
- Never assume the database schema. Query it.
- Never assume an endpoint's behavior. Call it.

### Communication

- State what changed and what the test results were. Nothing else unless asked.
- No filler: "I'll now proceed to", "Let me", "Sure!", "Great question".
- No narrating what is obvious from the diff.
- No speculative explanations for things that weren't asked.
- Error reports: what failed, what input triggered it, what was expected vs actual.

### Full-Stack Awareness

When the agent has access to frontend, backend, and database:

- Never guess a data type. Read the schema, the interface, the entity. The source of truth is there.
- Never return a generic 404 or 500. Trace the exact point of failure: which table, which column, which constraint, which record is missing or malformed. Report it precisely.
- Never use `console.log`, `print`, or debug logging to discover data. The agent can read the code, the types, the schema, and the actual data — use that access directly.
- Never assume a field "could be" null or undefined without checking the DB constraint, the DTO, and the validation layer. If all three say required, it's required — no defensive null checks for impossible states.
- Never write a catch block that returns a vague error message. The agent knows the full call chain — name the exact function, the exact input, and the exact failure.
- Status codes must be precise: 400 for validation failure (say which field), 404 only when a specific record by specific ID does not exist in a specific table, 409 for conflicts, 422 for business rule violations. 500 means the agent failed to handle a known case.
- If the agent can see the database, it can verify data exists before writing code that queries it. No lazy "this might not exist" patterns when existence is checkable.

### Diagnostic Discipline

- Symptoms are not causes. Trace the full execution path before proposing a fix.
- One hypothesis at a time. Test it. Discard or confirm. Then next.
- Never shotgun multiple changes hoping one fixes it. That introduces new unknowns.
- If a fix requires more than one logical change, each change gets its own verification cycle.

### Redundancy Prevention

- Before writing anything: search for existing implementations, utilities, helpers, types.
- If similar logic exists in two places, consolidate into one before adding a third.
- Never copy-paste and modify. Extract, parameterize, reuse.
- If a dependency already solves it, use the dependency.

### Scope Discipline

- Do exactly what was requested. Nothing more.
- Never refactor, rename, or "improve" code outside the task boundary.
- Never add features, utilities, or abstractions the requirement did not ask for.
- If the task is "fix the login bug", only the login path is in scope. Adjacent code is off limits.
- If fixing the root cause requires touching out-of-scope code, state the scope expansion and get approval before proceeding.

### Escalation

Stop and ask the human when:
- The requirement is ambiguous and two interpretations lead to different implementations.
- The change could cause data loss, schema changes, or irreversible state transitions.
- An architectural decision is needed that affects other modules or services.
- The fix requires changing a public API contract or breaking existing consumers.
- Two valid approaches exist with meaningful trade-offs. Never pick silently.
- You've been stuck on the same problem for more than two attempts.

Guessing is not escalation. Asking is.

### Rollback

- If a change breaks existing tests: revert first, analyze second, fix third.
- Never stack fixes on top of a broken change. Undo, understand, redo.
- If a fix introduces more issues than it solves, revert entirely and report what happened.
- Every change should be reversible with a single `git revert`. If it isn't, the change was too big.

## Code Style Consistency

- Match the existing style of the file and project. Never introduce a new convention.
- If a file uses early returns, use early returns. If it uses guard clauses, use guard clauses.
- Never mix paradigms within the same file: functional and imperative, async and sync, callbacks and promises.
- When the project has an established pattern for something, replicate it exactly. Consistency beats preference.

## Size Limits

- Functions: one screen, one responsibility. If it needs scrolling, extract.
- Files: under 500 lines. If larger, the module has more than one reason to exist. Split.
- Parameters: 3 max. Beyond that, use a structured object.
- Nesting: 2 levels max. Flatten with early returns or extraction.
- PRs: under 400 lines of diff. Larger changes get broken into sequential PRs.

## Data Safety

- Never DROP, TRUNCATE, or delete tables/columns without explicit human approval.
- Schema changes with existing data require a migration plan: add new → migrate data → remove old.
- Never change a column type, nullability, or constraint without verifying impact on existing records.
- Destructive migrations are irreversible. Treat them as production deployments, not dev convenience.
- Seed data and test fixtures never touch production databases.

## Regression Proof

- Run the full test suite before and after every change.
- Report the delta: "before: 47 pass / 0 fail → after: 48 pass / 0 fail".
- If any previously passing test fails after the change, the change is broken regardless of whether the new feature works.
- Never report "tests pass" without showing the count. Numbers don't lie, summaries do.

## Security

- No secrets in code, config, or env files committed to the repo.
- Sanitize at trust boundaries. Parameterize queries. Escape output.
- Least privilege for all credentials and permissions.

