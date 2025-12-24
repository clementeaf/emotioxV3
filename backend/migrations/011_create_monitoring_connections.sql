CREATE TABLE IF NOT EXISTS monitoring_connections (
  connection_id VARCHAR(255) PRIMARY KEY,
  research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
  user_id UUID, -- Optional, for authenticated users monitoring
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitoring_connections_research_id ON monitoring_connections(research_id);
