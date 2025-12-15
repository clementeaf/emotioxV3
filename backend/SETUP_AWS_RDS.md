# 🗄️ AWS RDS Setup Guide

## Estado Actual

El backend está desplegado en AWS Lambda pero **no tiene base de datos**. Está intentando conectarse a `localhost:5432` que no existe en Lambda.

## ✅ Lo que ya está funcionando

- ✅ Backend desplegado en Lambda
- ✅ API Gateway configurado
- ✅ CORS actualizado
- ✅ S3 para media
- ✅ Cognito configurado

## ❌ Lo que falta

- ❌ Base de datos PostgreSQL en AWS RDS
- ❌ Variables de entorno de producción configuradas

---

## 📋 Opciones para la Base de Datos

### Opción 1: AWS RDS PostgreSQL (RECOMENDADO)

**Ventajas:**
- Escalable y gestionado
- Backups automáticos
- Alta disponibilidad
- Monitoreo integrado

**Costo aproximado:** $15-30/mes (db.t3.micro)

**Pasos:**

```bash
# 1. Crear instancia RDS
aws rds create-db-instance \
  --db-instance-identifier emotioxv3-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_STRONG_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-XXXXX \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --publicly-accessible true

# 2. Esperar ~10 minutos hasta que esté available
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].DBInstanceStatus'

# 3. Obtener endpoint
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### Opción 2: Usar tu base de datos local con túnel

**Solo para testing, NO para producción**

```bash
# Exponer tu DB local a internet (usando ngrok o similar)
# ⚠️ NO RECOMENDADO - Solo para testing

# Opción: usar DB local y correr backend localmente
npm run dev  # Backend en localhost:3000
```

### Opción 3: PostgreSQL en EC2 (No recomendado)

Requiere más configuración manual y mantenimiento.

---

## 🔧 Configurar .env.production

Una vez que tengas RDS creado:

```bash
cd backend

# Editar .env.production
nano .env.production
```

Actualizar con tus valores reales:

```bash
# Database - AWS RDS
DB_HOST=emotioxv3-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=postgres
DB_PASSWORD=tu-password-seguro
DB_SSL=true

# El resto mantenerlo igual
```

---

## 🚀 Migrar la base de datos

```bash
# 1. Conectarse a RDS
psql -h emotioxv3-db.xxxxxxxxxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d postgres

# 2. Crear base de datos
CREATE DATABASE emotioxv3;
\c emotioxv3

# 3. Ejecutar migraciones
cd backend
npm run migrate  # O el comando que uses para migrations

# 4. Seed data (si aplica)
npm run seed
```

---

## 🔄 Re-desplegar con nueva configuración

```bash
cd backend

# Usar .env.production para deploy
cp .env.production .env.deploy
source .env.deploy

# Deploy
bash deploy-aws.sh
```

---

## ✅ Verificar conectividad

```bash
# Test desde Lambda logs
serverless logs -f api -t

# Deberías ver:
# ✓ Database connected
```

---

## 💡 Alternativa Rápida: Neon.tech (PostgreSQL Serverless)

Si no quieres configurar RDS:

1. Ir a [neon.tech](https://neon.tech)
2. Crear proyecto gratuito
3. Copiar connection string
4. Actualizar `.env.production`:

```bash
DB_HOST=ep-xxxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_SSL=true
```

**Ventaja:** Gratis hasta 10GB, setup en 2 minutos

---

## 🎯 Resumen

**Para tener el stack 100% funcional necesitas:**

1. ✅ Backend en Lambda (ya está)
2. ❌ **Base de datos PostgreSQL en la nube**
3. ✅ S3 para media (ya está)
4. ✅ Cognito para auth (ya está)

**Recomendación:** Usa Neon.tech para testing rápido, luego migra a RDS para producción.
