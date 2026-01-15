-- EmotioxV3 Database Migration - Add Stages Table
-- Version: 012
-- Description: Creates stages table and adds stage_id to modules

-- ==========================================
-- 1. CREATE STAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    stage_type VARCHAR(50) DEFAULT 'custom',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stages_research_id ON stages(research_id);
CREATE INDEX idx_stages_order ON stages(research_id, order_index);

COMMENT ON TABLE stages IS 'Stages/sections that group modules within a research study';
COMMENT ON COLUMN stages.stage_type IS 'Type of stage: smart_voc, cognitive_task, welcome, thank_you, custom';
COMMENT ON COLUMN stages.order_index IS 'Display order of the stage within the research';

-- ==========================================
-- 2. ADD stage_id COLUMN TO MODULES
-- ==========================================
ALTER TABLE modules ADD COLUMN IF NOT EXISTS stage_id UUID;

-- ==========================================
-- 3. CREATE DEFAULT STAGE FOR EXISTING MODULES
-- ==========================================
-- For each research that has modules without stage_id, create a default stage
DO $$
DECLARE
    r RECORD;
    new_stage_id UUID;
BEGIN
    FOR r IN 
        SELECT DISTINCT research_id 
        FROM modules 
        WHERE stage_id IS NULL
    LOOP
        -- Create a default stage for this research
        INSERT INTO stages (research_id, name, description, order_index, stage_type)
        VALUES (r.research_id, 'Default Stage', 'Auto-created stage for existing modules', 1, 'custom')
        RETURNING id INTO new_stage_id;
        
        -- Assign all modules of this research to the new stage
        UPDATE modules 
        SET stage_id = new_stage_id 
        WHERE research_id = r.research_id AND stage_id IS NULL;
        
        RAISE NOTICE 'Created default stage % for research %', new_stage_id, r.research_id;
    END LOOP;
END $$;

-- ==========================================
-- 4. ADD FOREIGN KEY CONSTRAINT
-- ==========================================
-- Now that all modules have a stage_id, we can add the foreign key constraint
ALTER TABLE modules 
ADD CONSTRAINT modules_stage_id_fkey 
FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE;

-- ==========================================
-- 5. CREATE INDEX FOR stage_id
-- ==========================================
CREATE INDEX idx_modules_stage_id ON modules(stage_id);

-- ==========================================
-- 6. ADD TRIGGER FOR updated_at
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stages_updated_at ON stages;
CREATE TRIGGER update_stages_updated_at
    BEFORE UPDATE ON stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN modules.stage_id IS 'Reference to the stage this module belongs to';
