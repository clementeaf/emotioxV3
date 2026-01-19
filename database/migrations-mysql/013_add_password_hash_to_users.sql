-- Agregar columna password_hash a users para autenticación local (MySQL)
-- Esta migración es idempotente (puede ejecutarse múltiples veces)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL;
