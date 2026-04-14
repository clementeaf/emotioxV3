-- 021: Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id CHAR(36) NOT NULL,
    roleName VARCHAR(50) NOT NULL UNIQUE,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default roles
INSERT IGNORE INTO roles (id, roleName) VALUES
    (UUID(), 'admin'),
    (UUID(), 'researcher'),
    (UUID(), 'viewer');
