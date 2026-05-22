-- Migration 032: Add active_duration_ms to tracking_sessions
-- Stores real active time (tab visible) instead of wall-clock duration
ALTER TABLE tracking_sessions ADD COLUMN active_duration_ms INT DEFAULT NULL AFTER ended_at;
