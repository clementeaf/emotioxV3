-- Emotion recognition for Website Tracking
-- Stores per-session emotion samples (face-api.js) and optional webcam video path

ALTER TABLE tracking_sessions
    ADD COLUMN emotion_samples LONGTEXT DEFAULT NULL,
    ADD COLUMN emotion_video_path VARCHAR(500) DEFAULT NULL;
