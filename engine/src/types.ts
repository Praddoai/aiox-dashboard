// ============================================================
// AIOS Agent Execution Engine — Core Types
// ============================================================

// -- Config --

export interface EngineConfig {
  server: {
    port: number;
    host: string;
    cors_origins: string[];
  };
  pool: {
    max_concurrent: number;
    max_per_squad: number;
    spawn_timeout_ms: number;
    execution_timeout_ms: number;
  };
  queue: {
    check_interval_ms: number;
    max_attempts: number;
  };
  memory: {
    context_budget_tokens: number;
    recall_top_k: number;
  };
  workspace: {
    base_dir: string;
    max_concurrent: number;
    cleanup_on_success: boolean;
  };
  claude: {
    skip_permissions: boolean;
    max_turns: number;
    output_format: string;
  };
  auth: {
    webhook_token: string;
  };
  logging: {
    level: LogLevel;
  };
}

// -- Logging --

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// -- Jobs --

export type JobStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'timeout'
  | 'rejected'
  | 'cancelled';

export type TriggerType = 'gui' | 'webhook' | 'cron' | 'workflow' | 'n8n';

export type JobPriority = 0 | 1 | 2 | 3; // 0=urgent, 1=high, 2=normal, 3=low

export interface Job {
  id: string;
  squad_id: string;
  agent_id: string;
  status: JobStatus;
  priority: JobPriority;
  input_payload: string;         // JSON stringified
  output_result: string | null;
  context_hash: string | null;
  parent_job_id: string | null;
  workflow_id: string | null;
  trigger_type: TriggerType;
  callback_url: string | null;
  workspace_dir: string | null;
  pid: number | null;
  attempts: number;
  max_attempts: number;
  timeout_ms: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  metadata: string | null;       // JSON stringified
}

export interface CreateJobInput {
  squad_id: string;
  agent_id: string;
  input_payload: Record<string, unknown>;
  priority?: JobPriority;
  trigger_type?: TriggerType;
  callback_url?: string;
  parent_job_id?: string;
  workflow_id?: string;
  timeout_ms?: number;
  max_attempts?: number;
  metadata?: Record<string, unknown>;
}

// -- Execution (metrics) --

export interface Execution {
  id: string;
  job_id: string;
  squad_id: string;
  agent_id: string;
  duration_ms: number | null;
  exit_code: number | null;
  tokens_used: number | null;
  files_changed: number;
  memory_stored: number;
  success: boolean;
  created_at: string;
}

// -- Memory --

export interface MemoryEntry {
  id: string;
  job_id: string;
  scope: string;
  content: string;
  type: string | null;
  tags: string | null;           // JSON array
  backend: 'supermemory' | 'qdrant';
  stored_at: string;
}

// -- API (aligned with frontend types) --

export interface ExecuteRequest {
  squadId: string;
  agentId: string;
  input: {
    message: string;
    context?: Record<string, unknown>;
    command?: string;
  };
  options?: {
    async?: boolean;
    timeout?: number;
    stream?: boolean;
  };
}

export interface ExecuteResponse {
  executionId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  duration_ms?: number;
}

// -- WebSocket Events --

export type WSEventType =
  | 'job:created'
  | 'job:started'
  | 'job:completed'
  | 'job:failed'
  | 'job:progress'
  | 'workflow:phase_started'
  | 'workflow:phase_completed'
  | 'workflow:phase_changed'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'memory:stored'
  | 'pool:updated';

export interface WSEvent {
  type: WSEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

// -- Process Pool --

export interface PoolSlot {
  id: number;
  jobId: string | null;
  pid: number | null;
  squadId: string | null;
  agentId: string | null;
  startedAt: number | null;
  status: 'idle' | 'spawning' | 'running';
}

export interface PoolStatus {
  total: number;
  occupied: number;
  idle: number;
  queue_depth: number;
  slots: PoolSlot[];
}

// -- Workflow Engine --

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowPhase {
  id: string;
  name: string;
  agentId: string;
  squadId: string;
  taskType?: string;
  nextOnSuccess: string | null;    // phase id or null (end)
  nextOnFailure: string | null;    // phase id or null (fail)
  nextOnBlocked?: string | null;   // escalation phase
  maxIterations?: number;          // for loops (QA Loop)
  skipIf?: string;                 // condition to skip this phase
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  phases: WorkflowPhase[];
  entryPhase: string;
}

export interface WorkflowState {
  id: string;
  workflow_id: string;
  definition_id: string;
  current_phase: string;
  status: WorkflowStatus;
  phase_history: string;           // JSON array of { phase, result, timestamp }
  iteration_count: number;
  parent_job_id: string | null;
  input_payload: string;
  created_at: string;
  updated_at: string;
}

// -- Authority --

export interface AuthorityAuditEntry {
  timestamp: string;
  agentId: string;
  squadId: string;
  operation: string;
  allowed: boolean;
  reason?: string;
}
