import { MISSING, type SpecValue, type TransformOptions } from './types.js';
import { executeOperator, isOperatorNode } from './operators/index.js';

/**
 * Transform a source object according to the given mapping spec.
 */
export function transform(
  source: unknown,
  spec: SpecValue,
  options: TransformOptions = {},
): unknown {
  const opts: TransformOptions = { onMissing: 'omit', ...options };
  return walk(spec, source, opts);
}

/**
 * Recursively walk the spec, resolving operator nodes and passing through literals.
 * Exported so array operators ($map) can re-root the walk on each element.
 */
export function walk(
  node: SpecValue,
  source: unknown,
  options: TransformOptions,
): unknown {
  // Null / primitives pass through as literals in the target
  if (node === null || typeof node !== 'object') {
    return node;
  }

  // Arrays: map each element
  if (Array.isArray(node)) {
    const result: unknown[] = [];
    for (const element of node) {
      const value = walk(element, source, options);
      if (value !== MISSING) {
        result.push(value);
      }
    }
    return result;
  }

  // Object: check if it's an operator node
  if (isOperatorNode(node)) {
    return executeOperator(node, source, options);
  }

  // Regular object: recurse into each key
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    const resolved = walk(value as SpecValue, source, options);
    if (resolved !== MISSING) {
      result[key] = resolved;
    }
  }
  return result;
}
