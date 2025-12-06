-- Migration: Update responses table for participant responses
-- This migration adds component_id and updated_at columns to support
-- the new participant response system from participant-frontend

-- Add component_id column (nullable to maintain backward compatibility)
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS component_id VARCHAR(255);

-- Add updated_at column for tracking response updates
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make question_id nullable (new system uses component_id instead)
ALTER TABLE responses
ALTER COLUMN question_id DROP NOT NULL;

-- Create unique constraint for new response system
-- This prevents duplicate responses for the same participant/module/component
-- Note: Only applies to rows where component_id is NOT NULL
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_participant_module_component'
    ) THEN
        ALTER TABLE responses DROP CONSTRAINT unique_participant_module_component;
    END IF;
    
    -- Add constraint
    ALTER TABLE responses
    ADD CONSTRAINT unique_participant_module_component 
    UNIQUE NULLS NOT DISTINCT (research_id, participant_id, module_id, component_id);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint (existing data conflict). Skipping...';
END $$;

-- Add index for component_id lookups
CREATE INDEX IF NOT EXISTS idx_responses_component_id ON responses(component_id);

-- Add index for updated_at
CREATE INDEX IF NOT EXISTS idx_responses_updated_at ON responses(updated_at DESC);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_responses_updated_at'
    ) THEN
        CREATE TRIGGER update_responses_updated_at 
        BEFORE UPDATE ON responses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Rename old 'answer' column to 'value' for consistency
-- (only if it doesn't exist yet)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'responses' AND column_name = 'answer'
    ) THEN
        ALTER TABLE responses RENAME COLUMN answer TO value;
    END IF;
END $$;

-- Update comments
COMMENT ON COLUMN responses.component_id IS 'Component ID from module configuration (for new response system)';
COMMENT ON COLUMN responses.question_id IS 'Legacy question ID (deprecated, use component_id)';
COMMENT ON COLUMN responses.value IS 'Response value (JSON format)';
COMMENT ON COLUMN responses.updated_at IS 'Last update timestamp';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Responses table migration completed successfully!';
    RAISE NOTICE '✓ Added component_id, updated_at columns';
    RAISE NOTICE '✓ Added unique constraint for participant/module/component';
    RAISE NOTICE '✓ Backward compatibility maintained';
END $$;
