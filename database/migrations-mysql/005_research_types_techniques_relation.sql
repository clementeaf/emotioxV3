-- EmotioxV3 Database Migration - Research Types and Techniques Many-to-Many Relation (MySQL)
-- Version: 1.0.3
-- Description: Creates junction table for many-to-many relationship between research_types and research_techniques

-- ==========================================
-- RESEARCH TYPES TECHNIQUES JUNCTION TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_types_techniques (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_type_id CHAR(36) NOT NULL,
    research_technique_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_type_technique (research_type_id, research_technique_id),
    INDEX idx_research_types_techniques_type_id (research_type_id),
    INDEX idx_research_types_techniques_technique_id (research_technique_id),
    FOREIGN KEY (research_type_id) REFERENCES research_types(id) ON DELETE CASCADE,
    FOREIGN KEY (research_technique_id) REFERENCES research_techniques(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data from research_technique_id to junction table
INSERT IGNORE INTO research_types_techniques (research_type_id, research_technique_id)
SELECT id, research_technique_id
FROM research_types
WHERE research_technique_id IS NOT NULL;
