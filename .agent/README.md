# 🧠 EmotioX v3 - Sistema de Memoria del Agente IA

Este directorio contiene la **memoria completa** del sistema EmotioX v3, diseñada para que un agente IA pueda entender completamente el proyecto, sus decisiones, flujos y arquitectura.

## 📚 Documentación Disponible

### 1. 🏗️ [Arquitectura del Sistema](./SYSTEM_ARCHITECTURE.md)
**Qué cubre:**
- Visión general de alto nivel
- Estructura del monorepo
- Flujo de datos principal
- Modelo de datos core
- Sistema de módulos
- Tecnologías y stack

**Cuándo consultarlo:**
- Necesitas entender cómo está organizado el proyecto
- Quieres saber qué tecnologías se usan y por qué
- Necesitas el big picture del sistema
- Quieres entender cómo se conectan los 3 frontales

### 2. 🔄 [Flujos de Datos Críticos](./DATA_FLOWS.md)
**Qué cubre:**
- Creación de Research paso a paso
- Configuración de módulos en STAGES
- Guardado de módulos (preservando estructura)
- Subida de imágenes a S3 con presigned URL
- Generación y uso de QR codes
- Participación de usuarios
- Análisis de resultados
- Autenticación y refresh de tokens

**Cuándo consultarlo:**
- Necesitas implementar o modificar un flujo existente
- Quieres saber cómo fluyen los datos entre componentes
- Necesitas debuggear un problema de integración
- Quieres entender el ciclo completo de un proceso

### 3. 🎯 [Decisiones Técnicas y Patrones](./TECHNICAL_DECISIONS.md)
**Qué cubre:**
- Por qué Zustand vs Context API
- Por qué React Query para server state
- Por qué JSONB vs tablas relacionales
- Por qué upload inmediato vs lazy upload
- Por qué Serverless vs Traditional Server
- Por qué Monorepo vs Multiple Repos
- Por qué TypeScript Strict Mode
- Por qué Vite vs Create React App

**Cuándo consultarlo:**
- Necesitas entender **por qué** se tomó una decisión
- Estás evaluando cambiar una tecnología
- Quieres saber cuándo usar un patrón específico
- Necesitas justificar una decisión técnica

### 4. 🔐 [Arquitectura de Autenticación](../research-frontend/ARCHITECTURE_AUTH.md)
**Qué cubre:**
- Por qué Zustand Store vs Hook Simple
- Comparación de enfoques de autenticación
- Flujo de login y refresh de tokens
- Persistencia automática
- Acceso desde interceptor de Axios

**Cuándo consultarlo:**
- Trabajas con autenticación
- Necesitas modificar el sistema de auth
- Quieres entender el flujo de tokens

### 5. 📦 [Formato de Datos de Módulos](../research-frontend/DATA_FORMAT.md)
**Qué cubre:**
- Estructura exacta de `module.config`
- Especificación de ComponentConfig
- Ejemplos de guardado correcto vs incorrecto
- Flujo completo research-frontend → backend → participant-frontend
- Validación y checklist

**Cuándo consultarlo:**
- Trabajas con módulos y sus componentes
- Necesitas entender cómo se guardan los datos
- Estás debuggeando problemas de formato de datos
- Necesitas agregar un nuevo tipo de componente

### 6. 🚀 [Guía de Deployment](../DEPLOYMENT.md)
**Qué cubre:**
- Setup completo de AWS infrastructure
- Configuración de RDS PostgreSQL
- Deploy de Lambda + API Gateway
- Configuración de CloudFront
- GitHub Actions CI/CD
- Variables de entorno
- Troubleshooting

**Cuándo consultarlo:**
- Necesitas deployar a producción
- Quieres configurar un nuevo ambiente
- Estás resolviendo problemas de deployment
- Necesitas configurar CI/CD

### 7. 📊 [Optimizaciones de Performance](../research-frontend/PERFORMANCE_OPTIMIZATIONS.md)
**Qué cubre:**
- Code splitting y lazy loading
- Optimización de bundle size
- Métricas de performance
- Mejoras implementadas

**Cuándo consultarlo:**
- El frontend está lento
- Necesitas optimizar bundle size
- Quieres entender las optimizaciones actuales

### 8. 📝 [Módulos Cognitivos](../COGNITIVE_TASKS_MODULES.md)
**Qué cubre:**
- Definición de los 8 módulos de Cognitive Tasks
- Estructura de componentes para cada módulo
- Configuración específica de cada tipo

**Cuándo consultarlo:**
- Trabajas con módulos de Cognitive Tasks
- Necesitas agregar o modificar un módulo cognitivo
- Quieres entender la estructura de módulos

### 9. 📈 [Módulos SmartVOC](../SMART_VOC_MODULES.md)
**Qué cubre:**
- Definición de los 5 módulos SmartVOC
- CES, CSAT, NPS, NEV, CV
- Estructura y fórmulas de cálculo

