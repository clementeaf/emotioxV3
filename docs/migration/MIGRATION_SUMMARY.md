# Resumen de Migración EmotioX V3

## 📋 Resumen Ejecutivo

He revisado las credenciales proporcionadas y preparado un **plan completo de migración** para mover todo el ecosistema EmotioX V3 desde la cuenta AWS actual (041238861016) a la nueva cuenta AWS "cefal" (058310292956).

## 🎯 Objetivo

Migrar toda la infraestructura de EmotioX V3 a la nueva cuenta AWS manteniendo:
- ✅ Zero downtime o downtime mínimo
- ✅ Todos los datos preservados
- ✅ Mismas URLs y dominios
- ✅ Configuración de Google OAuth
- ✅ Funcionalidad completa

## 📦 Componentes a Migrar

1. **Backend (AWS Lambda + API Gateway)**
   - Stack production: `emotioxv3-backend-production`
   - Stack dev: `emotioxv3-backend-dev`
   - Custom Domain: `api.emotiox.org`

2. **Research Frontend (S3 + CloudFront)**
   - Domain: `research.emotiox.org`
   - Bucket: `emotioxv3-research-frontend`

3. **Participant Frontend (S3 + CloudFront)**
   - Domain: `participant.emotiox.org`
   - Bucket: `emotioxv3-participant-frontend`

4. **Cognito User Pool**
   - Google OAuth configurado
   - Domain: `emotioxv3-2126.auth.us-east-1.amazoncognito.com`

5. **Base de Datos PostgreSQL**
   - Opción A: Migrar a nueva RDS
   - Opción B: Mantener Neon DB actual (recomendado)

6. **Configuración (SSM Parameter Store)**
   - ~13 parámetros por environment (production/dev)

7. **GitHub Actions Workflows**
   - Deploy backend
   - Deploy research frontend
   - Deploy participant frontend

## 📚 Documentación Generada

### 1. **MIGRATION_PLAN.md** (Documento Principal)
Plan detallado paso a paso con 17 fases:
- Fase 0: Preparación y Backup
- Fase 1: Configurar Nueva Cuenta AWS
- Fase 2: Migrar Base de Datos
- Fase 3: Crear Certificados SSL
- Fase 4: Configurar Cognito
- Fase 5: Crear Buckets S3
- Fase 6: Crear Distribuciones CloudFront
- Fase 7: Configurar SSM Parameter Store
- Fase 8: Actualizar serverless.yml
- Fase 9: Actualizar GitHub Secrets
- Fase 10: Desplegar Backend
- Fase 11: Configurar Custom Domain para API
- Fase 12: Actualizar DNS para Frontends
- Fase 13: Generar runtime-config.json
- Fase 14: Deploy Frontends desde GitHub Actions
- Fase 15: Verificación y Testing
- Fase 16: Monitoreo Post-Migración
- Fase 17: Cleanup de Recursos Antiguos

### 2. **MIGRATION_CHECKLIST.md**
Checklist imprimible con todos los pasos:
- ✅ Pre-Migración (4 items)
- 🔧 Configuración Nueva Cuenta (3 items)
- 🗄️ Base de Datos (2 opciones)
- 🔒 Certificados SSL (4 certificados)
- 🔐 Cognito (6 pasos)
- 🪣 Buckets S3 (3 buckets)
- ☁️ CloudFront (2 distribuciones)
- ⚙️ SSM Parameter Store (13+ parámetros)
- 🚀 Backend (4 pasos)
- 🌐 Custom Domain API (3 pasos)
- 🌍 DNS Frontends (2 dominios)
- 📄 runtime-config.json (3 pasos)
- 🔑 GitHub Secrets (15+ secrets)
- 📦 Deploy Frontends (3 workflows)
- ✅ Verificación y Testing (20+ tests)
- 📊 Monitoreo Post-Migración (4 configuraciones)
- 🧹 Cleanup (después de 2+ semanas)
- 🔐 Seguridad Post-Migración (10+ items)

### 3. **MIGRATION_CREDENTIALS.md** ⚠️ CONFIDENCIAL
Archivo de referencia con todas las credenciales:
- AWS Access Keys
- AWS Console credentials
- Google OAuth credentials
- Dominios y recursos actuales
- Notas de seguridad

**IMPORTANTE**: Este archivo está en `.gitignore` y NO debe commitearse.

### 4. **Scripts de Automatización**

Ubicación: `scripts/migration/`

#### `01-setup-aws-cli.sh`
Configura el perfil AWS "cefal" automáticamente con las credenciales proporcionadas.

```bash
./scripts/migration/01-setup-aws-cli.sh
```

#### `02-backup-current-infrastructure.sh`
Crea backup de toda la configuración actual:
- SSM Parameters (production y dev)
- Cognito User Pool y Client
- Usuarios de Cognito
- CloudFront distributions
- S3 bucket policies y CORS
- CloudFormation stacks

```bash
./scripts/migration/02-backup-current-infrastructure.sh
```

Genera directorio: `migration-backups/YYYYMMDD_HHMMSS/`

#### `03-create-ssm-parameters.sh`
Script interactivo para crear todos los parámetros SSM necesarios.

```bash
# Para production
./scripts/migration/03-create-ssm-parameters.sh production

# Para dev
./scripts/migration/03-create-ssm-parameters.sh dev
```

#### `04-create-s3-buckets.sh`
Crea y configura los 3 buckets S3 necesarios con políticas y CORS.

```bash
./scripts/migration/04-create-s3-buckets.sh
```

#### `scripts/migration/README.md`
Guía rápida de uso de los scripts.

## 🔒 Seguridad

