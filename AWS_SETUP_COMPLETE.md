# ✅ AWS Setup Completado - EmotioxV3

**Fecha:** 2025-11-21  
**Estado:** Completado exitosamente

---

## 🎯 Recursos Creados en AWS

### 1. S3 Bucket (Storage de Imágenes)
- **Nombre:** `emotioxv3-media-041238861016`
- **Región:** us-east-1
- **CORS:** ✅ Configurado
- **Uso:** Almacenamiento de imágenes para preguntas tipo `image_hitzone` e `image_preference`

### 2. Cognito User Pool (Autenticación)
- **User Pool ID:** `us-east-1_uXxXuDvdX`
- **App Client ID:** `6keflktk34h211ndu40ume4ad4`
- **Dominio:** `https://emotioxv3-auth-04123886.auth.us-east-1.amazoncognito.com`
- **Uso:** Autenticación de investigadores y admins en research-frontend

### 3. Usuario Admin Inicial
- **Email:** `admin@emotioxv3.com`
- **Password:** `Admin123!`
- **Cognito Sub:** `44485408-5001-70e9-88df-1eb0617b7073`
- **Estado:** Activo

### 4. Base de Datos
- **Tipo:** PostgreSQL Local (desarrollo)
- **Host:** localhost
- **Puerto:** 5432
- **Database:** emotioxv3
- **Usuario:** postgres
- **Password:** postgres

---

## 📁 Archivos Creados

### `.env` (Credenciales - NO commitear)
Contiene todas las variables de entorno necesarias:
- Credenciales de base de datos
- IDs de recursos AWS
- Configuración de CORS

### `.env.example` (Template - SÍ commitear)
Template sin credenciales reales para el repositorio.

### `scripts/aws-setup.sh`
Script interactivo de setup reutilizable.

---

## 🔐 Credenciales Importantes

> ⚠️ **IMPORTANTE**: Estas credenciales están en el archivo `.env` local. NO las subas al repositorio.

```bash
# Cognito
User Pool ID: us-east-1_uXxXuDvdX
App Client ID: 6keflktk34h211ndu40ume4ad4

# S3
Bucket: emotioxv3-media-041238861016

# Admin User
Email: admin@emotioxv3.com
Password: Admin123!
```

---

## 🚀 Próximos Pasos

### 1. Configurar PostgreSQL Local
```bash
# Instalar PostgreSQL (si no está instalado)
brew install postgresql@15

# Iniciar servicio
brew services start postgresql@15

# Crear base de datos
createdb emotioxv3

# Verificar conexión
psql -d emotioxv3 -c "SELECT version();"
```

### 2. Crear Migraciones de Base de Datos
- [ ] Crear script de migración inicial
- [ ] Crear todas las tablas (users, research_types, researches, modules, questions, media, responses, analysis_modules)
- [ ] Insertar datos de prueba (opcional)

### 3. Implementar Backend
- [ ] Setup de handler principal con routing
- [ ] Implementar módulos (auth, research-types, research, modules, questions, media, responses, public, analysis)
- [ ] Configurar conexión a PostgreSQL
- [ ] Configurar integración con Cognito
- [ ] Configurar integración con S3

### 4. Testing Local
- [ ] Probar endpoints con Postman/Thunder Client
- [ ] Verificar autenticación con Cognito
- [ ] Probar upload de imágenes a S3
- [ ] Verificar CORS

### 5. Deploy a AWS
- [ ] Configurar VPC para Lambda (si se usa RDS en producción)
- [ ] Deploy con Serverless Framework
- [ ] Verificar logs en CloudWatch
- [ ] Probar endpoints en producción

---

## 📊 Costos Estimados

| Servicio | Configuración | Costo Mensual |
|----------|--------------|---------------|
| S3 | 50GB, 10k requests | ~$5 |
| Cognito | <50k MAU | Gratis |
| Lambda | 1M requests, 512MB | ~$5 |
| API Gateway | 1M requests | ~$3.50 |
| PostgreSQL Local | - | Gratis |
| **Total (Dev)** | | **~$13.50/mes** |

> Para producción con RDS: agregar ~$15/mes

---

## 🔧 Comandos Útiles

### Ver recursos en AWS
```bash
# Listar buckets S3
aws s3 ls

# Ver User Pools de Cognito
aws cognito-idp list-user-pools --max-results 10

# Ver usuarios en Cognito
aws cognito-idp list-users --user-pool-id us-east-1_uXxXuDvdX
```

### Gestión de variables de entorno
```bash
# Cargar .env en terminal actual
export $(cat .env | xargs)

# Verificar variables
echo $COGNITO_USER_POOL_ID
```

### Testing local del backend
```bash
cd backend
npm install
npm run dev  # Inicia serverless-offline en puerto 3000
```

---

## 🐛 Troubleshooting

### Problema: No puedo conectarme a PostgreSQL local
```bash
# Verificar que PostgreSQL está corriendo
brew services list | grep postgresql

# Iniciar si no está corriendo
brew services start postgresql@15

# Verificar puerto
lsof -i :5432
```

### Problema: CORS errors en desarrollo
- Verificar que los orígenes en `.env` incluyen `http://localhost:5173` y `http://localhost:5174`
- Verificar configuración CORS en S3 bucket
- Verificar headers CORS en responses del backend

### Problema: Cognito authentication fails
- Verificar que User Pool ID y Client ID son correctos
- Verificar que el usuario existe y está confirmado
- Verificar que la password cumple los requisitos

---

## 📚 Documentación de Referencia

- [AWS Setup Guide](./AWS_SETUP_GUIDE.md) - Guía completa de configuración
- [Architecture](./ARCHITECTURE.md) - Arquitectura del sistema
- [Dynamic Flow Examples](./DYNAMIC_FLOW_EXAMPLES.md) - Ejemplos de flujos

---

## ✅ Checklist de Verificación

- [x] S3 Bucket creado
- [x] CORS configurado en S3
- [x] Cognito User Pool creado
- [x] Cognito App Client creado
- [x] Cognito Domain configurado
- [x] Usuario admin creado
- [x] Archivo .env creado
- [x] Archivo .env.example creado
- [ ] PostgreSQL local instalado y corriendo
- [ ] Base de datos emotioxv3 creada
- [ ] Migraciones ejecutadas
- [ ] Backend implementado
- [ ] Deploy a AWS realizado

---

**Última actualización:** 2025-11-21 07:45 AM
