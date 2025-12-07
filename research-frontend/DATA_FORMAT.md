# Data Format Specification - Module Config

## Critical: Backend-Frontend Data Contract

This document specifies the **exact data format** that must be maintained between:
- **research-frontend** (saves module configurations)
- **backend** (stores in PostgreSQL)
- **participant-frontend** (receives and renders modules)

## Module Config Structure

### Database Schema (PostgreSQL)
```sql
modules (
    id UUID PRIMARY KEY,
    research_id UUID,
    stage_id UUID,
    name VARCHAR,
    description TEXT,
    config JSONB,  -- ⚠️ CRITICAL: This must follow the format below
    order_index INTEGER,
    is_from_template BOOLEAN
)
```

### Config JSON Format
The `config` field **MUST** follow this exact structure:

```typescript
{
    structure: {
        components: ComponentConfig[]
    }
}
```

### ComponentConfig Type
```typescript
interface ComponentConfig {
    id: string;                    // Unique component identifier
    type: ComponentType;           // 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file-upload' | 'choices'
    label: string;                 // Display label
    
    // Optional configurations
    placeholder?: PlaceholderConfig;
    selectRange?: SelectRangeConfig;
    fileUpload?: FileUploadConfig;
    choicesConfig?: ChoicesConfig;
    options?: { label: string; value: string }[];
    editableFields?: string[];
    hidden?: boolean;
    settings?: ComponentSettings;
    order?: number;
    validation?: ValidationConfig;
    value?: string;                // User-entered value (editable components)
}

interface ComponentSettings {
    groupLabel?: string;
    isChoice?: boolean;
    description?: string;
    name?: string;
    readonly?: boolean;           // If true, value is in defaultValue
    defaultValue?: string;        // Pre-filled value for readonly components
    choices?: Array<{
        id: string;
        label: string;
        value?: string;
        eligibility?: 'Qualify' | 'Disqualify';
    }>;
    [key: string]: unknown;
}
```

## Save Flow - research-frontend

### ❌ WRONG (Old Implementation)
```typescript
// DON'T DO THIS - componentValues is Record<string, string>
config: {
    ...activeModule.config,
    components: componentValues  // ❌ Loses component structure
}
```

### ✅ CORRECT (Current Implementation)
```typescript
// Preserve component structure, update values
const updatedComponents = components.map(comp => ({
    ...comp,
    ...(comp.settings?.readonly 
        ? { settings: { ...comp.settings, defaultValue: componentValues[comp.id] } }
        : { value: componentValues[comp.id] }
    )
}));

const config = {
    ...activeModule.config,
    structure: {
        ...(activeModule.config.structure || {}),
        components: updatedComponents  // ✅ Preserves full ComponentConfig[]
    }
};
```

## Backend Processing

### When Creating Module from Template
```typescript
// backend/src/modules/research/research.service.ts
const config = {
    structure: templateModule.structure  // Already has { components: [...] }
};

await client.query(moduleQuery, [
    researchId,
    newStage.id,
    templateModule.name,
    templateModule.description,
    templateModule.display_order,
    JSON.stringify(config),  // ✅ Saved as JSONB
]);
```

### When Updating Module
```typescript
// backend/src/modules/modules/modules.service.ts
if (config !== undefined) {
    updates.push(`config = $${paramIndex++}`);
    values.push(JSON.stringify(config));  // ✅ Stringified before DB
}
```

### When Reading Module
```typescript
// backend/src/modules/research/research.service.ts
research.stages = stagesResult.rows.map((row: any) => ({
    ...row,
    modules: (row.modules || []).map((module: any) => {
        let config = module.config;
        // Parse if string (shouldn't happen but defensive)
        if (typeof config === 'string') {
            config = JSON.parse(config);
        }
        return {
            ...module,
            config: config || {}  // ✅ Parsed JSONB as object
        };
    })
}));
```

## Frontend Reading - useModuleComponents

