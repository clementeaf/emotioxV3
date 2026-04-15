-- Migration 014: Create research_activity_logs table

CREATE TABLE IF NOT EXISTS research_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NULL,
    summary VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_research_activity_logs_research_id ON research_activity_logs(research_id);
CREATE INDEX IF NOT EXISTS idx_research_activity_logs_actor_user_id ON research_activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_research_activity_logs_created_at ON research_activity_logs(created_at DESC);
