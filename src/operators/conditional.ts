import { resolve } from '../resolve.js';
import { MISSING, type IfCondition, type OperatorNode, type SpecValue, type TransformOptions } from '../types.js';
import { executeOperator, isOperatorNode } from './index.js';

/**
 * Handle $if operator: evaluate a condition and resolve either the `then` or `else` branch.
 */
export function handleIf(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  const condition = node.$if as IfCondition;
  const conditionMet = evaluateCondition(condition, source);

  const branch = conditionMet ? node.then : node.else;

  // If the chosen branch is undefined, treat as missing
  if (branch === undefined) {
    return MISSING;
  }

  return resolveValue(branch as SpecValue, source, options);
}

function evaluateCondition(condition: IfCondition, source: unknown): boolean {
  if ('exists' in condition) {
    const value = resolve(source, condition.exists);
    return value !== MISSING;
  }

  if ('eq' in condition) {
    const [path, expected] = condition.eq;
    const value = resolve(source, path);
    if (value === MISSING) return false;
    return value === expected;
  }

  if ('ne' in condition) {
    const [path, expected] = condition.ne;
    const value = resolve(source, path);
    if (value === MISSING) return true;
    return value !== expected;
  }

  return false;
}

function resolveValue(
  value: SpecValue,
  source: unknown,
  options: TransformOptions,
): unknown {
  if (value === null || typeof value !== 'object') {
    // Check if it's a JSONPath string
    if (typeof value === 'string' && value.startsWith('$.')) {
      const resolved = resolve(source, value);
      return resolved === MISSING ? null : resolved;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolveValue(v as SpecValue, source, options));
  }

  if (isOperatorNode(value)) {
    return executeOperator(value as OperatorNode, source, options);
  }

  // Recurse into plain objects
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = resolveValue(val as SpecValue, source, options);
  }
  return result;
}
