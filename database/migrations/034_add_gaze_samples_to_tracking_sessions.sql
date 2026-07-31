-- Add gaze attention samples column to tracking_sessions
-- Stores iris-based gaze direction + attention state from MediaPipe FaceLandmarker
ALTER TABLE tracking_sessions ADD COLUMN gaze_samples LONGTEXT DEFAULT NULL;
