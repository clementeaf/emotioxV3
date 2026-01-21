# Endpoints Pendientes de Prueba

## Resumen
El script actual prueba **43 endpoints** (41 exitosos, 2 omitidos). Los siguientes endpoints **NO están siendo probados**:

## 1. Endpoints Omitidos (Requieren datos específicos)
- ⏭️ `GET /media/by-key` - Requiere key válida de media
- ⏭️ `GET /public/media/by-key` - Requiere s3_key válida

## 2. Endpoints POST (Crear recursos)

### Research Types
- ❌ `POST /research-types` - Crear tipo de investigación

### Research Techniques
- ❌ `POST /research-techniques` - Crear técnica de investigación

### Enterprises
- ❌ `POST /enterprises` - Crear empresa

### Research
- ❌ `POST /research` - Crear investigación
- ❌ `POST /research/:id/activate` - Activar investigación
- ❌ `POST /research/:id/stages` - Crear stage en investigación

### Stage Templates
- ❌ `POST /stage-templates` - Crear template de stage

### Module Templates
- ❌ `POST /module-templates` - Crear template de módulo

### Modules
- ❌ `POST /modules` - Crear módulo
- ❌ `POST /modules/:id/reorder` - Reordenar módulos

### Questions
- ❌ `POST /questions` - Crear pregunta
- ❌ `POST /questions/:id/reorder` - Reordenar preguntas

### Public
- ❌ `POST /public/research/:id/responses` - Guardar respuestas (nuevo endpoint)
- ❌ `POST /public/responses` - Guardar respuestas (legacy, deprecated)

## 3. Endpoints PUT (Actualizar recursos)

### Research Types
- ❌ `PUT /research-types/:id` - Actualizar tipo de investigación
- ❌ `PUT /research-types/:id/module-assignments` - Actualizar asignaciones de módulos

### Research Techniques
- ❌ `PUT /research-techniques/:id` - Actualizar técnica

### Enterprises
- ❌ `PUT /enterprises/:id` - Actualizar empresa

### Research
- ❌ `PUT /research/:id` - Actualizar investigación

### Stage Templates
- ❌ `PUT /stage-templates/:id` - Actualizar template de stage

### Module Templates
- ❌ `PUT /module-templates/:id` - Actualizar template de módulo

### Modules
- ❌ `PUT /modules/:id` - Actualizar módulo
- ❌ `PUT /stages/:stageId/modules/reorder` - Reordenar módulos en stage

### Questions
- ❌ `PUT /questions/:id` - Actualizar pregunta

### Users
- ❌ `PUT /users/:id` - Actualizar usuario

## 4. Endpoints PATCH (Actualización parcial)

### Research Types
- ❌ `PATCH /research-types/:id/modules` - Actualizar módulos del tipo

### Research
- ❌ `PATCH /research/:id/status` - Actualizar estado de investigación

## 5. Endpoints DELETE (Eliminar recursos)

### Research Types
- ❌ `DELETE /research-types/:id` - Eliminar tipo de investigación

### Research Techniques
- ❌ `DELETE /research-techniques/:id` - Eliminar técnica

### Enterprises
- ❌ `DELETE /enterprises/:id` - Eliminar empresa

### Research
- ❌ `DELETE /research/:id` - Eliminar investigación
- ❌ `DELETE /research/:id/stages/:stageId` - Eliminar stage
- ❌ `DELETE /research/:id/modules/:moduleId` - Eliminar módulo
- ❌ `DELETE /research/:id/participants/:participantId` - Eliminar participante

### Stage Templates
- ❌ `DELETE /stage-templates/:id` - Eliminar template de stage

### Module Templates
- ❌ `DELETE /module-templates/:id` - Eliminar template de módulo

### Modules
- ❌ `DELETE /modules/:id` - Eliminar módulo

### Questions
- ❌ `DELETE /questions/:id` - Eliminar pregunta

### Users
- ❌ `DELETE /users/:id` - Eliminar usuario

### Cache
- ❌ `DELETE /cache/clear` - Limpiar cache completo
- ❌ `DELETE /cache/pattern` - Limpiar cache por patrón

## 6. Endpoints GET adicionales

### Media
- ❌ `GET /media` - Listar media (si existe)
- ❌ `POST /media/upload` - Subir media (si es POST)

### Public
- ❌ `GET /public/research/:id/responses` - Obtener respuestas públicas (si existe)

## Total de Endpoints Pendientes

- **POST**: ~15 endpoints
- **PUT**: ~10 endpoints
- **PATCH**: ~2 endpoints
- **DELETE**: ~15 endpoints
- **GET adicionales**: ~3 endpoints
- **Omitidos**: 2 endpoints

**Total aproximado: ~47 endpoints adicionales**

## Notas

1. Los endpoints POST/PUT/DELETE requieren datos de prueba válidos y pueden tener efectos secundarios (crear/actualizar/eliminar datos).

2. Algunos endpoints DELETE pueden ser destructivos y deberían probarse con cuidado.

3. Los endpoints de media requieren archivos o keys válidas que pueden no estar disponibles en el entorno de prueba.

4. Se recomienda agregar estos endpoints al script con flags opcionales para habilitar/deshabilitar pruebas destructivas.
