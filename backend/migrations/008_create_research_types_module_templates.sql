-- Create junction table for research types and module templates
CREATE TABLE IF NOT EXISTS research_types_module_templates (
    research_type_id UUID NOT NULL REFERENCES research_types(id) ON DELETE CASCADE,
    module_template_id UUID NOT NULL REFERENCES module_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (research_type_id, module_template_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_research_types_modules_type_id 
    ON research_types_module_templates(research_type_id);

CREATE INDEX IF NOT EXISTS idx_research_types_modules_template_id 
    ON research_types_module_templates(module_template_id);
