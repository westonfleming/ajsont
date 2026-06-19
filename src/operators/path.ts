import { resolve } from '../resolve.js';
import { AjsontError } from '../errors.js';
import { MISSING, type OperatorNode, type TransformOptions } from '../types.js';

/**
 * Handle $path operator: resolve a JSONPath expression against the source.
 * Applies $default and $onMissing strategies.
 */
export function handlePath(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  const path = node.$path as string;
  const value = resolve(source, path);

  if (value === MISSING) {
    // Check for $default first
    if ('$default' in node) {
      return node.$default;
    }

    // Apply per-field or global onMissing strategy
    const strategy = node.$onMissing ?? options.onMissing ?? 'omit';

    switch (strategy) {
      case 'omit':
        return MISSING;
      case 'null':
        return null;
      case 'error':
        throw new AjsontError(
          `Missing value at path: ${path}`,
          { jsonPath: path },
        );
    }
  }

  return value;
}
