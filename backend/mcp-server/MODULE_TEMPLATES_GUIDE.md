# Guía para Crear Module Templates con MCP

Este documento explica cómo usar las herramientas MCP para crear Module Templates de forma sistemática y ordenada.

## Herramientas Disponibles

### 1. `create_module_template`
Crea o actualiza un module template con validación automática de estructura.

**Parámetros:**
- `name` (string, requerido): Nombre del módulo (ej: "Welcome Screen", "Thank You Screen")
- `description` (string, requerido): Descripción del módulo
- `structure` (string, requerido): JSON string con la estructura del módulo
- `stageTemplateName` (string, opcional): Nombre del stage template al que asociar
- `displayOrder` (number, opcional): Orden de visualización (default: 0)

**Estructura JSON esperada:**
```json
{
  "components": [
    {
      "id": "component-id",
      "type": "input|textarea|select|checkbox|radio|file-upload",
      "label": "Label del componente",
      "placeholder": {
        "enabled": true,
        "text": "Placeholder text"
      },
      "required": false,
      "order": 1
    }
  ]
}
```

**Ejemplo de uso:**
```json
{
  "name": "My New Module",
  "description": "Description of my module",
  "structure": "{\"components\":[{\"id\":\"title\",\"type\":\"input\",\"label\":\"Title\",\"placeholder\":{\"enabled\":true,\"text\":\"Enter title\"},\"required\":false,\"order\":1}]}",
  "stageTemplateName": "Smart VOC",
  "displayOrder": 0
}
```

### 2. `generate_module_seed_script`
Genera un script de seed TypeScript para un module template existente.

**Parámetros:**
- `moduleName` (string, requerido): Nombre del módulo template
- `outputPath` (string, opcional): Ruta donde guardar el script (ej: "backend/scripts/seed_my_module.ts")

**Ejemplo de uso:**
```json
{
  "moduleName": "Thank You Screen",
  "outputPath": "backend/scripts/seed_thank_you_screen_module.ts"
}
```

### 3. `list_module_templates`
Lista todos los module templates activos.

**Parámetros:**
- `includeInactive` (boolean, opcional): Incluir módulos inactivos (default: false)

**Ejemplo de uso:**
```json
{
  "includeInactive": false
}
```

### 4. `get_module_template`
Obtiene un module template por nombre con su estructura completa.

**Parámetros:**
- `name` (string, requerido): Nombre del module template

**Ejemplo de uso:**
```json
{
  "name": "Welcome Screen"
}
```

## Flujo de Trabajo Recomendado

### Paso 1: Crear el Module Template
Usa `create_module_template` para crear el módulo con su estructura completa.

**Ventajas:**
- ✅ Validación automática de la estructura
- ✅ Validación de tipos de componentes
- ✅ Asociación automática a stage templates
- ✅ Manejo de errores robusto
- ✅ Transacciones atómicas

### Paso 2: Generar Script de Seed (Opcional)
Si quieres versionar el módulo, usa `generate_module_seed_script` para generar un script TypeScript que puedas guardar en git.

**Ventajas:**
- ✅ Reproducible
- ✅ Versionado en git
- ✅ Fácil de compartir y documentar

### Paso 3: Verificar
Usa `get_module_template` para verificar que el módulo se creó correctamente con todos sus componentes.

## Ejemplo Completo

### Crear un módulo "Feedback Form"

```json
{
  "name": "Feedback Form",
  "description": "Collect user feedback with rating and comments",
  "structure": "{\"components\":[{\"id\":\"rating\",\"type\":\"select\",\"label\":\"Rating\",\"options\":[{\"value\":\"1\",\"label\":\"1\"},{\"value\":\"2\",\"label\":\"2\"},{\"value\":\"3\",\"label\":\"3\"},{\"value\":\"4\",\"label\":\"4\"},{\"value\":\"5\",\"label\":\"5\"}],\"required\":true,\"order\":1},{\"id\":\"comments\",\"type\":\"textarea\",\"label\":\"Comments\",\"placeholder\":{\"enabled\":true,\"text\":\"Enter your feedback...\"},\"required\":false,\"order\":2}]}",
  "stageTemplateName": "Smart VOC",
  "displayOrder": 3
}
```

### Generar script de seed

```json
{
  "moduleName": "Feedback Form",
  "outputPath": "backend/scripts/seed_feedback_form_module.ts"
}
```

## Validaciones Automáticas

La herramienta `create_module_template` valida automáticamente:

1. ✅ JSON válido
2. ✅ Estructura tiene array `components`
3. ✅ Cada componente tiene `id`, `type`, y `label`
4. ✅ Tipo de componente es válido (input, textarea, select, checkbox, radio, file-upload)
5. ✅ Stage template existe (si se especifica)
6. ✅ Usuario creador existe

## Ventajas del Flujo MCP

- **Sistemático**: Mismo proceso para todos los módulos
- **Validado**: Errores detectados antes de guardar
- **Reproducible**: Scripts de seed generados automáticamente
- **Documentado**: Estructura clara y consistente
- **Sin correcciones**: Validaciones previenen errores comunes

