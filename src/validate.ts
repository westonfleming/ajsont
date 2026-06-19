import { AjsontError } from './errors.js';
import type { SpecValue } from './types.js';

const KNOWN_OPERATORS = new Set([
  '$path',
  '$literal',
  '$concat',
  '$coalesce',
  '$lower',
  '$upper',
  '$trim',
  '$if',
  '$default',
  '$onMissing',
]);

const VALID_ON_MISSING = new Set(['omit', 'null', 'error']);

export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate a mapping spec without executing it.
 * Returns an array of validation errors (empty if valid).
 */
export function validateSpec(spec: SpecValue): ValidationError[] {
  const errors: ValidationError[] = [];
  walkValidate(spec, '$', errors);
  return errors;
}

function walkValidate(
  node: SpecValue,
  path: string,
  errors: ValidationError[],
): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, i) => walkValidate(item, `${path}[${i}]`, errors));
    return;
  }

  const keys = Object.keys(node);
  const operatorKeys = keys.filter((k) => k.startsWith('$'));

  if (operatorKeys.length === 0) {
    // Regular object — recurse
    for (const [key, value] of Object.entries(node)) {
      walkValidate(value as SpecValue, `${path}.${key}`, errors);
    }
    return;
  }

  // Check for unknown operators
  for (const key of operatorKeys) {
    if (!KNOWN_OPERATORS.has(key)) {
      errors.push({ path, message: `Unknown operator: ${key}` });
    }
  }

  const obj = node as Record<string, unknown>;

  // Validate $path
  if ('$path' in obj) {
    if (typeof obj.$path !== 'string') {
      errors.push({ path, message: '$path must be a string' });
    } else if (!obj.$path.startsWith('$')) {
      errors.push({ path, message: '$path must be a valid JSONPath expression (should start with $)' });
    }
  }

  // Validate $onMissing
  if ('$onMissing' in obj) {
    if (!VALID_ON_MISSING.has(obj.$onMissing as string)) {
      errors.push({ path, message: `$onMissing must be one of: omit, null, error` });
    }
  }

  // Validate $concat
  if ('$concat' in obj) {
    if (!Array.isArray(obj.$concat)) {
      errors.push({ path, message: '$concat must be an array' });
    }
  }

  // Validate $coalesce
  if ('$coalesce' in obj) {
    if (!Array.isArray(obj.$coalesce)) {
      errors.push({ path, message: '$coalesce must be an array' });
    } else {
      for (const item of obj.$coalesce as unknown[]) {
        if (typeof item !== 'string') {
          errors.push({ path, message: '$coalesce items must be JSONPath strings' });
          break;
        }
      }
    }
  }

  // Validate $if
  if ('$if' in obj) {
    const condition = obj.$if;
    if (typeof condition !== 'object' || condition === null) {
      errors.push({ path, message: '$if must be a condition object' });
    } else {
      const cond = condition as Record<string, unknown>;
      const hasValidCondition =
        'exists' in cond || 'eq' in cond || 'ne' in cond;
      if (!hasValidCondition) {
        errors.push({
          path,
          message: '$if condition must have one of: exists, eq, ne',
        });
      }
      if ('eq' in cond && (!Array.isArray(cond.eq) || cond.eq.length !== 2)) {
        errors.push({ path, message: '$if eq must be a [path, value] tuple' });
      }
      if ('ne' in cond && (!Array.isArray(cond.ne) || cond.ne.length !== 2)) {
        errors.push({ path, message: '$if ne must be a [path, value] tuple' });
      }
    }

    if (!('then' in obj)) {
      errors.push({ path, message: '$if requires a "then" property' });
    }
  }

  // Validate string operators
  for (const op of ['$lower', '$upper', '$trim'] as const) {
    if (op in obj && typeof obj[op] !== 'string') {
      errors.push({ path, message: `${op} must be a JSONPath string` });
    }
  }
}
