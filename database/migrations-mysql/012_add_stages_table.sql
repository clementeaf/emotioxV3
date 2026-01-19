-- EmotioxV3 Database Migration - Add Stages Table (MySQL)
-- Version: 012
-- Description: Creates stages table and adds stage_id to modules

-- ==========================================
-- 1. CREATE STAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS stages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    stage_type VARCHAR(50) DEFAULT 'custom',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stages_research_id (research_id),
    INDEX idx_stages_order (research_id, order_index),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. ADD stage_id COLUMN TO MODULES
-- ==========================================
ALTER TABLE modules ADD COLUMN IF NOT EXISTS stage_id CHAR(36);

-- ==========================================
-- 3. CREATE DEFAULT STAGE FOR EXISTING MODULES
-- ==========================================
-- For each research that has modules without stage_id, create a default stage
INSERT INTO stages (id, research_id, name, description, order_index, stage_type)
SELECT UUID(), research_id, 'Default Stage', 'Auto-created stage for existing modules', 1, 'custom'
FROM modules 
WHERE stage_id IS NULL
GROUP BY research_id
ON DUPLICATE KEY UPDATE id=id;

-- Assign all modules to their research's default stage
UPDATE modules m
INNER JOIN stages s ON m.research_id = s.research_id AND s.name = 'Default Stage'
SET m.stage_id = s.id
WHERE m.stage_id IS NULL;

-- ==========================================
-- 4. ADD FOREIGN KEY CONSTRAINT
-- ==========================================
ALTER TABLE modules 
ADD CONSTRAINT IF NOT EXISTS modules_stage_id_fkey 
FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE;

-- ==========================================
-- 5. CREATE INDEX FOR stage_id
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_modules_stage_id ON modules(stage_id);
