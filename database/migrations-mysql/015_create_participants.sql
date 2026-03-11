-- EmotioxV3 Database Migration - Participants Table
-- Version: 0.22.0
-- Description: Creates participants table for panel mode (CSV import, status tracking, individual links)

CREATE TABLE IF NOT EXISTS participants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    participant_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    external_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'disqualified', 'overquota')),
    invited_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_participants_research_participant (research_id, participant_id),
    INDEX idx_participants_research_id (research_id),
    INDEX idx_participants_status (status),
    INDEX idx_participants_email (email),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
