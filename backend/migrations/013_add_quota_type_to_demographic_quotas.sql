-- Migration: Add quota_type column to demographic_quotas
-- Description: Quotas are now always percentage-based. quota_limit stores a value 0-100
--   representing the percentage of the research's participantLimit.
--   enforcement_mode is always 'immediate' (applied after demographics submission).
--
-- Target: MySQL 8.0+

ALTER TABLE demographic_quotas
    ADD COLUMN quota_type VARCHAR(20) NOT NULL DEFAULT 'percentage'
    COMMENT 'Type of quota limit: percentage (of participantLimit)'
    AFTER quota_limit;

-- Migrate existing rows: all quotas become percentage + immediate
UPDATE demographic_quotas SET quota_type = 'percentage', enforcement_mode = 'immediate';
