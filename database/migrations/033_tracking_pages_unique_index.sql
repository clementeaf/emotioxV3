-- Migration 033: Make (research_id, page_url) unique in tracking_pages
-- Required for INSERT IGNORE to prevent duplicate pages from concurrent session creation
ALTER TABLE tracking_pages
    DROP INDEX idx_tracking_pages_research_url,
    ADD UNIQUE INDEX idx_tracking_pages_research_url (research_id, page_url(255));
