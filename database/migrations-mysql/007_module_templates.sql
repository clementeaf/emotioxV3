-- EmotioxV3 Database Migration - Module Templates (MySQL)
-- Version: 1.0.5
-- Description: Creates module_templates table

CREATE TABLE IF NOT EXISTS module_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSON DEFAULT ('[]'),
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_module_templates_name (name),
    INDEX idx_module_templates_created_by (created_by),
    INDEX idx_module_templates_active (is_active),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
