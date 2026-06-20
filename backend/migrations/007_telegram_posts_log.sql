-- Migration: 007_telegram_posts_log
-- Description: Create table to log Telegram posts

CREATE TABLE IF NOT EXISTS telegram_posts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type VARCHAR(50) NOT NULL, -- 'alert', 'weekly_summary', 'daily_summary', 'educational_tip'
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups by workflow_type or status
CREATE INDEX IF NOT EXISTS idx_telegram_posts_type ON telegram_posts_log(workflow_type);
CREATE INDEX IF NOT EXISTS idx_telegram_posts_status ON telegram_posts_log(status);
