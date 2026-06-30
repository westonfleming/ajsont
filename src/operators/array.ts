import { resolve } from '../resolve.js';
import { walk } from '../transform.js';
import { AjsontError } from '../errors.js';
import {
  MISSING,
  type ArrayCondition,
  type OperatorNode,
  type SpecValue,
  type TransformOptions,
} from '../types.js';
import { evaluateCondition } from './conditions.js';

/**
 * Handle the array operators $map, $filter, and $find.
 *
 * The array is resolved from $path (or the array currently in scope when no
 * $path is given). Each element becomes the JSONPath root for conditions and
 * for the nested $map spec.
 *
 * - $filter keeps only elements matching its condition.
 * - $map reshapes each (filtered) element via a nested spec.
 * - $find returns the first matching element itself (not an array).
 *
 * $find and $filter are mutually exclusive on the same node.
 */
export function handleArray(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  if ('$find' in node && '$filter' in node) {
    throw new AjsontError(
      '$find and $filter cannot be used together on the same node',
    );
  }

  const array = resolveArray(node, source);

  if (array === MISSING) {
    return missingResult(node, options, `$path resolved to no array: ${node.$path ?? '(scope)'}`);
  }

  if (!Array.isArray(array)) {
    throw new AjsontError(
      `$map/$filter/$find requires an array, got ${typeof array}`,
      { jsonPath: node.$path },
    );
  }

  // $find: return the first matching element, or fall back to missing handling.
  if ('$find' in node) {
    const condition = node.$find as ArrayCondition;
    const match = array.find((el) => evaluateCondition(condition, el));
    if (match === undefined) {
      return missingResult(node, options, '$find matched no element');
    }
    return match;
  }

  // $filter narrows the array before $map reshapes it.
  let items = array;
  if ('$filter' in node) {
    const condition = node.$filter as ArrayCondition;
    items = items.filter((el) => evaluateCondition(condition, el));
  }

  if ('$map' in node) {
    const mapSpec = node.$map as SpecValue;
    const mapped: unknown[] = [];
    for (const el of items) {
      const value = walk(mapSpec, el, options);
      if (value !== MISSING) {
        mapped.push(value);
      }
    }
    return mapped;
  }

  // Filter-only (no reshape): return the narrowed array as-is. An empty result
  // stays an empty array rather than being omitted.
  return items;
}

/**
 * Resolve the source array: from $path when present, otherwise the array
 * already in scope (relevant inside a nested $map, where the element is source).
 */
function resolveArray(node: OperatorNode, source: unknown): unknown {
  if ('$path' in node) {
    return resolve(source, node.$path as string);
  }
  if (Array.isArray(source)) {
    return source;
  }
  return MISSING;
}

/**
 * Apply $default / $onMissing handling when the array is absent or $find has no
 * match, mirroring $path's precedence ($default > $onMissing > global).
 */
function missingResult(
  node: OperatorNode,
  options: TransformOptions,
  errorDetail: string,
): unknown {
  if ('$default' in node) {
    return node.$default;
  }

  const strategy = node.$onMissing ?? options.onMissing ?? 'omit';
  switch (strategy) {
    case 'null':
      return null;
    case 'error':
      throw new AjsontError(errorDetail, { jsonPath: node.$path });
    default:
      return MISSING;
  }
}
