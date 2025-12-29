-- Migration: Create demographic quota tracking tables
-- Description: Adds tables for tracking demographic quotas and participant demographics

-- Table to track quota configurations and current counts
CREATE TABLE IF NOT EXISTS demographic_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    demographic_type VARCHAR(50) NOT NULL, -- 'age', 'gender', 'country', 'educationLevel', etc.
    quota_value TEXT NOT NULL, -- '18-25', 'Male', 'Chile', etc.
    quota_limit INTEGER NOT NULL,
    current_count INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_research_demographic_quota 
        UNIQUE(research_id, demographic_type, quota_value),
    CONSTRAINT positive_quota_limit CHECK (quota_limit > 0),
    CONSTRAINT non_negative_count CHECK (current_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_demographic_quotas_research 
    ON demographic_quotas(research_id);

CREATE INDEX idx_demographic_quotas_enabled 
    ON demographic_quotas(research_id, enabled) 
    WHERE enabled = true;

-- Table to store participant demographic responses
CREATE TABLE IF NOT EXISTS participant_demographics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL,
    demographic_type VARCHAR(50) NOT NULL,
    demographic_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_participant_demographic 
        UNIQUE(research_id, participant_id, demographic_type)
);

-- Indexes for performance
CREATE INDEX idx_participant_demographics_research 
    ON participant_demographics(research_id, participant_id);

CREATE INDEX idx_participant_demographics_type 
    ON participant_demographics(research_id, demographic_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_demographic_quotas_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER trigger_update_demographic_quotas_timestamp
    BEFORE UPDATE ON demographic_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_demographic_quotas_timestamp();

-- Comments for documentation
COMMENT ON TABLE demographic_quotas IS 'Tracks quota limits and current counts for demographic screening';
COMMENT ON TABLE participant_demographics IS 'Stores participant demographic responses for quota tracking';
COMMENT ON COLUMN demographic_quotas.demographic_type IS 'Type of demographic (age, gender, country, etc.)';
COMMENT ON COLUMN demographic_quotas.quota_value IS 'Value or range for the quota (e.g., 18-25, Male, Chile)';
COMMENT ON COLUMN demographic_quotas.current_count IS 'Current number of participants matching this quota';
