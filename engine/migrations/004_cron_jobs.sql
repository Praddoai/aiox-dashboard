-- ============================================================
-- Cron Jobs Persistence — Story 4.2
-- ============================================================

CREATE TABLE IF NOT EXISTS cron_jobs (
  id          TEXT PRIMARY KEY,
  squad_id    TEXT NOT NULL,
  agent_id    TEXT NOT NULL,
  schedule    TEXT NOT NULL,
  input_payload TEXT NOT NULL DEFAULT '{}',
  enabled     INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  last_job_id TEXT,
  next_run_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_enabled ON cron_jobs(enabled);
