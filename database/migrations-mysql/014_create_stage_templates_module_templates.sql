-- EmotioxV3 Database Migration - Create stage_templates_module_templates junction table (MySQL)
-- Version: 014
-- Description: Creates junction table for many-to-many relationship between stage_templates and module_templates

-- ==========================================
-- STAGE TEMPLATES MODULE TEMPLATES JUNCTION TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS stage_templates_module_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stage_template_id CHAR(36) NOT NULL,
    module_template_id CHAR(36) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_stage_module (stage_template_id, module_template_id),
    INDEX idx_stage_templates_module_templates_stage_id (stage_template_id),
    INDEX idx_stage_templates_module_templates_module_id (module_template_id),
    INDEX idx_stage_templates_module_templates_display_order (display_order),
    FOREIGN KEY (stage_template_id) REFERENCES stage_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (module_template_id) REFERENCES module_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
