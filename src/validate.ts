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
  '$map',
  '$filter',
  '$find',
  '$default',
  '$onMissing',
]);

const VALID_ON_MISSING = new Set(['omit', 'null', 'error']);

const CONDITION_KEYS = new Set(['exists', 'eq', 'ne', 'gt', 'lt', 'gte', 'lte']);
const TUPLE_CONDITION_KEYS = new Set(['eq', 'ne', 'gt', 'lt', 'gte', 'lte']);
const ARRAY_OPERATORS = ['$map', '$filter', '$find'] as const;

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
  walkValidate(spec, '$', errors, false);
  return errors;
}

function walkValidate(
  node: SpecValue,
  path: string,
  errors: ValidationError[],
  inArrayScope: boolean,
): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, i) => walkValidate(item, `${path}[${i}]`, errors, inArrayScope));
    return;
  }

  const keys = Object.keys(node);
  const operatorKeys = keys.filter((k) => k.startsWith('$'));

  if (operatorKeys.length === 0) {
    // Regular object — recurse
    for (const [key, value] of Object.entries(node)) {
      walkValidate(value as SpecValue, `${path}.${key}`, errors, inArrayScope);
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
    validateCondition(obj.$if, '$if', path, errors);

    if (!('then' in obj)) {
      errors.push({ path, message: '$if requires a "then" property' });
    }
  }

  // Validate array operators: $map / $filter / $find
  const usesArrayOperator = ARRAY_OPERATORS.some((op) => op in obj);
  if (usesArrayOperator) {
    // $find and $filter are mutually exclusive on the same node.
    if ('$find' in obj && '$filter' in obj) {
      errors.push({
        path,
        message: '$find and $filter cannot be used together on the same node',
      });
    }

    // The array must come from a $path here, or from an enclosing $map scope.
    if (!('$path' in obj) && !inArrayScope) {
      errors.push({
        path,
        message: '$map/$filter/$find requires a $path that resolves to an array (or an enclosing $map scope)',
      });
    }

    // $filter / $find conditions use the shared condition shape.
    if ('$filter' in obj) {
      validateCondition(obj.$filter, '$filter', path, errors);
    }
    if ('$find' in obj) {
      validateCondition(obj.$find, '$find', path, errors);
    }

    // Recurse into the $map spec; its elements are array items (in scope).
    if ('$map' in obj) {
      walkValidate(obj.$map as SpecValue, `${path}.$map`, errors, true);
    }
  }

  // Validate string operators
  for (const op of ['$lower', '$upper', '$trim'] as const) {
    if (op in obj && typeof obj[op] !== 'string') {
      errors.push({ path, message: `${op} must be a JSONPath string` });
    }
  }
}

/**
 * Validate a condition object shared by $if, $filter, and $find. Checks that
 * exactly one known condition key is present and that comparison conditions are
 * [path, value] tuples.
 */
function validateCondition(
  condition: unknown,
  opName: string,
  path: string,
  errors: ValidationError[],
): void {
  if (typeof condition !== 'object' || condition === null) {
    errors.push({ path, message: `${opName} must be a condition object` });
    return;
  }

  const cond = condition as Record<string, unknown>;
  const presentKeys = Object.keys(cond).filter((k) => CONDITION_KEYS.has(k));

  if (presentKeys.length === 0) {
    errors.push({
      path,
      message: `${opName} condition must have one of: exists, eq, ne, gt, lt, gte, lte`,
    });
  }

  for (const key of Object.keys(cond)) {
    if (!CONDITION_KEYS.has(key)) {
      errors.push({ path, message: `${opName} has unknown condition key: ${key}` });
    }
  }

  for (const key of presentKeys) {
    if (TUPLE_CONDITION_KEYS.has(key)) {
      const value = cond[key];
      if (!Array.isArray(value) || value.length !== 2) {
        errors.push({ path, message: `${opName} ${key} must be a [path, value] tuple` });
      }
    }
  }
}
