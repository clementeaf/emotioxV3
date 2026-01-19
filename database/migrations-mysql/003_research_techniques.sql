-- EmotioxV3 Database Migration - Research Techniques (MySQL)
-- Version: 1.0.1
-- Description: Adds research_techniques table and updates research_types to reference it

-- ==========================================
-- RESEARCH TECHNIQUES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_techniques (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_research_techniques_name (name),
    INDEX idx_research_techniques_active (is_active),
    INDEX idx_research_techniques_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- UPDATE RESEARCH TYPES TABLE
-- ==========================================
ALTER TABLE research_types
ADD COLUMN IF NOT EXISTS research_technique_id CHAR(36),
ADD INDEX IF NOT EXISTS idx_research_types_technique_id (research_technique_id),
ADD FOREIGN KEY IF NOT EXISTS (research_technique_id) REFERENCES research_techniques(id) ON DELETE SET NULL;
