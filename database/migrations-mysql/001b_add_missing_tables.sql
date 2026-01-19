-- EmotioxV3 Database Migration - Add Missing Tables (MySQL)
-- Version: 1.0.0b
-- Description: Adds modules, questions, media, and analysis_modules tables

-- ==========================================
-- MODULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS modules (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    is_from_template BOOLEAN DEFAULT false,
    config JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_modules_research_id (research_id),
    INDEX idx_modules_order (research_id, order_index),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- QUESTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    module_id CHAR(36) NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    order_index INT NOT NULL,
    config JSON NOT NULL DEFAULT ('{}'),
    validation JSON DEFAULT ('{}'),
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_questions_module_id (module_id),
    INDEX idx_questions_order (module_id, order_index),
    INDEX idx_questions_type (question_type),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- MEDIA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS media (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    question_id CHAR(36),
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    metadata JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_research_id (research_id),
    INDEX idx_media_question_id (question_id),
    INDEX idx_media_s3_key (s3_key),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- ANALYSIS MODULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS analysis_modules (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module_type VARCHAR(100) NOT NULL,
    config JSON DEFAULT ('{}'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_analysis_modules_type (module_type),
    INDEX idx_analysis_modules_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
