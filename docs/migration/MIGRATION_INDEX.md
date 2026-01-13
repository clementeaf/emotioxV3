# 📑 Índice de Documentación de Migración EmotioX V3

## 🎯 ¿Por dónde empezar?

### Si tienes 5 minutos
👉 Lee: **[MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)**

### Si tienes 15 minutos
👉 Lee: **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)**

### Si vas a ejecutar la migración
👉 Lee: **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** (completo)  
👉 Usa: **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** (para tracking)

---

## 📚 Documentación Disponible

### 🚀 Guías Principales

| Archivo | Descripción | Audiencia | Tiempo |
|---------|-------------|-----------|--------|
| **[MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md)** | Inicio rápido y comandos esenciales | Todos | 5 min |
| **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** | Resumen ejecutivo de la migración | PM, Tech Lead | 15 min |
| **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** | Plan detallado paso a paso (17 fases) | DevOps, Implementador | 30 min |
| **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** | Checklist imprimible para tracking | Implementador | N/A |
| **[MIGRATION_NAMING_STRATEGY.md](./MIGRATION_NAMING_STRATEGY.md)** | Estrategia de nombres y portabilidad | Arquitecto, DevOps | 10 min |
| **[SINGLE_BUCKET_ARCHITECTURE.md](./SINGLE_BUCKET_ARCHITECTURE.md)** | Arquitectura de bucket único S3 | DevOps, Arquitecto | 15 min |
| **[WORKFLOWS_UPDATE_SINGLE_BUCKET.md](./WORKFLOWS_UPDATE_SINGLE_BUCKET.md)** | Cambios en workflows para bucket único | DevOps | 10 min |

### 🔐 Información Confidencial

| Archivo | Descripción | ⚠️ Seguridad |
|---------|-------------|--------------|
| **[MIGRATION_CREDENTIALS.md](./MIGRATION_CREDENTIALS.md)** | Credenciales y accesos | **NO COMMITEAR** |
| `cefal_accessKeys.csv` | AWS Access Keys | **NO COMMITEAR** |
| `cefal_credentials.csv` | AWS Console credentials | **NO COMMITEAR** |
| `client_secret_2_4*.json` | Google OAuth credentials | **NO COMMITEAR** |

### 🛠️ Scripts de Automatización

Ubicación: `scripts/migration/`

| Script | Descripción | Uso |
|--------|-------------|-----|
| **[README.md](./scripts/migration/README.md)** | Guía de scripts | Leer primero |
| `01-setup-aws-cli.sh` | Configurar AWS CLI con cuenta nueva | `./01-setup-aws-cli.sh` |
| `02-backup-current-infrastructure.sh` | Backup de infraestructura AWS | `./02-backup-current-infrastructure.sh` |
| `03-create-ssm-parameters.sh` | Crear parámetros SSM (interactivo) | `./03-create-ssm-parameters.sh production` |
| `04-create-s3-buckets.sh` | Crear y configurar buckets S3 | `./04-create-s3-buckets.sh` |

---

## 🗺️ Flujo de Lectura Recomendado

```
┌────────────────────────────────┐
│  MIGRATION_QUICKSTART.md       │  ← Empieza aquí (5 min)
│  Quick overview y comandos     │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│  MIGRATION_SUMMARY.md          │  ← Contexto completo (15 min)
│  Resumen ejecutivo             │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│  scripts/migration/README.md   │  ← Scripts disponibles (3 min)
│  Guía de automatización        │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│  MIGRATION_CREDENTIALS.md      │  ← Credenciales (2 min)
│  Accesos necesarios            │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│  MIGRATION_PLAN.md             │  ← Plan detallado (30 min)
│  17 fases paso a paso          │
└────────────────────────────────┘
              ↓
┌────────────────────────────────┐
│  MIGRATION_CHECKLIST.md        │  ← Durante ejecución
│  Tracking de progreso          │
└────────────────────────────────┘
```

---

## ⚡ Comandos Rápidos

### Comenzar Migración
```bash
# 1. Configurar AWS CLI
./scripts/migration/01-setup-aws-cli.sh

# 2. Hacer backups
./scripts/migration/02-backup-current-infrastructure.sh

# 3. Seguir MIGRATION_PLAN.md desde Fase 1
```

### Durante Migración
```bash
# Crear parámetros SSM
./scripts/migration/03-create-ssm-parameters.sh production

# Crear buckets S3
./scripts/migration/04-create-s3-buckets.sh

# Verificar configuración
aws sts get-caller-identity --profile cefal
```

