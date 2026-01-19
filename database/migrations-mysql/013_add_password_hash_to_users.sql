-- Agregar columna password_hash a users para autenticación local (MySQL)
-- Esta migración es idempotente (puede ejecutarse múltiples veces)

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