**Cuándo consultarlo:**
- Trabajas con módulos SmartVOC
- Necesitas entender cómo se calculan las métricas
- Quieres agregar un nuevo módulo SmartVOC

### 10. 🗄️ [Database README](../database/README.md)
**Qué cubre:**
- Estructura de la base de datos
- Migraciones disponibles
- Cómo ejecutar migraciones
- Schema principal

**Cuándo consultarlo:**
- Necesitas crear una nueva migración
- Quieres entender el schema de DB
- Estás resolviendo problemas de base de datos

### 11. 🌐 [API Reference](./API_REFERENCE.md)
**Qué cubre:**
- Todos los endpoints del backend
- Request/Response formats
- Headers y autenticación
- Ejemplos de uso
- Error responses

**Cuándo consultarlo:**
- Necesitas integrar un endpoint
- Quieres saber qué datos enviar/recibir
- Estás debuggeando llamadas al API
- Necesitas entender la estructura de datos

### 12. ⚡ [Quick Reference](./QUICK_REFERENCE.md)
**Qué cubre:**
- Comandos rápidos
- Variables de entorno
- Rutas principales
- Flujos clave simplificados
- Anti-patrones comunes
- Debugging tips

**Cuándo consultarlo:**
- Necesitas algo rápido sin leer docs completas
- Olvidaste un comando
- Quieres ver ejemplos concretos
- Necesitas recordar un flujo básico

### 13. 📖 [Glossary](./GLOSSARY.md)
**Qué cubre:**
- Definiciones de todos los términos
- Abreviaciones comunes
- Convenciones de naming
- Relaciones entre conceptos

**Cuándo consultarlo:**
- No entiendes un término técnico
- Quieres saber qué significa una abreviación
- Necesitas claridad sobre la diferencia entre conceptos similares

---

## 🎯 Casos de Uso Comunes

### "Necesito implementar una nueva feature"

1. Lee [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) para el contexto general
2. Revisa [DATA_FLOWS.md](./DATA_FLOWS.md) para ver flujos similares
3. Consulta [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) para elegir el patrón correcto

### "Algo no funciona como esperaba"

1. Identifica el flujo afectado en [DATA_FLOWS.md](./DATA_FLOWS.md)
2. Revisa [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) para entender el componente
3. Consulta documentación específica del módulo si es necesario

### "¿Por qué está implementado así?"

1. Busca en [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md)
2. Si es sobre módulos, revisa [DATA_FORMAT.md](../research-frontend/DATA_FORMAT.md)
3. Si es sobre auth, revisa [ARCHITECTURE_AUTH.md](../research-frontend/ARCHITECTURE_AUTH.md)

### "Necesito deployar a producción"

1. Sigue [DEPLOYMENT.md](../DEPLOYMENT.md) paso a paso
2. Consulta [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) para entender la arquitectura AWS
3. Revisa variables de entorno necesarias

### "Quiero optimizar performance"

1. Lee [PERFORMANCE_OPTIMIZATIONS.md](../research-frontend/PERFORMANCE_OPTIMIZATIONS.md)
2. Consulta [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) para entender las decisiones de tech stack
3. Revisa [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) para identificar bottlenecks

---

## 🔍 Cómo Buscar Información

### Por Tema