### Verificación Post-Migración
```bash
# Backend
curl https://api.emotiox.org/health

# Frontends
curl -I https://research.emotiox.org
curl -I https://participant.emotiox.org

# Runtime config
curl https://research.emotiox.org/runtime-config.json
```

---

## 📊 Estructura de Archivos

```
emotioxV3/
│
├── MIGRATION_INDEX.md              ← Estás aquí
├── MIGRATION_QUICKSTART.md         ← Inicio rápido
├── MIGRATION_SUMMARY.md            ← Resumen ejecutivo
├── MIGRATION_PLAN.md               ← Plan detallado
├── MIGRATION_CHECKLIST.md          ← Checklist de tracking
├── MIGRATION_CREDENTIALS.md        ← Credenciales (⚠️)
│
├── cefal_accessKeys.csv            ← AWS keys (⚠️)
├── cefal_credentials.csv           ← AWS console (⚠️)
├── client_secret_2_4*.json         ← Google OAuth (⚠️)
│
└── scripts/
    └── migration/
        ├── README.md               ← Guía de scripts
        ├── 01-setup-aws-cli.sh
        ├── 02-backup-current-infrastructure.sh
        ├── 03-create-ssm-parameters.sh
        └── 04-create-s3-buckets.sh
```

---

## 🔍 Búsqueda Rápida

### ¿Cómo hacer X?

| Tarea | Dónde Encontrar |
|-------|-----------------|
| Configurar AWS CLI | MIGRATION_QUICKSTART.md + script 01 |
| Hacer backups | MIGRATION_QUICKSTART.md + script 02 |
| Crear Cognito | MIGRATION_PLAN.md Fase 4 |
| Crear Certificados SSL | MIGRATION_PLAN.md Fase 3 |
| Deploy Backend | MIGRATION_PLAN.md Fase 10 |
| Configurar DNS | MIGRATION_PLAN.md Fases 11-12 |
| Testing completo | MIGRATION_PLAN.md Fase 15 |
| Troubleshooting | MIGRATION_PLAN.md sección final |

### ¿Dónde está X?

| Información | Archivo |
|-------------|---------|
| AWS Access Keys | MIGRATION_CREDENTIALS.md + cefal_accessKeys.csv |
| Google OAuth Client | MIGRATION_CREDENTIALS.md + client_secret_*.json |
| Dominios actuales | MIGRATION_CREDENTIALS.md |
| Comandos de emergencia | MIGRATION_QUICKSTART.md |
| Estimados de tiempo | MIGRATION_SUMMARY.md |
| Riesgos y mitigaciones | MIGRATION_SUMMARY.md |

---

## ⚠️ Avisos Importantes

### 🔒 Seguridad
Los siguientes archivos contienen credenciales y **NUNCA** deben ser commiteados:
- `MIGRATION_CREDENTIALS.md`
- `cefal_*.csv`
- `client_secret_*.json`
- `migration-backups/` (directorio)

Estos archivos están protegidos en `.gitignore`.

### 📋 Antes de Comenzar
- [ ] He leído MIGRATION_QUICKSTART.md
- [ ] He leído MIGRATION_SUMMARY.md
- [ ] Tengo acceso a todas las cuentas necesarias
- [ ] He notificado a stakeholders
- [ ] Tengo 6-8 horas disponibles

### ⏰ Estimados
- **Preparación**: 2-3 horas
- **Migración**: 4-6 horas
- **Verificación**: 1-2 horas
- **Monitoreo**: 1 semana
- **Total**: 8-12 horas activas

---

## 🆘 Ayuda

### Si tienes problemas
1. Revisa sección "Troubleshooting" en MIGRATION_PLAN.md
2. Verifica comandos en MIGRATION_QUICKSTART.md
3. Consulta logs de CloudFormation/Lambda

### Si encuentras un error
1. Documenta el error completo
2. Verifica configuración actual
3. Revisa backups disponibles
4. Consulta "Comandos de Emergencia" en MIGRATION_QUICKSTART.md

### Si necesitas rollback
1. Revertir cambios de DNS (comandos en MIGRATION_QUICKSTART.md)
2. Verificar que infraestructura antigua sigue funcionando
3. Documentar qué salió mal

---

## 📞 Recursos Externos

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Serverless Framework**: https://www.serverless.com/framework/docs
- **Google Cloud Console**: https://console.cloud.google.com/
- **GitHub Actions**: https://docs.github.com/en/actions

---

## ✅ Primer Paso

```bash
# Ejecutar esto para comenzar:
./scripts/migration/01-setup-aws-cli.sh
```

**Después continuar con MIGRATION_PLAN.md Fase 1.**

---

**Índice creado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 1.0

**¡Todo listo para comenzar! 🚀**
