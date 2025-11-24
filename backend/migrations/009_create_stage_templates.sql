-- Create stage_templates table
CREATE TABLE IF NOT EXISTS stage_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for stage templates and module templates
CREATE TABLE IF NOT EXISTS stage_templates_module_templates (
    stage_template_id UUID NOT NULL REFERENCES stage_templates(id) ON DELETE CASCADE,
    module_template_id UUID NOT NULL REFERENCES module_templates(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (stage_template_id, module_template_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stage_templates_created_by 
    ON stage_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_stage_templates_is_active 
    ON stage_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_stage_module_stage_id 
    ON stage_templates_module_templates(stage_template_id);

CREATE INDEX IF NOT EXISTS idx_stage_module_module_id 
    ON stage_templates_module_templates(module_template_id);

-- Add comments
COMMENT ON TABLE stage_templates IS 'Templates for organizing modules into stages (e.g., Smart VOC, Cognitive Tasks)';
COMMENT ON TABLE stage_templates_module_templates IS 'Junction table associating stage templates with module templates';
COMMENT ON COLUMN stage_templates_module_templates.display_order IS 'Order in which modules appear within the stage';
