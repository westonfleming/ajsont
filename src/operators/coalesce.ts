import { resolve } from '../resolve.js';
import { AjsontError } from '../errors.js';
import { MISSING, type OperatorNode, type TransformOptions } from '../types.js';

/**
 * Handle $coalesce operator: return the first non-missing/non-null value
 * from a list of JSONPath expressions.
 */
export function handleCoalesce(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  const paths = node.$coalesce as string[];

  for (const path of paths) {
    const value = resolve(source, path);
    if (value !== MISSING && value !== null && value !== undefined) {
      return value;
    }
  }

  // All paths were missing
  if ('$default' in node) {
    return node.$default;
  }

  const strategy = node.$onMissing ?? options.onMissing ?? 'omit';
  switch (strategy) {
    case 'omit':
      return MISSING;
    case 'null':
      return null;
    case 'error':
      throw new AjsontError(
        `All paths in $coalesce resolved to missing: ${paths.join(', ')}`,
      );
  }
}
