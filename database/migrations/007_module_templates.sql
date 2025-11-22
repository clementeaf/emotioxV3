CREATE TABLE IF NOT EXISTS module_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_module_templates_updated_at
    BEFORE UPDATE ON module_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
