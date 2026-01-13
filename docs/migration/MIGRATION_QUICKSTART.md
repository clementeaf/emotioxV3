# 🚀 EmotioX V3 - Guía de Inicio Rápido de Migración

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Configurar AWS CLI
```bash
cd /Users/clementefalcone/Desktop/personal/emotioxV3
./scripts/migration/01-setup-aws-cli.sh
```

### 2️⃣ Hacer Backups
```bash
# Backup de infraestructura AWS
./scripts/migration/02-backup-current-infrastructure.sh

# Backup de base de datos (reemplaza con tus credenciales)
pg_dump -h <tu_db_host> -U <tu_db_user> -d emotioxv3 -F c -f migration-backups/database_$(date +%Y%m%d).dump
```

### 3️⃣ Leer Documentación
```bash
# Plan completo (15-20 min)
cat MIGRATION_PLAN.md

# O el resumen ejecutivo (5 min)
cat MIGRATION_SUMMARY.md
```

### 4️⃣ Seguir el Plan
Abre `MIGRATION_CHECKLIST.md` e imprime o marca cada paso mientras avanzas.

---

## 📁 Archivos Clave

| Archivo | Descripción | Tiempo de Lectura |
|---------|-------------|-------------------|
| **MIGRATION_SUMMARY.md** | Resumen ejecutivo | 5 min |
| **MIGRATION_PLAN.md** | Plan detallado paso a paso | 20 min |
| **MIGRATION_CHECKLIST.md** | Checklist imprimible | - |
| **MIGRATION_CREDENTIALS.md** | Credenciales (⚠️ confidencial) | 2 min |
| **scripts/migration/README.md** | Guía de scripts | 3 min |

---

## 🎯 Fases de Migración

```
┌─────────────────────────────────────────────────────────┐
│ FASE 0: Preparación y Backup                     [2h]  │
├─────────────────────────────────────────────────────────┤
│ - Backup de base de datos                               │
│ - Exportar configuración actual                         │
│ - Notificar stakeholders                                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 1-3: Infraestructura Base               [1.5-2h]  │
├─────────────────────────────────────────────────────────┤
│ - Configurar cuenta AWS                                 │
│ - Migrar/configurar base de datos                       │
│ - Solicitar certificados SSL                            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 4-7: Servicios AWS                      [1.5-2h]  │
├─────────────────────────────────────────────────────────┤
│ - Cognito User Pool + Google OAuth                      │
│ - Buckets S3                                            │
│ - CloudFront distributions                              │
│ - SSM Parameter Store                                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 8-10: Deploy Backend                      [1-2h]  │
├─────────────────────────────────────────────────────────┤
│ - Actualizar serverless.yml                             │
│ - Actualizar GitHub Secrets                             │
│ - Deploy a Lambda                                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 11-14: DNS y Frontends                    [1-2h]  │
├─────────────────────────────────────────────────────────┤
│ - Custom domain para API                                │
│ - DNS para frontends                                    │
│ - runtime-config.json                                   │
│ - Deploy frontends                                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 15-16: Testing y Monitoreo              [1-2h]   │
├─────────────────────────────────────────────────────────┤
│ - Testing completo                                      │
│ - Verificación de funcionalidad                         │
│ - Configurar monitoreo                                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ FASE 17: Cleanup                            [Después]  │
├─────────────────────────────────────────────────────────┤
│ - Esperar 2+ semanas                                    │
│ - Eliminar recursos antiguos                            │
└─────────────────────────────────────────────────────────┘
```

**Total**: 8-12 horas de trabajo activo

---

## 🔧 Scripts Disponibles

### Setup
```bash
# Configurar AWS CLI con cuenta nueva
./scripts/migration/01-setup-aws-cli.sh
```

### Backup
```bash
# Backup completo de infraestructura AWS
./scripts/migration/02-backup-current-infrastructure.sh
```

### Configuración
```bash
# Crear parámetros SSM (interactivo)
./scripts/migration/03-create-ssm-parameters.sh production
./scripts/migration/03-create-ssm-parameters.sh dev
```

### Recursos
```bash
# Crear y configurar buckets S3
./scripts/migration/04-create-s3-buckets.sh
```

---

## ⚠️ Antes de Empezar

### ✅ Checklist Pre-Migración
- [ ] He leído MIGRATION_SUMMARY.md
- [ ] Tengo acceso a AWS Console (ambas cuentas)
- [ ] Tengo acceso a Google Cloud Console
- [ ] Tengo acceso a GitHub repository settings
- [ ] Tengo acceso a la base de datos
- [ ] He notificado a stakeholders
- [ ] Tengo 6-8 horas disponibles
- [ ] He hecho backup de base de datos
- [ ] He ejecutado script de backup

### 📋 Información Necesaria

Tendrás que proporcionar durante la migración:

**Base de Datos**:
- Host (actual o nuevo)
- Puerto (default: 5432)
- Nombre de DB (default: emotioxv3)
- Usuario
- Contraseña

**AWS**:
- Region (default: us-east-1)
- S3 bucket name para media

**Cognito** (después de crear):
- User Pool ID
- Client ID
- Client Secret
- Domain

---

## 🆘 Ayuda Rápida

### Verificar Configuración AWS
```bash
aws sts get-caller-identity --profile cefal
# Debe mostrar Account: 058310292956
```

### Verificar Backups
```bash
ls -lh migration-backups/
```

### Ver Recursos Actuales
```bash
# Stacks CloudFormation
aws cloudformation list-stacks --profile cefal

# Buckets S3
aws s3 ls --profile cefal

# Distribuciones CloudFront
aws cloudfront list-distributions --profile cefal
```

### Testing Rápido Post-Deploy
```bash
# Backend
curl https://api.emotiox.org/health

# Research Frontend
curl -I https://research.emotiox.org

# Participant Frontend
curl -I https://participant.emotiox.org

# Runtime config
curl https://research.emotiox.org/runtime-config.json
```

---

## 🔥 Comandos de Emergencia

### Rollback DNS
Si algo sale mal con DNS:
```bash
# Revertir a CloudFront antiguo
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone_id> \
  --change-batch file://old_dns_config.json \
  --profile cefal
```

### Verificar Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/emotioxv3-backend-production-api --follow --profile cefal

# CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name emotioxv3-backend-production \
  --profile cefal | head -50
```

### Invalidar CloudFront (forzar)
```bash
# Research
aws cloudfront create-invalidation \
  --distribution-id <new_cf_id> \
  --paths "/*" \
  --profile cefal

# Participant
aws cloudfront create-invalidation \
  --distribution-id <new_cf_id> \
  --paths "/*" \
  --profile cefal
```

---

## 📞 Recursos

- **Plan Detallado**: `MIGRATION_PLAN.md`
- **Checklist**: `MIGRATION_CHECKLIST.md`
- **Credenciales**: `MIGRATION_CREDENTIALS.md` (⚠️ no commitear)
- **Scripts**: `scripts/migration/`

---

## 🎯 Primer Comando a Ejecutar

```bash
# Comenzar aquí:
./scripts/migration/01-setup-aws-cli.sh
```

**¡Después de ejecutar esto, sigue con MIGRATION_PLAN.md Fase 1!**

---

## 💡 Tips

1. **Usa tmux o screen** para sesiones largas
2. **Documenta todo** lo que hagas diferente al plan
3. **Toma screenshots** de configuraciones importantes
4. **Guarda outputs** de comandos importantes
5. **No te apresures** - mejor lento y seguro
6. **Pide ayuda** si algo no está claro

---

**Preparado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12

**¡Éxito con la migración! 🚀**
