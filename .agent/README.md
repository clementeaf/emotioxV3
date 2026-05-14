# .agent — Architecture Reference

Supplementary documentation for EmotioX v3. For current conventions, features, and deploy instructions see [`CLAUDE.md`](../CLAUDE.md).

## Documents

| File | Purpose |
|------|---------|
| [API_REFERENCE.md](./API_REFERENCE.md) | All backend endpoints, request/response formats, examples |
| [DATA_FLOWS.md](./DATA_FLOWS.md) | Step-by-step flows: research creation, module saving, participant responses, auth |
| [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) | Why Zustand, React Query, JSONB, TypeScript strict, Vite, monorepo |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Cheat sheet: commands, env vars, routes, anti-patterns, debugging tips |
| [GLOSSARY.md](./GLOSSARY.md) | Term definitions, abbreviations, naming conventions |
| [rules-modules-components.md](./rules-modules-components.md) | ComponentConfig interface, component loading priority, module builder rules |

## When to use what

- **Implementing a feature** — check DATA_FLOWS for similar flows, TECHNICAL_DECISIONS for patterns
- **Integrating an endpoint** — API_REFERENCE
- **Debugging data issues** — DATA_FLOWS + QUICK_REFERENCE
- **Understanding "why"** — TECHNICAL_DECISIONS
- **Working on module builder** — rules-modules-components
- **Unfamiliar term** — GLOSSARY