### Archivos Protegidos en .gitignore
He actualizado `.gitignore` para proteger:
```
# Migration credentials (NEVER COMMIT)
cefal_*.csv
client_secret_*.json
MIGRATION_CREDENTIALS.md
migration-backups/
*.dump
*.pem
*.key
```

### Recomendaciones de Seguridad
1. ✅ Rotar Access Keys después de la migración
2. ✅ Habilitar MFA en cuenta AWS
3. ✅ Eliminar credenciales locales después de migración
4. ✅ Guardar credenciales en password manager
5. ✅ Configurar AWS CloudTrail, Config y GuardDuty

## 🚀 Pasos Siguientes

### Paso 1: Revisar Documentación (15-30 min)
```bash
# Leer plan completo
cat MIGRATION_PLAN.md

# Revisar checklist
cat MIGRATION_CHECKLIST.md

# Entender scripts disponibles
cat scripts/migration/README.md
```

### Paso 2: Preparación (1-2 horas)
```bash
# Configurar AWS CLI
./scripts/migration/01-setup-aws-cli.sh

# Hacer backup de infraestructura actual
./scripts/migration/02-backup-current-infrastructure.sh

# Backup manual de base de datos
pg_dump -h <db_host> -U <db_user> -d emotioxv3 -F c -f migration-backups/database_$(date +%Y%m%d).dump
```

### Paso 3: Ejecución de Migración (4-6 horas)
Seguir **MIGRATION_PLAN.md** fase por fase, usando **MIGRATION_CHECKLIST.md** para tracking.

Tareas principales:
1. Solicitar certificados SSL (30 min)
2. Crear Cognito User Pool (30 min)
3. Crear buckets S3 (15 min con script)
4. Crear CloudFront distributions (30 min)
5. Crear parámetros SSM (15 min con script)
6. Deploy backend (30 min)
7. Configurar DNS (30 min)
8. Deploy frontends (30 min)
9. Testing completo (1 hora)

### Paso 4: Verificación y Monitoreo (1 semana)
- Testing funcional completo
- Monitoreo de logs y métricas
- Verificación de usuarios
- Confirmación de costos

### Paso 5: Cleanup (Después de 2+ semanas)
- Deshabilitar recursos antiguos
- Esperar confirmación
- Eliminar recursos permanentemente

## 📊 Estimados

### Tiempo Total
- **Preparación**: 2-3 horas
- **Migración**: 4-6 horas
- **Verificación inicial**: 1-2 horas
- **Monitoreo**: 1 semana (chequeos diarios de 15 min)
- **Cleanup**: 1 hora (después de 2+ semanas)

**Total trabajo activo**: ~8-12 horas distribuidas en 2-3 semanas

### Downtime Esperado
- **Ideal**: 0 minutos (blue-green deployment)
- **Realista**: 5-15 minutos durante cambio de DNS
- **Peor caso**: 30-60 minutos si hay problemas

### Costos Aproximados
Durante periodo de transición (manteniendo ambas infraestructuras):
- **Duplicación de recursos**: ~$100-200/mes
- **CloudFront invalidations**: ~$2-5
- **Data transfer**: ~$5-10

Después del cleanup:
- **Costos normales**: Similar a cuenta actual

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| DNS propagation delay | Alta | Medio | Usar TTLs bajos antes de migración |
| Certificados SSL no validan | Media | Alto | Solicitar con 2-3 días de anticipación |
| Pérdida de datos | Baja | Crítico | Backups múltiples antes de migrar |
| Cognito usuarios no migran | Media | Medio | Plan de migración por lotes o reset password |
| Workflows CI/CD fallan | Media | Medio | Testing en branch antes de merge a main |
| Costos inesperados | Baja | Medio | Budget alerts configurados |

## 📞 Soporte y Recursos

### Documentación AWS
- [Serverless Framework](https://www.serverless.com/framework/docs)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon Cognito](https://docs.aws.amazon.com/cognito/)

### Scripts Disponibles
- `scripts/migration/01-setup-aws-cli.sh`
- `scripts/migration/02-backup-current-infrastructure.sh`
- `scripts/migration/03-create-ssm-parameters.sh`
- `scripts/migration/04-create-s3-buckets.sh`

### Archivos de Referencia
- `MIGRATION_PLAN.md` - Plan detallado
- `MIGRATION_CHECKLIST.md` - Checklist imprimible
- `MIGRATION_CREDENTIALS.md` - Credenciales (NO COMMITEAR)
- `scripts/migration/README.md` - Guía de scripts

## ✅ Checklist Rápido Pre-Inicio

Antes de comenzar la migración, asegúrate de:

- [ ] Has leído y entiendes el MIGRATION_PLAN.md completo
- [ ] Tienes acceso a AWS Console de ambas cuentas
- [ ] Tienes acceso a Google Cloud Console
- [ ] Tienes acceso a GitHub repository settings
- [ ] Tienes acceso a la base de datos actual
- [ ] Has notificado a stakeholders sobre ventana de mantenimiento
- [ ] Tienes backup reciente de base de datos
- [ ] Has exportado configuración actual (backup script)
- [ ] Tienes al menos 6-8 horas disponibles para dedicar a la migración
- [ ] Has configurado AWS CLI con perfil "cefal"
- [ ] Has imprimido o abierto MIGRATION_CHECKLIST.md para tracking

## 🎉 Próximos Pasos Inmediatos

1. **Revisar toda la documentación** (no saltar este paso)
2. **Ejecutar `01-setup-aws-cli.sh`** para configurar acceso
3. **Ejecutar `02-backup-current-infrastructure.sh`** para backups
4. **Hacer backup manual de base de datos**
5. **Decidir fecha/hora de ventana de mantenimiento**
6. **Comenzar con Fase 1 de MIGRATION_PLAN.md**

---

**Documentación creada por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 1.0

**¡Buena suerte con la migración! 🚀**
