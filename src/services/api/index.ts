export { apiClient, type StreamCallbacks } from './client';
export { squadsApi } from './squads';
export { agentsApi } from './agents';
export { executeApi, buildExecuteRequest } from './execute';
export { workflowsApi } from './workflows';
export { analyticsApi } from './analytics';
export { tasksApi } from './tasks';
export { engineApi } from './engine';
export type {
  EngineHealth,
  PoolStatus,
  PoolSlot,
  EngineJob,
  CronJobDef,
  WorkflowDef,
  WorkflowState,
  AuthorityCheckResult,
  BundleInfo,
} from './engine';
export type { Task, TaskAgent, TaskSquadSelection, TaskWorkflow, CreateTaskResponse } from './tasks';
export type {
  TimePeriod,
  AnalyticsOverview,
  RealtimeMetrics,
  AgentPerformance,
  SquadPerformance,
  CostReport,
  HealthDashboard,
} from './analytics';
export type {
  WorkflowSummary,
  Workflow,
  WorkflowStep,
  WorkflowExecution,
  WorkflowStats,
  WorkflowSchema,
} from './workflows';
