-- EmotioxV3 - Add device-specific screenshots to tracking_pages
-- Version: 0.68.0
-- Description: Adds screenshot_devices JSON column for mobile/tablet/desktop screenshots

ALTER TABLE tracking_pages
    ADD COLUMN screenshot_devices JSON DEFAULT NULL
    COMMENT 'JSON: { mobile?: string, tablet?: string, desktop?: string } — s3 keys per device category';

-- Migrate existing screenshot_s3_key into screenshot_devices.desktop
UPDATE tracking_pages
SET screenshot_devices = JSON_OBJECT('desktop', screenshot_s3_key)
WHERE screenshot_s3_key IS NOT NULL AND screenshot_devices IS NULL;
