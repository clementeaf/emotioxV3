-- Agregar columna password_hash a users para autenticación local
-- Esta migración es idempotente (puede ejecutarse múltiples veces)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
        COMMENT ON COLUMN users.password_hash IS 'Hashed password for local authentication (bcrypt)';
    END IF;
END $$;
