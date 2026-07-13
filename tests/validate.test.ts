import { describe, it, expect } from 'vitest';
import { validateSpec } from '../src/validate.js';

describe('validateSpec', () => {
  it('returns no errors for a valid spec', () => {
    const spec = {
      user: {
        name: { $path: '$.name' },
        email: { $path: '$.email', $onMissing: 'null' },
      },
    };
    expect(validateSpec(spec)).toEqual([]);
  });

  it('detects unknown operators', () => {
    const spec = { x: { $unknown: '$.a' } };
    const errors = validateSpec(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Unknown operator');
  });

  it('detects invalid $path type', () => {
    const spec = { x: { $path: 123 } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('$path must be a string'))).toBe(true);
  });

  it('detects invalid $onMissing value', () => {
    const spec = { x: { $path: '$.a', $onMissing: 'invalid' } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('$onMissing'))).toBe(true);
  });

  it('detects $concat not being an array', () => {
    const spec = { x: { $concat: 'not-array' } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('$concat must be an array'))).toBe(true);
  });

  it('detects $coalesce with non-string items', () => {
    const spec = { x: { $coalesce: [123, '$.b'] } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('$coalesce items must be JSONPath strings'))).toBe(true);
  });

  it('detects $if without then', () => {
    const spec = { x: { $if: { exists: '$.a' } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('requires a "then"'))).toBe(true);
  });

  it('detects $if with invalid condition', () => {
    const spec = { x: { $if: { invalid: true }, then: 'y' } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('exists, eq, ne'))).toBe(true);
  });

  it('detects $if eq with wrong shape', () => {
    const spec = { x: { $if: { eq: ['$.a'] }, then: 'y' } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('tuple'))).toBe(true);
  });

  it('accepts a valid $map / $filter / $find spec', () => {
    const spec = {
      lines: {
        $path: '$.order.items',
        $filter: { gt: ['$.quantity', 0] },
        $map: { name: { $path: '$.title' } },
      },
      primary: { $path: '$.contacts', $find: { eq: ['$.role', 'primary'] }, $default: null },
    };
    expect(validateSpec(spec)).toEqual([]);
  });

  it('detects unknown condition keys in $filter', () => {
    const spec = { x: { $path: '$.a', $filter: { between: [1, 2] } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('unknown condition key'))).toBe(true);
  });

  it('detects $map/$filter/$find without a $path or array scope', () => {
    const spec = { x: { $filter: { exists: '$.a' } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('requires a $path'))).toBe(true);
  });

  it('allows array operators without $path inside a $map scope', () => {
    const spec = {
      x: { $path: '$.rows', $map: { items: { $filter: { exists: '$.a' } } } },
    };
    expect(validateSpec(spec)).toEqual([]);
  });

  it('detects $find and $filter used together', () => {
    const spec = { x: { $path: '$.a', $find: { exists: '$.b' }, $filter: { exists: '$.b' } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('cannot be used together'))).toBe(true);
  });

  it('detects a $filter comparison with a non-tuple value', () => {
    const spec = { x: { $path: '$.a', $filter: { gt: '$.q' } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('tuple'))).toBe(true);
  });

  it('validates nested specs inside a $map', () => {
    const spec = { x: { $path: '$.a', $map: { y: { $unknownOp: true } } } };
    const errors = validateSpec(spec);
    expect(errors.some((e) => e.message.includes('Unknown operator'))).toBe(true);
  });

  it('accepts the new numeric conditions in $if', () => {
    const spec = { x: { $if: { gte: ['$.n', 10] }, then: 'big', else: 'small' } };
    expect(validateSpec(spec)).toEqual([]);
  });

  it('validates nested specs', () => {
    const spec = {
      outer: {
        inner: { $unknown: true },
      },
    };
    const errors = validateSpec(spec);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('$.outer.inner');
  });
});
