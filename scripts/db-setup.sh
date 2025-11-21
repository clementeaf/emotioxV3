#!/bin/bash

# EmotioxV3 - Database Setup Script
# This script sets up PostgreSQL and runs migrations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    print_success "Variables de entorno cargadas desde .env"
else
    print_error "Archivo .env no encontrado"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL no está instalado"
    echo ""
    print_step "Instalando PostgreSQL..."
    echo "Ejecuta uno de los siguientes comandos:"
    echo ""
    echo "  macOS (Homebrew):"
    echo "    brew install postgresql@15"
    echo "    brew services start postgresql@15"
    echo ""
    echo "  Linux (Ubuntu/Debian):"
    echo "    sudo apt-get install postgresql-15"
    echo "    sudo systemctl start postgresql"
    echo ""
    exit 1
fi

print_success "PostgreSQL encontrado: $(psql --version)"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    print_warning "PostgreSQL no está corriendo"
    print_step "Iniciando PostgreSQL..."
    
    # Try to start with brew services (macOS)
    if command -v brew &> /dev/null; then
        brew services start postgresql@15 || brew services start postgresql
    else
        print_error "Por favor inicia PostgreSQL manualmente"
        exit 1
    fi
    
    # Wait for PostgreSQL to start
    sleep 2
    
    if ! pg_isready &> /dev/null; then
        print_error "No se pudo iniciar PostgreSQL"
        exit 1
    fi
fi

print_success "PostgreSQL está corriendo"

# Database configuration
DB_NAME="${DB_NAME:-emotioxv3}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_warning "Base de datos '$DB_NAME' ya existe"
    echo ""
    read -p "¿Deseas recrear la base de datos? Esto ELIMINARÁ todos los datos (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Eliminando base de datos existente..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
        print_success "Base de datos eliminada"
    else
        print_warning "Manteniendo base de datos existente"
        print_step "Saltando creación de base de datos"
    fi
fi

# Create database if it doesn't exist
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_step "Creando base de datos '$DB_NAME'..."
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    print_success "Base de datos creada"
fi

# Run migrations
print_step "Ejecutando migraciones..."

MIGRATION_DIR="database/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Directorio de migraciones no encontrado: $MIGRATION_DIR"
    exit 1
fi

# Get all migration files sorted
MIGRATIONS=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
    print_warning "No se encontraron archivos de migración"
    exit 0
fi

# Execute each migration
for migration in $MIGRATIONS; do
    filename=$(basename "$migration")
    print_step "Ejecutando migración: $filename"
    
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$migration" \
        -v ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        print_success "Migración completada: $filename"
    else
        print_error "Error en migración: $filename"
        exit 1
    fi
done

echo ""
print_success "Todas las migraciones completadas exitosamente!"
echo ""

# Show database info
print_step "Información de la base de datos:"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Show tables
print_step "Tablas creadas:"
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "\dt" \
    -q

echo ""
print_step "Próximos pasos:"
echo "  1. Verificar las tablas: psql -d $DB_NAME -c '\dt'"
echo "  2. Implementar el backend"
echo "  3. Probar conexión desde el backend"
echo ""
