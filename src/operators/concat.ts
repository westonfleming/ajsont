import { resolve } from '../resolve.js';
import { MISSING, type OperatorNode, type SpecValue, type TransformOptions } from '../types.js';

/**
 * Handle $concat operator: concatenate resolved paths and literal strings.
 * Items starting with '$.' are treated as JSONPath expressions; everything else is literal.
 */
export function handleConcat(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  const items = node.$concat as SpecValue[];
  const parts: string[] = [];

  for (const item of items) {
    if (typeof item === 'string' && item.startsWith('$.')) {
      const value = resolve(source, item);
      if (value === MISSING) {
        const strategy = node.$onMissing ?? options.onMissing ?? 'omit';
        if (strategy === 'omit') return MISSING;
        if (strategy === 'null') {
          parts.push('');
        }
        // 'error' would have been caught upstream in a $path node
      } else {
        parts.push(String(value));
      }
    } else {
      parts.push(String(item ?? ''));
    }
  }

  return parts.join('');
}