- **Autenticación**: [ARCHITECTURE_AUTH.md](../research-frontend/ARCHITECTURE_AUTH.md)
- **Módulos y Componentes**: [DATA_FORMAT.md](../research-frontend/DATA_FORMAT.md)
- **Flujos de Datos**: [DATA_FLOWS.md](./DATA_FLOWS.md)
- **Decisiones Técnicas**: [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md)
- **Deployment**: [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Performance**: [PERFORMANCE_OPTIMIZATIONS.md](../research-frontend/PERFORMANCE_OPTIMIZATIONS.md)

### Por Tecnología

- **Zustand**: [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md#1-estado-global-zustand-vs-context-api)
- **React Query**: [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md#2-server-state-react-query)
- **S3 Upload**: [DATA_FLOWS.md](./DATA_FLOWS.md#4-subida-de-imágenes-a-s3)
- **PostgreSQL JSONB**: [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md#3-módulos-como-jsonb-vs-tablas-relacionales)
- **AWS Lambda**: [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md#5-serverless-vs-traditional-server)

### Por Feature

- **Research Creation**: [DATA_FLOWS.md](./DATA_FLOWS.md#1-creación-de-research)
- **STAGES Configuration**: [DATA_FLOWS.md](./DATA_FLOWS.md#2-configuración-de-módulos-en-stages)
- **QR Code Generation**: [DATA_FLOWS.md](./DATA_FLOWS.md#5-generación-de-qr-code)
- **Participant Response**: [DATA_FLOWS.md](./DATA_FLOWS.md#6-participación-de-usuario)
- **Results Analysis**: [DATA_FLOWS.md](./DATA_FLOWS.md#7-análisis-de-resultados)

### Por Endpoint API

- **Research Endpoints**: [API_REFERENCE.md](./API_REFERENCE.md#research)
- **Modules Endpoints**: [API_REFERENCE.md](./API_REFERENCE.md#modules)
- **Media/S3 Endpoints**: [API_REFERENCE.md](./API_REFERENCE.md#media-s3)
- **Public Endpoints**: [API_REFERENCE.md](./API_REFERENCE.md#public-endpoints)
- **Analysis Endpoints**: [API_REFERENCE.md](./API_REFERENCE.md#analysis)

---

## 📊 Mapa Mental del Proyecto

```
EmotioX v3
│
├─ 🏗️ ARQUITECTURA
│   ├─ 3 Aplicaciones (research, participant, backend)
│   ├─ Monorepo con shared types
│   ├─ AWS Serverless (Lambda + S3 + RDS)
│   └─ PostgreSQL con JSONB
│
├─ 🔐 AUTENTICACIÓN
│   ├─ AWS Cognito
│   ├─ Zustand Store (persistencia automática)
│   └─ JWT tokens (access + refresh)
│
├─ 📦 MÓDULOS
│   ├─ SmartVOC (5 módulos)
│   ├─ Cognitive Tasks (8 módulos)
│   ├─ Custom Modules
│   └─ ComponentConfig (JSONB structure)
│
├─ 🔄 FLUJOS PRINCIPALES
│   ├─ Research Creation → STAGES → Modules
│   ├─ QR Code → Participant → Responses
│   ├─ S3 Upload (immediate, presigned URL)
│   └─ Analysis → Metrics Calculation
│
├─ 🎯 DECISIONES TÉCNICAS
│   ├─ Zustand (vs Context API)
│   ├─ React Query (vs manual state)
│   ├─ JSONB (vs relational)
│   ├─ Lambda (vs EC2)
│   └─ Vite (vs CRA)
│
└─ 🚀 DEPLOYMENT
    ├─ Backend → Lambda + API Gateway
    ├─ Frontends → S3 + CloudFront
    ├─ Database → RDS PostgreSQL
    └─ CI/CD → GitHub Actions
```

---

## 🆕 Manteniendo la Documentación

### Cuándo Actualizar

- ✅ **Siempre** que cambies una decisión técnica importante
- ✅ **Siempre** que agregues un nuevo flujo de datos
- ✅ **Siempre** que modifiques la arquitectura
- ✅ **Periódicamente** para reflejar mejoras incrementales

### Cómo Actualizar

1. Identifica qué documento afecta tu cambio
2. Actualiza la sección relevante
3. Actualiza este README si agregaste nuevo contenido
4. Commit con mensaje descriptivo: `docs: update XYZ flow in DATA_FLOWS.md`

### Convenciones

- Usa emojis para secciones (🔄 para flujos, 🎯 para decisiones, etc.)
- Incluye code examples cuando sea posible
- Marca decisiones críticas con **✅** o **❌**
- Incluye diagramas ASCII cuando ayude a visualizar

---

## 💡 Tips para el Agente IA

### Antes de Hacer Cambios

1. **Lee el documento relevante completamente**
2. **Entiende el "por qué" antes del "cómo"**
3. **Verifica que no rompas un flujo existente**
4. **Considera el impacto en otros componentes**

### Al Implementar

1. **Sigue los patrones establecidos** en TECHNICAL_DECISIONS.md
2. **Preserva estructuras críticas** (especialmente ComponentConfig)
3. **Invalida React Query cache apropiadamente**
4. **Usa TypeScript strict correctamente**

### Al Debuggear

1. **Identifica el flujo afectado** en DATA_FLOWS.md
2. **Verifica que los datos sigan el formato correcto** (DATA_FORMAT.md)
3. **Revisa las decisiones técnicas** para entender el comportamiento esperado
4. **Consulta ejemplos de código** en los documentos

### Palabras Clave de Búsqueda

Si necesitas algo específico, busca estos términos en los documentos:

- `CRITICAL` - Decisiones o código crítico que no debe romperse
- `NEVER` - Cosas que nunca debes hacer
- `ALWAYS` - Cosas que siempre debes hacer
- `✅` - Patrones correctos/recomendados
- `❌` - Anti-patrones/errores comunes

---

## 🎓 Recursos Adicionales

### Externos

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

### Internos

- [`backend/scripts/`](../backend/scripts/) - Scripts de seed y setup
- [`database/migrations/`](../database/migrations/) - Migraciones SQL
- [`.github/workflows/`](../.github/workflows/) - CI/CD pipelines

---

## ✨ Próximos Pasos Recomendados

1. **Testing**: Documentar estrategia de testing
2. **API Reference**: Crear doc de todos los endpoints
3. **Components Library**: Documentar todos los componentes UI
4. **Error Handling**: Documentar estrategia de manejo de errores
5. **Security**: Documentar consideraciones de seguridad

---

**Última actualización**: 2025-12-06
**Versión del sistema**: v3.0
**Mantenedor**: Sistema de memoria del agente IA
