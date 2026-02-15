-- Migration: Add enforcement_mode column to demographic_quotas
-- Description: Supports per-quota enforcement mode ('immediate' or 'post_collection')
--   - 'immediate': participant is disqualified in real-time when the quota is full
--   - 'post_collection': all data is kept; filtering happens after collection ends
--
-- Target: MySQL 8.0+

ALTER TABLE demographic_quotas
    ADD COLUMN enforcement_mode VARCHAR(20) NOT NULL DEFAULT 'immediate'
    COMMENT 'How the quota is enforced: immediate (block in real-time) or post_collection (filter after collection)',
    ADD CONSTRAINT valid_enforcement_mode CHECK (enforcement_mode IN ('immediate', 'post_collection'));
