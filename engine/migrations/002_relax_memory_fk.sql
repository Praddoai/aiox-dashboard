-- Remove FK constraint on memory_log.job_id to allow manual memory storage
-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we recreate the table

CREATE TABLE IF NOT EXISTS memory_log_new (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL,
  scope      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT,
  tags       TEXT,
  backend    TEXT NOT NULL DEFAULT 'supermemory',
  stored_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO memory_log_new SELECT * FROM memory_log;
DROP TABLE IF EXISTS memory_log;
ALTER TABLE memory_log_new RENAME TO memory_log;

CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_log(scope);
CREATE INDEX IF NOT EXISTS idx_memory_job ON memory_log(job_id);
