-- EmotioxV3 Database Migration - Enterprises (MySQL)
-- Version: 1.0.2
-- Description: Adds enterprises table and updates researches to reference it

-- ==========================================
-- ENTERPRISES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enterprises (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enterprises_name (name),
    INDEX idx_enterprises_active (is_active),
    INDEX idx_enterprises_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================
ALTER TABLE researches
ADD COLUMN IF NOT EXISTS enterprise_id CHAR(36),
ADD INDEX IF NOT EXISTS idx_researches_enterprise_id (enterprise_id),
ADD FOREIGN KEY IF NOT EXISTS (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL;
