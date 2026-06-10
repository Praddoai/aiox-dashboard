-- ============================================================
-- Workflow State Persistence — Story 3.3
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_state (
  id              TEXT PRIMARY KEY,
  workflow_id     TEXT NOT NULL,
  definition_id   TEXT NOT NULL,
  current_phase   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  phase_history   TEXT NOT NULL DEFAULT '[]',
  iteration_count INTEGER NOT NULL DEFAULT 0,
  parent_job_id   TEXT,
  input_payload   TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_state(status);
CREATE INDEX IF NOT EXISTS idx_workflow_definition ON workflow_state(definition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_parent ON workflow_state(parent_job_id);
