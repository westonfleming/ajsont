import { JSONPath } from 'jsonpath-plus';
import { MISSING } from './types.js';

/**
 * Resolve a JSONPath expression against a source object.
 * Returns the first matched value, or the MISSING sentinel if no match.
 */
export function resolve(source: unknown, path: string): unknown {
  const results = JSONPath({ path, json: source as object, wrap: true });

  if (!Array.isArray(results) || results.length === 0) {
    return MISSING;
  }

  return results[0];
}
