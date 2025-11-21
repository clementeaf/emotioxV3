# ✅ Database Migrations Created

## 📊 Migraciones Creadas

### 1. Initial Schema (`001_initial_schema.sql`)
**8 Tablas creadas:**
- ✅ `users` - Usuarios autenticados (admin, researcher)
- ✅ `research_types` - Templates de investigación (creados por admin)
- ✅ `researches` - Investigaciones individuales
- ✅ `modules` - Módulos/secciones de investigaciones
- ✅ `questions` - Preguntas con configuración dinámica JSONB
- ✅ `media` - Referencias a archivos en S3
- ✅ `responses` - Respuestas de participantes
- ✅ `analysis_modules` - Módulos de análisis predefinidos

**Características:**
- Índices optimizados para queries frecuentes
- Triggers automáticos para `updated_at`
- Comentarios en tablas y columnas
- Soporte completo para JSON dinámico
- Sin restricciones rígidas en tipos de preguntas

### 2. Seed Data (`002_seed_data.sql`)
**Research Types predefinidos:**
1. **interest** - Estudios de intereses y preferencias
2. **biometric** - Estudios biométricos y de salud
3. **visual_preference** - Preferencias visuales y estéticas

**Analysis Modules:**
1. Distribución de Respuestas (bar charts)
2. Nube de Palabras (text analysis)
3. Mapa de Calor (heatmap para clicks)
4. Ranking de Preferencias (image ranking)
5. Estadísticas Básicas (mean, median, mode)

## 🛠️ Scripts Creados

### `scripts/db-setup.sh`
Script automatizado que:
- ✅ Verifica instalación de PostgreSQL
- ✅ Inicia PostgreSQL si no está corriendo
- ✅ Crea base de datos `emotioxv3`
- ✅ Ejecuta todas las migraciones en orden
- ✅ Muestra resumen de tablas creadas

## 📚 Documentación

### `database/README.md`
Guía completa con:
- Descripción de cada migración
- Instrucciones de ejecución (3 opciones)
- Comandos de verificación
- Troubleshooting común
- Ejemplos de conexión desde backend

## 🚀 Próximos Pasos

### Paso 1: Instalar PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

### Paso 2: Ejecutar Migraciones

```bash
# Desde la raíz del proyecto
./scripts/db-setup.sh
```

### Paso 3: Verificar

```bash
psql -d emotioxv3 -c "\dt"
psql -d emotioxv3 -c "SELECT name FROM research_types;"
```

## 📋 Checklist

- [x] Migración inicial creada (8 tablas)
- [x] Seed data creado (research types + analysis modules)
- [x] Script de setup automatizado
- [x] README con documentación completa
- [x] Commits y push al repositorio
- [ ] PostgreSQL instalado localmente
- [ ] Migraciones ejecutadas
- [ ] Tablas verificadas
- [ ] Backend implementado
- [ ] Conexión backend-DB probada

## 🔍 Estructura de Archivos

```
emotioxV3/
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    (8 tables + indexes + triggers)
│   │   └── 002_seed_data.sql         (research types + analysis modules)
│   └── README.md                     (Guía completa)
├── scripts/
│   ├── aws-setup.sh                  (Setup de AWS)
│   └── db-setup.sh                   (Setup de DB) ⭐ NUEVO
└── .env                              (Credenciales - no commiteado)
```

## 💡 Notas Importantes

1. **Dinamismo Total**: Las tablas `questions` y `responses` usan JSONB sin restricciones
2. **Templates Opcionales**: Research types son sugerencias, no obligatorios
3. **Idempotencia**: Seed data usa `ON CONFLICT DO NOTHING`
4. **Optimización**: Índices en columnas frecuentemente consultadas
5. **Auditoría**: Todas las tablas tienen `created_at` y `updated_at`

---

**Última actualización:** 2025-11-21 07:50 AM
