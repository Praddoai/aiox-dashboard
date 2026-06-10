-- ============================================================
-- AIOS Agent Execution Engine — Initial Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  squad_id      TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  priority      INTEGER NOT NULL DEFAULT 2,
  input_payload TEXT NOT NULL,
  output_result TEXT,
  context_hash  TEXT,
  parent_job_id TEXT,
  workflow_id   TEXT,
  trigger_type  TEXT NOT NULL DEFAULT 'gui',
  callback_url  TEXT,
  workspace_dir TEXT,
  pid           INTEGER,
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  timeout_ms    INTEGER NOT NULL DEFAULT 300000,
  started_at    TEXT,
  completed_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  error_message TEXT,
  metadata      TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_squad ON jobs(squad_id);
CREATE INDEX IF NOT EXISTS idx_jobs_parent ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_workflow ON jobs(workflow_id);

CREATE TABLE IF NOT EXISTS memory_log (
  id         TEXT PRIMARY KEY,
  job_id     TEXT NOT NULL,
  scope      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT,
  tags       TEXT,
  backend    TEXT NOT NULL DEFAULT 'supermemory',
  stored_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory_log(scope);
CREATE INDEX IF NOT EXISTS idx_memory_job ON memory_log(job_id);

CREATE TABLE IF NOT EXISTS executions (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL,
  squad_id      TEXT NOT NULL,
  agent_id      TEXT NOT NULL,
  duration_ms   INTEGER,
  exit_code     INTEGER,
  tokens_used   INTEGER,
  files_changed INTEGER NOT NULL DEFAULT 0,
  memory_stored INTEGER NOT NULL DEFAULT 0,
  success       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_executions_job ON executions(job_id);
CREATE INDEX IF NOT EXISTS idx_executions_squad ON executions(squad_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent ON executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON executions(created_at);
