import { describe, expect, it } from 'vitest';
import { yamlToMermaid } from '@/lib/yaml-to-mermaid';

describe('yamlToMermaid', () => {
  describe('Style A: flat phases with depends_on', () => {
    it('generates nodes and edges from phases with depends_on', () => {
      const yaml = `
phases:
  - id: PHASE-1
    name: "Foundation"
    agent: claude-hopkins

  - id: PHASE-2
    name: "Strategy"
    agent: dan-kennedy
    depends_on:
      - "PHASE-1"

  - id: PHASE-3
    name: "Execution"
    agent: gary-halbert
    depends_on:
      - "PHASE-2"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('flowchart TD');
      expect(result).toContain('PHASE_1["Foundation<br/>@claude-hopkins"]');
      expect(result).toContain('PHASE_2["Strategy<br/>@dan-kennedy"]');
      expect(result).toContain('PHASE_3["Execution<br/>@gary-halbert"]');
      expect(result).toContain('PHASE_1 --> PHASE_2');
      expect(result).toContain('PHASE_2 --> PHASE_3');
    });

    it('handles phases with tier metadata without breaking', () => {
      const yaml = `
phases:
  - id: PHASE-1
    name: "Foundation"
    agent: agent-a
    tier: 0

  - id: PHASE-2
    name: "Execution"
    agent: agent-b
    tier: 1
    depends_on:
      - "PHASE-1"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('PHASE_1["Foundation<br/>@agent-a"]');
      expect(result).toContain('PHASE_2["Execution<br/>@agent-b"]');
      expect(result).toContain('PHASE_1 --> PHASE_2');
    });
  });

  describe('Style A: phases without depends_on (sequential fallback)', () => {
    it('chains phases sequentially when no depends_on present', () => {
      const yaml = `
phases:
  - name: session_setup
    agent: board-chair

  - name: issue_presentation
    agent: user

  - name: clarifying_questions
    agent: all_advisors
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('session_setup --> issue_presentation');
      expect(result).toContain('issue_presentation --> clarifying_questions');
    });
  });

  describe('Style B: top-level steps', () => {
    it('generates nodes from steps array with id', () => {
      const yaml = `
steps:
  - id: "step_1_audit"
    name: "Audit Codebase"
    type: "agent"
    agent: "brad-frost"

  - id: "step_2_consolidate"
    name: "Consolidate Patterns"
    type: "agent"
    agent: "brad-frost"

  - id: "step_3_tokenize"
    name: "Extract Tokens"
    type: "agent"
    agent: "brad-frost"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('flowchart TD');
      expect(result).toContain('step_1_audit["Audit Codebase<br/>@brad-frost"]');
      expect(result).toContain('step_2_consolidate["Consolidate Patterns<br/>@brad-frost"]');
      expect(result).toContain('step_3_tokenize["Extract Tokens<br/>@brad-frost"]');
      // Sequential fallback
      expect(result).toContain('step_1_audit --> step_2_consolidate');
      expect(result).toContain('step_2_consolidate --> step_3_tokenize');
    });
  });

  describe('Style B nested: workflow.steps', () => {
    it('generates nodes from workflow.steps', () => {
      const yaml = `
workflow:
  id: "design-system-brownfield"
  name: "Brownfield Complete"
  steps:
    - id: "step_1"
      name: "Step One"
      agent: "brad-frost"
    - id: "step_2"
      name: "Step Two"
      agent: "brad-frost"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('step_1["Step One<br/>@brad-frost"]');
      expect(result).toContain('step_2["Step Two<br/>@brad-frost"]');
      expect(result).toContain('step_1 --> step_2');
    });
  });

  describe('transitions', () => {
    it('generates edges from explicit transitions block', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: squad-chief

  - id: phase_1
    name: "Research"
    agent: squad-chief
    depends_on:
      - "phase_0"

transitions:
  - from: phase_0
    to: phase_1
    condition: discovery_complete
    description: "Domain viable"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('phase_0 -->|discovery_complete| phase_1');
    });

    it('ignores transitions referencing non-existent nodes', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: test-agent

transitions:
  - from: phase_0
    to: nonexistent_phase
    condition: something
`;
      const result = yamlToMermaid(yaml);
      expect(result).not.toContain('nonexistent_phase');
    });
  });

  describe('checkpoint diamond', () => {
    it('renders diamond shape for checkpoint with human_review: true', () => {
      const yaml = `
phases:
  - id: PHASE-2
    name: "Strategy"
    agent: dan-kennedy
    checkpoint:
      human_review: true
      criteria:
        - "avatar_profile COMPLETE"
`;
      const result = yamlToMermaid(yaml);
      // Diamond shape uses { } with quoted label
      expect(result).toContain('PHASE_2{"Strategy<br/>@dan-kennedy"}');
    });

    it('renders rectangle for checkpoint with human_review: false', () => {
      const yaml = `
phases:
  - id: PHASE-1
    name: "Foundation"
    agent: claude-hopkins
    checkpoint:
      human_review: false
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('PHASE_1["Foundation<br/>@claude-hopkins"]');
    });
  });

  describe('elicit hexagon', () => {
    it('renders hexagon shape for type: elicit steps', () => {
      const yaml = `
steps:
  - id: "step_elicit"
    name: "Gather Input"
    type: "elicit"
    agent: "pm-agent"

  - id: "step_process"
    name: "Process"
    type: "agent"
    agent: "dev-agent"
`;
      const result = yamlToMermaid(yaml);
      // Hexagon uses {{ }} with quoted label
      expect(result).toContain('step_elicit{{"Gather Input<br/>@pm-agent"}}');
      expect(result).toContain('step_process["Process<br/>@dev-agent"]');
    });

    it('renders hexagon for steps with elicit field as object', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: squad-chief
    steps:
      - id: step_0_3
        name: "Define structure"
        elicit:
          - squad_name: "kebab-case"
          - version: "1.0.0"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('step_0_3{{"Define structure<br/>@squad-chief"}}');
    });
  });

  describe('VETO/rejection dotted edges', () => {
    it('uses dotted arrows for VETO conditions in transitions', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: squad-chief

  - id: phase_abort
    name: "Abort"
    agent: squad-chief

transitions:
  - from: phase_0
    to: phase_abort
    condition: "VETO - Domain not viable"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('phase_0 -.->|VETO - Domain not viable| phase_abort');
    });

    it('uses dotted arrows for NO-GO conditions', () => {
      const yaml = `
phases:
  - id: phase_validate
    name: "Validate"
    agent: po-agent

  - id: phase_rework
    name: "Rework"
    agent: dev-agent

transitions:
  - from: phase_validate
    to: phase_rework
    condition: "NO-GO - Criteria not met"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('-.->');
    });
  });

  describe('agent coloring', () => {
    it('generates classDef for each unique agent', () => {
      const yaml = `
phases:
  - id: p1
    name: "Phase 1"
    agent: agent-alpha

  - id: p2
    name: "Phase 2"
    agent: agent-beta

  - id: p3
    name: "Phase 3"
    agent: agent-alpha
`;
      const result = yamlToMermaid(yaml);
      // Should have exactly 2 classDef entries (one per unique agent)
      const classDefMatches = result.match(/classDef agent_/g);
      expect(classDefMatches).toHaveLength(2);
      expect(result).toContain('classDef agent_agent_alpha');
      expect(result).toContain('classDef agent_agent_beta');
      // Verify class assignment groups nodes by agent
      expect(result).toContain('class p1,p3 agent_agent_alpha');
      expect(result).toContain('class p2 agent_agent_beta');
    });

    it('uses color palette values in classDef', () => {
      const yaml = `
phases:
  - id: p1
    name: "Phase 1"
    agent: agent-one
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('fill:#4CAF50');
    });
  });

  describe('empty and invalid input', () => {
    it('throws on empty string', () => {
      expect(() => yamlToMermaid('')).toThrow('Empty or null YAML content');
    });

    it('throws on whitespace-only string', () => {
      expect(() => yamlToMermaid('   \n\n  ')).toThrow('Empty or null YAML content');
    });

    it('throws on YAML with no phases or steps', () => {
      expect(() => yamlToMermaid('name: test\nversion: 1.0')).toThrow('No phases or steps found');
    });

    it('throws on invalid YAML syntax', () => {
      expect(() => yamlToMermaid('{{{{invalid yaml::::')).toThrow('Failed to parse YAML');
    });

    it('throws on YAML that parses to non-object', () => {
      expect(() => yamlToMermaid('just a string')).toThrow('YAML content does not contain a valid object');
    });
  });

  describe('sanitization', () => {
    it('sanitizes node IDs to be alphanumeric with underscores', () => {
      const yaml = `
phases:
  - id: "PHASE-1.0"
    name: "Test Phase"
    agent: test-agent
`;
      const result = yamlToMermaid(yaml);
      // ID should not contain hyphens or dots
      expect(result).toContain('PHASE_1_0["Test Phase<br/>@test-agent"]');
    });

    it('sanitizes labels with special characters', () => {
      const yaml = `
phases:
  - id: p1
    name: "Test [with] brackets"
    agent: test-agent
`;
      const result = yamlToMermaid(yaml);
      // Should escape brackets in labels (inside quoted node)
      expect(result).toContain('#lsqb;with#rsqb;');
      expect(result).toContain('p1["Test #lsqb;with#rsqb; brackets<br/>@test-agent"]');
    });
  });

  describe('nested steps within phases (hybrid)', () => {
    it('processes nested steps inside phases', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: squad-chief
    steps:
      - id: step_0_1
        name: "Validate Viability"

      - id: step_0_2
        name: "Check Existing"
        depends_on: "step_0_1"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('phase_0["Discovery<br/>@squad-chief"]');
      expect(result).toContain('step_0_1["Validate Viability<br/>@squad-chief"]');
      expect(result).toContain('step_0_2["Check Existing<br/>@squad-chief"]');
      expect(result).toContain('step_0_1 --> step_0_2');
    });

    it('inherits agent from parent phase when step has no agent', () => {
      const yaml = `
phases:
  - id: phase_0
    name: "Discovery"
    agent: squad-chief
    steps:
      - id: step_0_1
        name: "Sub Step"
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('step_0_1["Sub Step<br/>@squad-chief"]');
    });
  });

  describe('edge deduplication', () => {
    it('does not produce duplicate edges', () => {
      const yaml = `
phases:
  - id: p1
    name: "Phase 1"
    agent: agent-a

  - id: p2
    name: "Phase 2"
    agent: agent-a
    depends_on:
      - "p1"

transitions:
  - from: p1
    to: p2
    condition: ready
`;
      const result = yamlToMermaid(yaml);
      // Should have the transition edge (with label) and the depends_on edge
      // but the sequential fallback should not duplicate
      const edgeLines = result.split('\n').filter(
        (line) => line.includes('p1') && line.includes('p2') && (line.includes('-->') || line.includes('-.->'))
      );
      // depends_on creates one edge, transitions creates another (labeled),
      // sequential fallback should be skipped since p2 has incoming edges
      expect(edgeLines.length).toBeLessThanOrEqual(2);
    });
  });

  describe('agents.primary pattern', () => {
    it('extracts agent from agents.primary field', () => {
      const yaml = `
phases:
  - id: p1
    name: "Engineering"
    agents:
      primary: hormozi-offers
      secondary: hormozi-pricing
`;
      const result = yamlToMermaid(yaml);
      expect(result).toContain('<br/>@hormozi-offers');
    });
  });
});
