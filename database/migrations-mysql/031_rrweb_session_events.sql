-- EmotioxV3 - rrweb Session Recording Events
-- Version: 0.73.0
-- Description: Adds column for storing rrweb DOM-based recording events per session

ALTER TABLE tracking_sessions
    ADD COLUMN rrweb_events LONGTEXT DEFAULT NULL AFTER referrer;
