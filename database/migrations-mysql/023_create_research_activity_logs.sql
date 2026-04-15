-- Migration 023: Create research_activity_logs table

CREATE TABLE IF NOT EXISTS research_activity_logs (
    id CHAR(36) PRIMARY KEY,
    research_id CHAR(36) NOT NULL,
    actor_user_id CHAR(36) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id CHAR(36) NULL,
    summary VARCHAR(500) NOT NULL,
    metadata JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_research_activity_logs_research_id (research_id),
    INDEX idx_research_activity_logs_actor_user_id (actor_user_id),
    INDEX idx_research_activity_logs_created_at (created_at),
    CONSTRAINT fk_research_activity_logs_research
        FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    CONSTRAINT fk_research_activity_logs_actor_user
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
