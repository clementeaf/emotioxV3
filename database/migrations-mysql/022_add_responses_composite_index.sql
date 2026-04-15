-- 022: Add composite index for analytics queries
-- Queries filter by (research_id, module_id, component_id) but only single-column indexes exist.
-- MySQL picks one and scans the rest. This composite index enables direct lookup.

CREATE INDEX idx_responses_research_module_component
ON responses (research_id, module_id, component_id);
