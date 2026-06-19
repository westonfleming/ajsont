import { resolve } from '../resolve.js';
import { MISSING, type OperatorNode } from '../types.js';

/**
 * Handle $lower operator: resolve a JSONPath and lowercase the result.
 */
export function handleLower(node: OperatorNode, source: unknown): unknown {
  const path = node.$lower as string;
  const value = resolve(source, path);
  if (value === MISSING) return MISSING;
  return String(value).toLowerCase();
}

/**
 * Handle $upper operator: resolve a JSONPath and uppercase the result.
 */
export function handleUpper(node: OperatorNode, source: unknown): unknown {
  const path = node.$upper as string;
  const value = resolve(source, path);
  if (value === MISSING) return MISSING;
  return String(value).toUpperCase();
}

/**
 * Handle $trim operator: resolve a JSONPath and trim whitespace.
 */
export function handleTrim(node: OperatorNode, source: unknown): unknown {
  const path = node.$trim as string;
  const value = resolve(source, path);
  if (value === MISSING) return MISSING;
  return String(value).trim();
}
