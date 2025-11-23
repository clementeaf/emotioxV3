# Project Rules - EmotioxV3

## Git Workflow
- **ALWAYS** before committing:
  1. Build backend: `npm run build` (in `/backend`)
  2. Lint + Build frontend: `npm run lint && npm run build` (in `/research-frontend`)
  3. Only then: `git add . && git commit -m "..." && git push`

## Module Template Structure
### Valid Component Types
- Use ONLY: `input`, `textarea`, `select`, `checkbox`, `radio`, `file-upload`
- **NEVER** use: `text_input` (invalid type)

### Placeholder Structure
- **ALWAYS** use object format: `{ enabled: boolean, text: string }`
- **NEVER** use string format: `placeholder: "some text"`

### Module Definitions
#### Welcome Screen
- Input: Title
- Textarea: Message
- Input: Start button text

#### CSAT (Customer Satisfaction Score)
- Input: Question title
- Select: Display type (Numbers/Stars)
- Note: 1-5 range is fixed and not configurable

#### CV (Cognitive Value)
- Input: Question
- Select: Rating (custom range 2-5, with startLabel/endLabel)

#### NEV (Net Emotional Value)
- Input: Question
- Select: Rating (predefined 1-5)

## Code Standards
- **CRITICAL**: NEVER use `any` or implicit `any` types under ANY circumstances
  - Always define explicit types
  - Use proper TypeScript interfaces and types
  - If unsure of a type, use `unknown` and narrow it down, never `any`
- Always use proper TypeScript types
- Import types from `moduleBuilder.types.ts` when needed
- Use `SelectRangeConfig`, `PlaceholderConfig`, `ComponentConfig` types
