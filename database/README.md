# Database Migrations

Este directorio contiene las migraciones de base de datos para EmotioxV3.

## Estructura

```
database/
├── migrations/
│   ├── 001_initial_schema.sql    # Schema inicial con todas las tablas
│   └── 002_seed_data.sql         # Datos iniciales (research types, analysis modules)
└── README.md                     # Este archivo
```

## Migraciones Disponibles

### 001_initial_schema.sql
Crea el schema completo de la base de datos:
- **users** - Usuarios autenticados (admin, researcher)
- **research_types** - Templates de tipos de investigación
- **researches** - Investigaciones individuales
- **modules** - Módulos/secciones de investigaciones
- **questions** - Preguntas dentro de módulos
- **media** - Archivos multimedia en S3
- **responses** - Respuestas de participantes
- **analysis_modules** - Módulos de análisis predefinidos

Incluye:
- Índices para optimización
- Triggers para `updated_at`
- Comentarios en tablas y columnas
- Extensión UUID

### 002_seed_data.sql
Inserta datos iniciales:
- 3 tipos de investigación predefinidos:
  - `interest` - Estudios de intereses
  - `biometric` - Estudios biométricos
  - `visual_preference` - Preferencias visuales
- 5 módulos de análisis:
  - Distribución de respuestas
  - Nube de palabras
  - Mapa de calor
  - Ranking de preferencias
  - Estadísticas básicas

## Ejecutar Migraciones

### Opción 1: Script Automático (Recomendado)

```bash
# Desde la raíz del proyecto
./scripts/db-setup.sh
```

Este script:
1. Verifica que PostgreSQL esté instalado
2. Inicia PostgreSQL si no está corriendo
3. Crea la base de datos si no existe
4. Ejecuta todas las migraciones en orden

### Opción 2: Manual

```bash
# 1. Crear base de datos
createdb emotioxv3

# 2. Ejecutar migraciones en orden
psql -d emotioxv3 -f database/migrations/001_initial_schema.sql
psql -d emotioxv3 -f database/migrations/002_seed_data.sql
```

### Opción 3: Con variables de entorno

```bash
# Cargar .env
export $(cat .env | xargs)

# Ejecutar migraciones
PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  -f database/migrations/001_initial_schema.sql
```

## Verificar Instalación

```bash
# Ver todas las tablas
psql -d emotioxv3 -c "\dt"

# Ver schema de una tabla
psql -d emotioxv3 -c "\d users"

# Contar registros en research_types
psql -d emotioxv3 -c "SELECT COUNT(*) FROM research_types;"

# Ver todos los research types
psql -d emotioxv3 -c "SELECT name, description FROM research_types;"
```

## Rollback

Para revertir todas las migraciones:

```bash
# Eliminar base de datos
dropdb emotioxv3

# Recrear desde cero
./scripts/db-setup.sh
```

## Crear Nueva Migración

1. Crear archivo con número secuencial:
```bash
touch database/migrations/003_add_new_feature.sql
```

2. Agregar SQL:
```sql
-- Description of migration

ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

DO $$
BEGIN
    RAISE NOTICE '✓ Migration 003 completed';
END $$;
```

3. Ejecutar:
```bash
psql -d emotioxv3 -f database/migrations/003_add_new_feature.sql
```

## Troubleshooting

### PostgreSQL no está instalado

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

### No se puede conectar a PostgreSQL

```bash
# Verificar que está corriendo
pg_isready

# Ver procesos
ps aux | grep postgres

# Iniciar manualmente
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux
```

### Error de permisos

```bash
# Crear usuario postgres si no existe
createuser -s postgres

# O usar tu usuario del sistema
psql -d emotioxv3 -U $(whoami)
```

### Base de datos ya existe

```bash
# Eliminar y recrear
dropdb emotioxv3
createdb emotioxv3
./scripts/db-setup.sh
```

## Notas Importantes

- Las migraciones se ejecutan en orden alfabético
- Usar números secuenciales (001, 002, 003...)
- Incluir `ON CONFLICT DO NOTHING` en INSERTs para idempotencia
- Siempre probar migraciones en desarrollo antes de producción
- Hacer backup antes de ejecutar migraciones en producción

## Conexión desde Backend

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```
