# 🚀 Quick Start - EmotioxV3

## ✅ Estado Actual

- ✅ Backend desplegado en AWS Lambda
- ✅ CORS configurado correctamente
- ✅ Frontends configurados para AWS
- ❌ **Falta base de datos de producción**

---

## 🎯 Siguiente Paso: Configurar Base de Datos

### Opción Recomendada: Neon.tech (5 minutos, GRATIS)

```bash
cd backend
bash setup-neon-db.sh
```

El script te guiará para:
1. Crear cuenta en Neon.tech (gratis)
2. Crear proyecto PostgreSQL
3. Configurar `.env.production`
4. Ejecutar migraciones
5. Re-desplegar backend

**Después:**
```bash
bash deploy-aws.sh  # Re-deploy con DB configurada
```

---

## 🧪 Probar el Sistema

### Backend (una vez desplegado con DB):

```bash
# Health check
curl https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev/health

# Registrar usuario
curl -X POST https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@useremotion.com","password":"Test123!","first_name":"Test","last_name":"User"}'
```

### Frontends:

```bash
# research-frontend
cd research-frontend
npm run dev  # http://localhost:12500

# participant-frontend  
cd participant-frontend
npm run dev  # http://localhost:12600
```

Ambos conectarán al backend AWS automáticamente.

---

## 📝 Desarrollo Local (Alternativa)

Si prefieres trabajar completamente local:

```bash
# Terminal 1: Backend local
cd backend
npm run dev  # http://localhost:3000

# Terminal 2: research-frontend con backend local
cd research-frontend
npm run dev:local

# Terminal 3: participant-frontend con backend local
cd participant-frontend
npm run dev:local
```

---

## 📚 Más Información

- [`backend/README.md`](./backend/README.md) - Documentación del backend
- [`backend/SETUP_AWS_RDS.md`](./backend/SETUP_AWS_RDS.md) - Setup de AWS RDS
- [`IMPLEMENTATION_COMPLETE.md`](./IMPLEMENTATION_COMPLETE.md) - Resumen de cambios
