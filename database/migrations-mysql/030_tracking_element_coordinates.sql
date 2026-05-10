-- Migration 030: Add element-relative coordinates to tracking_events
-- Enables Hotjar-style element-based heatmap positioning

ALTER TABLE tracking_events
    ADD COLUMN element_offset_x DECIMAL(7,2) DEFAULT NULL COMMENT 'Click X offset within target element (% of element width)',
    ADD COLUMN element_offset_y DECIMAL(7,2) DEFAULT NULL COMMENT 'Click Y offset within target element (% of element height)',
    ADD COLUMN element_width INT DEFAULT NULL COMMENT 'Target element width in px at capture time',
    ADD COLUMN element_height INT DEFAULT NULL COMMENT 'Target element height in px at capture time';
