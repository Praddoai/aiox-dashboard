import { describe, test, expect } from 'bun:test';
import { parse as parseYaml } from 'yaml';

describe('Config — YAML Loading', () => {
  const CONFIG_YAML = `
server:
  port: 4002
  host: "0.0.0.0"
  cors_origins:
    - "http://localhost:5173"

pool:
  max_concurrent: 5
  max_per_squad: 3
  spawn_timeout_ms: 30000
  execution_timeout_ms: 300000

queue:
  check_interval_ms: 1000
  max_attempts: 3

memory:
  context_budget_tokens: 8000
  recall_top_k: 10

workspace:
  base_dir: ".workspace"
  max_concurrent: 10
  cleanup_on_success: true

claude:
  skip_permissions: false
  max_turns: -1
  output_format: "stream-json"

auth:
  webhook_token: ""

logging:
  level: "info"
`;

  test('parses all config sections', () => {
    const config = parseYaml(CONFIG_YAML);
    expect(config.server.port).toBe(4002);
    expect(config.pool.max_concurrent).toBe(5);
    expect(config.queue.check_interval_ms).toBe(1000);
    expect(config.memory.context_budget_tokens).toBe(8000);
    expect(config.workspace.base_dir).toBe('.workspace');
    expect(config.claude.output_format).toBe('stream-json');
    expect(config.auth.webhook_token).toBe('');
    expect(config.logging.level).toBe('info');
  });

  test('cors_origins is an array', () => {
    const config = parseYaml(CONFIG_YAML);
    expect(config.server.cors_origins).toBeInstanceOf(Array);
    expect(config.server.cors_origins).toContain('http://localhost:5173');
  });

  test('pool limits are positive', () => {
    const config = parseYaml(CONFIG_YAML);
    expect(config.pool.max_concurrent).toBeGreaterThan(0);
    expect(config.pool.max_per_squad).toBeGreaterThan(0);
    expect(config.pool.max_per_squad).toBeLessThanOrEqual(config.pool.max_concurrent);
  });

  test('timeout values are reasonable', () => {
    const config = parseYaml(CONFIG_YAML);
    expect(config.pool.execution_timeout_ms).toBeGreaterThanOrEqual(60000); // At least 1 min
    expect(config.pool.spawn_timeout_ms).toBeGreaterThanOrEqual(5000);     // At least 5s
  });

  test('max_turns -1 means unlimited', () => {
    const config = parseYaml(CONFIG_YAML);
    expect(config.claude.max_turns).toBe(-1);
  });
});
