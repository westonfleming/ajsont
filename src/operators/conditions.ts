import { resolve } from '../resolve.js';
import { MISSING, type Condition } from '../types.js';

const COMPARISONS = ['gt', 'lt', 'gte', 'lte'] as const;
type Comparison = (typeof COMPARISONS)[number];

/**
 * Evaluate a condition against a source object (or a single array element,
 * which becomes the JSONPath root). Shared by $if, $filter, and $find.
 */
export function evaluateCondition(condition: Condition, source: unknown): boolean {
  if ('exists' in condition) {
    return resolve(source, condition.exists) !== MISSING;
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

  for (const op of COMPARISONS) {
    if (op in condition) {
      const [path, expected] = (condition as Record<Comparison, [string, number]>)[op];
      const value = resolve(source, path);
      if (value === MISSING) return false;
      const a = Number(value);
      const b = Number(expected);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return compare(op, a, b);
    }
  }

  return false;
}

function compare(op: Comparison, a: number, b: number): boolean {
  switch (op) {
    case 'gt':
      return a > b;
    case 'lt':
      return a < b;
    case 'gte':
      return a >= b;
    case 'lte':
      return a <= b;
  }
}
