-- EmotioxV3 - Website Tracking Tables
-- Version: 0.63.0
-- Description: Creates tables for website interaction tracking (click heatmaps, session recording)

-- ==========================================
-- 1. TRACKING SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tracking_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    page_url TEXT NOT NULL,
    page_title VARCHAR(500),
    viewport_width INT NOT NULL,
    viewport_height INT NOT NULL,
    screen_width INT,
    screen_height INT,
    user_agent TEXT,
    referrer TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    INDEX idx_tracking_sessions_research (research_id),
    INDEX idx_tracking_sessions_visitor (visitor_id),
    INDEX idx_tracking_sessions_started (started_at),
    INDEX idx_tracking_sessions_research_page (research_id, page_url(255)),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. TRACKING EVENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tracking_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36) NOT NULL,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('click', 'scroll', 'mousemove', 'resize', 'pageview')),
    x INT,
    y INT,
    scroll_y INT,
    scroll_depth_pct DECIMAL(5,2),
    target_selector VARCHAR(500),
    target_text VARCHAR(255),
    timestamp_ms BIGINT NOT NULL,
    metadata JSON DEFAULT NULL,
    INDEX idx_tracking_events_session (session_id),
    INDEX idx_tracking_events_session_type (session_id, event_type),
    INDEX idx_tracking_events_timestamp (session_id, timestamp_ms),
    FOREIGN KEY (session_id) REFERENCES tracking_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. TRACKING PAGES TABLE (screenshots for heatmap overlay)
-- ==========================================
CREATE TABLE IF NOT EXISTS tracking_pages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    research_id CHAR(36) NOT NULL,
    page_url TEXT NOT NULL,
    page_title VARCHAR(500),
    screenshot_s3_key VARCHAR(500),
    viewport_width INT,
    viewport_height INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tracking_pages_research (research_id),
    INDEX idx_tracking_pages_research_url (research_id, page_url(255)),
    FOREIGN KEY (research_id) REFERENCES researches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. SEED: Website Tracking research type
-- ==========================================
INSERT INTO research_types (id, name, description, default_modules, settings, is_active)
VALUES (
    UUID(),
    'Website Tracking',
    'Track user interactions (clicks, scroll, mouse movement) on external websites via an injectable script',
    JSON_ARRAY(),
    JSON_OBJECT(
        'skip_default_modules', true,
        'trackingConfig', JSON_OBJECT(
            'captureClicks', true,
            'captureScroll', false,
            'captureMousemove', false,
            'consentRequired', true,
            'flushIntervalMs', 2000,
            'maxEventsPerFlush', 50
        )
    ),
    true
)
ON DUPLICATE KEY UPDATE name=name;
