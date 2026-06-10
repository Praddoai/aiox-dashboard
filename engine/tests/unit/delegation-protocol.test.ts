import { describe, test, expect } from 'bun:test';
import { parseDelegation } from '../../src/core/delegation-protocol';

describe('Delegation Protocol — Parser', () => {
  test('parses HTML comment delegation', () => {
    const output = `
Here is my analysis.

<!-- DELEGATE: {"tasks":[
  {"taskId":"t1","agentId":"dev","message":"Implement login page"},
  {"taskId":"t2","agentId":"qa","message":"Write tests for login","dependsOn":["t1"]}
]} -->

Done with delegation.
    `;

    const result = parseDelegation(output);
    expect(result).toBeTruthy();
    expect(result!.length).toBe(2);
    expect(result![0].taskId).toBe('t1');
    expect(result![0].agentId).toBe('dev');
    expect(result![1].dependsOn).toEqual(['t1']);
  });

  test('parses single delegation object', () => {
    const output = '<!-- DELEGATE: {"taskId":"solo","agentId":"dev","message":"Fix bug"} -->';
    const result = parseDelegation(output);
    expect(result).toBeTruthy();
    expect(result!.length).toBe(1);
    expect(result![0].taskId).toBe('solo');
  });

  test('parses JSON code block delegation', () => {
    const output = `
Some analysis text.

\`\`\`json
{
  "delegation": [
    {"taskId":"cb1","agentId":"dev","message":"Task from code block"}
  ]
}
\`\`\`
    `;

    const result = parseDelegation(output);
    expect(result).toBeTruthy();
    expect(result!.length).toBe(1);
    expect(result![0].taskId).toBe('cb1');
  });

  test('returns null for output without delegation', () => {
    const output = 'Just a normal response with no delegation markers.';
    const result = parseDelegation(output);
    expect(result).toBeNull();
  });

  test('handles malformed JSON gracefully', () => {
    const output = '<!-- DELEGATE: {invalid json} -->';
    const result = parseDelegation(output);
    expect(result).toBeNull(); // Malformed = no valid delegations
  });

  test('parses multiple delegation blocks', () => {
    const output = `
<!-- DELEGATE: {"taskId":"a","agentId":"dev","message":"First"} -->
Some text between
<!-- DELEGATE: {"taskId":"b","agentId":"qa","message":"Second"} -->
    `;

    const result = parseDelegation(output);
    expect(result).toBeTruthy();
    expect(result!.length).toBe(2);
  });
});