### Component Loading Priority
```typescript
// 1. Check config.structure.components (PRIMARY - new format)
if ('structure' in activeModule.config) {
    const structure = activeModule.config.structure;
    if (structure?.components && Array.isArray(structure.components)) {
        moduleComponents = structure.components;  // ✅ Use this
    }
}

// 2. Check config.components (FALLBACK - legacy format)
if (moduleComponents.length === 0 && 'components' in activeModule.config) {
    const components = activeModule.config.components;
    if (Array.isArray(components)) {
        moduleComponents = components;
    }
}

// 3. Check questions (FALLBACK - old questions system)
if (moduleComponents.length === 0 && activeModule.questions) {
    moduleComponents = activeModule.questions.map(q => ({
        id: q.id,
        type: q.type,
        label: q.text,
        ...q.config
    }));
}
```

## Example Complete Flow

### 1. Template Creation
```json
{
    "name": "Welcome Screen",
    "structure": {
        "components": [
            {
                "id": "title",
                "type": "input",
                "label": "Title",
                "settings": {
                    "readonly": true,
                    "defaultValue": "Welcome to the Research"
                }
            },
            {
                "id": "message",
                "type": "textarea",
                "label": "Message",
                "placeholder": {
                    "text": "Enter welcome message..."
                }
            }
        ]
    }
}
```

### 2. Module Instance (Database)
```json
{
    "structure": {
        "components": [
            {
                "id": "title",
                "type": "input",
                "label": "Title",
                "settings": {
                    "readonly": true,
                    "defaultValue": "Welcome to Study XYZ"
                }
            },
            {
                "id": "message",
                "type": "textarea",
                "label": "Message",
                "value": "Thank you for participating in our research..."
            }
        ]
    }
}
```

### 3. Frontend Edit State
```typescript
componentValues = {
    "title": "Welcome to Study XYZ",
    "message": "Thank you for participating in our research..."
}
```

### 4. Save Back to DB
```typescript
// Merges componentValues into components structure
const updatedComponents = components.map(comp => ({
    ...comp,
    ...(comp.settings?.readonly 
        ? { settings: { ...comp.settings, defaultValue: componentValues[comp.id] } }
        : { value: componentValues[comp.id] }
    )
}));

config = {
    structure: {
        components: updatedComponents  // ✅ Full structure preserved
    }
}
```

## Validation Checklist

Before any "Save Changes":

- [ ] `config` has `structure` property
- [ ] `structure` has `components` array
- [ ] Each component has `id`, `type`, `label`
- [ ] Values are stored in either:
  - `value` property (editable)
  - `settings.defaultValue` (readonly)
- [ ] No `Record<string, string>` directly in config
- [ ] `JSON.stringify()` before DB write
- [ ] `JSON.parse()` after DB read (if string)

## Common Pitfalls

### ❌ Saving form values directly
```typescript
config: { components: componentValues }  // Wrong - loses structure
```

### ❌ Overwriting entire config
```typescript
config: { structure: { components: [] } }  // Wrong - loses other config
```

### ✅ Correct approach
```typescript
config: {
    ...activeModule.config,           // Preserve other properties
    structure: {
        ...(activeModule.config.structure || {}),  // Preserve other structure
        components: updatedComponents   // Update only components
    }
}
```

## Participant Frontend Consumption

The participant-frontend will receive modules via:
```
GET /public/research/:id
```

Response format:
```json
{
    "research": {
        "stages": [
            {
                "modules": [
                    {
                        "config": {
                            "structure": {
                                "components": [...]  // ✅ Renders from this
                            }
                        }
                    }
                ]
            }
        ]
    }
}
```

## Files Modified for Consistency

1. **research-frontend/src/pages/research/ResearchBuilderPage.tsx**
   - Lines 73-121: Updated `handleSaveModule` to preserve structure

2. **backend/src/modules/modules/modules.service.ts**
   - Lines 21-47: `update()` - JSON.stringify config

3. **backend/src/modules/research/research.service.ts**
   - Lines 289-308: Parse config when reading from DB
   - Lines 487-526: Create modules with correct structure

## Testing Required

1. Create new research with stages
2. Edit module components in research-frontend
3. Save changes
4. Verify DB has correct `config.structure.components`
5. Reload page - verify data loads correctly
6. Check participant-frontend receives correct format
7. Verify all component types render properly

---

**Last Updated**: 2025-12-06
**Critical**: DO NOT modify this format without updating all three systems (research-frontend, backend, participant-frontend)
