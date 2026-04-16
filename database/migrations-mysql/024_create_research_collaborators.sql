-- Migration 024: Research Collaborators
-- Allows sharing specific researches with other users

CREATE TABLE IF NOT EXISTS research_collaborators (
    id CHAR(36) PRIMARY KEY,
    research_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    permission ENUM('viewer', 'editor') NOT NULL DEFAULT 'viewer',
    invited_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_research_user (research_id, user_id),
    INDEX idx_collaborator_user (user_id),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
