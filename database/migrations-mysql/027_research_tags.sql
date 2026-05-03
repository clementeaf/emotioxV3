-- Research tags for organization
CREATE TABLE IF NOT EXISTS research_tags (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    UNIQUE KEY idx_research_tag (research_id, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Archive support
ALTER TABLE researches ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_researches_archived ON researches(archived_at);
