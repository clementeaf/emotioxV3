-- EmotioxV3 Database Migration - Initial Schema
-- Version: 1.0.0
-- Description: Creates all tables for the dynamic JSON-based research platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'researcher')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cognito_sub ON users(cognito_sub);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'Authenticated users (admins and researchers)';
COMMENT ON COLUMN users.cognito_sub IS 'AWS Cognito user identifier';
COMMENT ON COLUMN users.metadata IS 'Additional user data in JSON format';

-- ==========================================
-- 2. RESEARCH TYPES TABLE (Templates)
-- ==========================================
CREATE TABLE IF NOT EXISTS research_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    default_modules JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_research_types_name ON research_types(name);
CREATE INDEX idx_research_types_active ON research_types(is_active);
CREATE INDEX idx_research_types_created_by ON research_types(created_by);

COMMENT ON TABLE research_types IS 'Research type templates created by admins';
COMMENT ON COLUMN research_types.default_modules IS 'Array of suggested module templates in JSON';
COMMENT ON COLUMN research_types.settings IS 'Configuration options for this research type';

-- ==========================================
-- 3. RESEARCHES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS researches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    research_type_id UUID REFERENCES research_types(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'active', 'closed', 'completed', 'deleted')),
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_researches_user_id ON researches(user_id);
CREATE INDEX idx_researches_type_id ON researches(research_type_id);
CREATE INDEX idx_researches_status ON researches(status);
CREATE INDEX idx_researches_deleted_at ON researches(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_researches_created_at ON researches(created_at DESC);

COMMENT ON TABLE researches IS 'Individual research studies created by researchers';
COMMENT ON COLUMN researches.status IS 'Current state: draft, active, closed, completed, deleted';
COMMENT ON COLUMN researches.settings IS 'Research-specific configuration';
COMMENT ON COLUMN researches.metadata IS 'Additional research data';

-- ==========================================
-- 4. MODULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_from_template BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_research_id ON modules(research_id);
CREATE INDEX idx_modules_order ON modules(research_id, order_index);

COMMENT ON TABLE modules IS 'Sections/modules within a research study';
COMMENT ON COLUMN modules.is_from_template IS 'Whether this module was cloned from a template';
COMMENT ON COLUMN modules.config IS 'Module-specific configuration in JSON';

-- ==========================================
-- 5. QUESTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    question_type VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    validation JSONB DEFAULT '{}',
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_module_id ON questions(module_id);
CREATE INDEX idx_questions_order ON questions(module_id, order_index);
CREATE INDEX idx_questions_type ON questions(question_type);

COMMENT ON TABLE questions IS 'Individual questions within modules';
COMMENT ON COLUMN questions.question_type IS 'Type of question (text, range, image_preference, etc.) - no restrictions';
COMMENT ON COLUMN questions.config IS 'Question configuration (completely dynamic JSON)';
COMMENT ON COLUMN questions.validation IS 'Validation rules in JSON format';

-- ==========================================
-- 6. MEDIA TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_research_id ON media(research_id);
CREATE INDEX idx_media_question_id ON media(question_id);
CREATE INDEX idx_media_s3_key ON media(s3_key);

COMMENT ON TABLE media IS 'Media files (images, audio, video) stored in S3';
COMMENT ON COLUMN media.s3_key IS 'S3 object key';
COMMENT ON COLUMN media.metadata IS 'Additional file metadata (dimensions, duration, etc.)';

-- ==========================================
-- 7. RESPONSES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
    participant_id VARCHAR(255) NOT NULL,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responses_research_id ON responses(research_id);
CREATE INDEX idx_responses_participant_id ON responses(participant_id);
CREATE INDEX idx_responses_research_participant ON responses(research_id, participant_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
CREATE INDEX idx_responses_created_at ON responses(created_at DESC);

COMMENT ON TABLE responses IS 'Participant responses to questions';
COMMENT ON COLUMN responses.participant_id IS 'External participant ID (no validation)';
COMMENT ON COLUMN responses.answer IS 'Response data (completely dynamic JSON)';
COMMENT ON COLUMN responses.metadata IS 'Response metadata (timestamp, device, IP, etc.)';

-- ==========================================
-- 8. ANALYSIS MODULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS analysis_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    module_type VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_modules_type ON analysis_modules(module_type);
CREATE INDEX idx_analysis_modules_active ON analysis_modules(is_active);

COMMENT ON TABLE analysis_modules IS 'Predefined analysis modules for data visualization';
COMMENT ON COLUMN analysis_modules.config IS 'Analysis module configuration';

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_types_updated_at BEFORE UPDATE ON research_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_researches_updated_at BEFORE UPDATE ON researches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_modules_updated_at BEFORE UPDATE ON analysis_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✓ EmotioxV3 database schema created successfully!';
    RAISE NOTICE '✓ All tables, indexes, and triggers have been created.';
END $$;
