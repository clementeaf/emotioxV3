-- EmotioxV3 Database Migration - Initial Schema (MySQL)
-- Version: 1.0.0
-- Description: Creates all tables for the dynamic JSON-based research platform

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'researcher')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    metadata JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_users_email (email),
    INDEX idx_users_cognito_sub (cognito_sub),
    INDEX idx_users_role (role),
    INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. RESEARCH TYPES TABLE (Templates)
-- ==========================================
CREATE TABLE IF NOT EXISTS research_types (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    default_modules JSON DEFAULT ('[]'),
    settings JSON DEFAULT ('{}'),
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_research_types_name (name),
    INDEX idx_research_types_active (is_active),
    INDEX idx_research_types_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. RESEARCH TECHNIQUES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_techniques (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_research_techniques_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. ENTERPRISES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enterprises (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    metadata JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enterprises_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 5. RESEARCHES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS researches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    research_type_id CHAR(36),
    research_technique_id CHAR(36),
    enterprise_id CHAR(36),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
    config JSON DEFAULT ('{}'),
    demographics JSON DEFAULT ('{}'),
    quotas JSON DEFAULT ('{}'),
    created_by CHAR(36),
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_researches_name (name),
    INDEX idx_researches_status (status),
    INDEX idx_researches_research_type_id (research_type_id),
    INDEX idx_researches_research_technique_id (research_technique_id),
    INDEX idx_researches_enterprise_id (enterprise_id),
    INDEX idx_researches_created_by (created_by),
    INDEX idx_researches_deleted_at (deleted_at),
    FOREIGN KEY (research_type_id) REFERENCES research_types(id) ON DELETE SET NULL,
    FOREIGN KEY (research_technique_id) REFERENCES research_techniques(id) ON DELETE SET NULL,
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 6. STAGE TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS stage_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('single_module', 'module_collection')),
    structure JSON DEFAULT ('{}'),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stage_templates_name (name),
    INDEX idx_stage_templates_type (type),
    INDEX idx_stage_templates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 7. MODULE TEMPLATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS module_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSON NOT NULL,
    stage_template_id CHAR(36),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_module_templates_name (name),
    INDEX idx_module_templates_stage_template_id (stage_template_id),
    INDEX idx_module_templates_active (is_active),
    FOREIGN KEY (stage_template_id) REFERENCES stage_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 8. STAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS stages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    stage_template_id CHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    config JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stages_research_id (research_id),
    INDEX idx_stages_stage_template_id (stage_template_id),
    INDEX idx_stages_display_order (display_order),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_template_id) REFERENCES stage_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 9. RESPONSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS responses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    stage_id CHAR(36),
    session_id VARCHAR(255) NOT NULL,
    participant_id VARCHAR(255),
    module_id VARCHAR(255),
    question_id VARCHAR(255),
    answer JSON,
    metadata JSON DEFAULT ('{}'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_responses_research_id (research_id),
    INDEX idx_responses_stage_id (stage_id),
    INDEX idx_responses_session_id (session_id),
    INDEX idx_responses_participant_id (participant_id),
    INDEX idx_responses_module_id (module_id),
    INDEX idx_responses_question_id (question_id),
    INDEX idx_responses_created_at (created_at),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
