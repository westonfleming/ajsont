import { describe, it, expect } from 'vitest';
import { transform } from '../src/transform.js';
import { AjsontError } from '../src/errors.js';

describe('$path operator', () => {
  const source = {
    user: { name: 'Alice', age: 30 },
    address: { city: 'Portland' },
  };

  it('resolves a simple path', () => {
    const spec = { name: { $path: '$.user.name' } };
    expect(transform(source, spec)).toEqual({ name: 'Alice' });
  });

  it('resolves a nested path', () => {
    const spec = { city: { $path: '$.address.city' } };
    expect(transform(source, spec)).toEqual({ city: 'Portland' });
  });

  it('omits missing path by default', () => {
    const spec = { x: { $path: '$.missing.field' } };
    expect(transform(source, spec)).toEqual({});
  });

  it('returns null with onMissing: null', () => {
    const spec = { x: { $path: '$.missing.field', $onMissing: 'null' } };
    expect(transform(source, spec)).toEqual({ x: null });
  });

  it('uses $default when path is missing', () => {
    const spec = { x: { $path: '$.missing', $default: 'fallback' } };
    expect(transform(source, spec)).toEqual({ x: 'fallback' });
  });

  it('throws on onMissing: error', () => {
    const spec = { x: { $path: '$.missing', $onMissing: 'error' } };
    expect(() => transform(source, spec)).toThrow(AjsontError);
  });

  it('respects global onMissing option', () => {
    const spec = { x: { $path: '$.missing' } };
    expect(transform(source, spec, { onMissing: 'null' })).toEqual({ x: null });
  });

  it('per-field $onMissing overrides global', () => {
    const spec = { x: { $path: '$.missing', $onMissing: 'null' } };
    expect(transform(source, spec, { onMissing: 'error' })).toEqual({ x: null });
  });
});

describe('$literal operator', () => {
  it('returns a literal value', () => {
    const spec = { version: { $literal: 2 } };
    expect(transform({}, spec)).toEqual({ version: 2 });
  });

  it('returns an object literal without interpreting operators', () => {
    const spec = { meta: { $literal: { $path: 'not a real path' } } };
    expect(transform({}, spec)).toEqual({ meta: { $path: 'not a real path' } });
  });
});

describe('$concat operator', () => {
  const source = { first: 'Jane', last: 'Doe' };

  it('concatenates paths and literals', () => {
    const spec = { name: { $concat: ['$.first', ' ', '$.last'] } };
    expect(transform(source, spec)).toEqual({ name: 'Jane Doe' });
  });

  it('omits when a path in concat is missing (default)', () => {
    const spec = { name: { $concat: ['$.first', ' ', '$.missing'] } };
    expect(transform(source, spec)).toEqual({});
  });

  it('uses empty string for missing when onMissing is null', () => {
    const spec = { name: { $concat: ['$.first', ' ', '$.missing'], $onMissing: 'null' } };
    expect(transform(source, spec)).toEqual({ name: 'Jane ' });
  });

  it('skips a missing part with onMissing: skip, keeping the rest', () => {
    // (A + B + Missing) still returns (A + B)
    const spec = { name: { $concat: ['$.first', ' ', '$.last', '$.missing'], $onMissing: 'skip' } };
    expect(transform(source, spec)).toEqual({ name: 'Jane Doe' });
  });

  it('skips a missing part in the middle with onMissing: skip', () => {
    const spec = { name: { $concat: ['$.first', '$.missing', '$.last'], $onMissing: 'skip' } };
    expect(transform(source, spec)).toEqual({ name: 'JaneDoe' });
  });
});

describe('$coalesce operator', () => {
  it('returns the first available value', () => {
    const source = { fallback: 'yes' };
    const spec = { val: { $coalesce: ['$.primary', '$.fallback'] } };
    expect(transform(source, spec)).toEqual({ val: 'yes' });
  });

  it('omits when all paths are missing (default)', () => {
    const spec = { val: { $coalesce: ['$.a', '$.b'] } };
    expect(transform({}, spec)).toEqual({});
  });

  it('uses $default when all paths are missing', () => {
    const spec = { val: { $coalesce: ['$.a', '$.b'], $default: 'none' } };
    expect(transform({}, spec)).toEqual({ val: 'none' });
  });
});

describe('$lower / $upper / $trim operators', () => {
  const source = { name: '  Hello World  ' };

  it('lowercases a value', () => {
    const spec = { val: { $lower: '$.name' } };
    expect(transform(source, spec)).toEqual({ val: '  hello world  ' });
  });

  it('uppercases a value', () => {
    const spec = { val: { $upper: '$.name' } };
    expect(transform(source, spec)).toEqual({ val: '  HELLO WORLD  ' });
  });

  it('trims a value', () => {
    const spec = { val: { $trim: '$.name' } };
    expect(transform(source, spec)).toEqual({ val: 'Hello World' });
  });

  it('omits string op when path is missing', () => {
    const spec = { val: { $lower: '$.missing' } };
    expect(transform({}, spec)).toEqual({});
  });
});

describe('$if operator', () => {
  it('evaluates exists condition (true)', () => {
    const source = { premium: true };
    const spec = { tier: { $if: { exists: '$.premium' }, then: 'pro', else: 'free' } };
    expect(transform(source, spec)).toEqual({ tier: 'pro' });
  });

  it('evaluates exists condition (false)', () => {
    const spec = { tier: { $if: { exists: '$.premium' }, then: 'pro', else: 'free' } };
    expect(transform({}, spec)).toEqual({ tier: 'free' });
  });

  it('evaluates eq condition', () => {
    const source = { status: 'active' };
    const spec = { label: { $if: { eq: ['$.status', 'active'] }, then: 'ON', else: 'OFF' } };
    expect(transform(source, spec)).toEqual({ label: 'ON' });
  });

  it('evaluates ne condition', () => {
    const source = { status: 'inactive' };
    const spec = { label: { $if: { ne: ['$.status', 'active'] }, then: 'NOT ACTIVE', else: 'ACTIVE' } };
    expect(transform(source, spec)).toEqual({ label: 'NOT ACTIVE' });
  });

  it('then/else can be operator nodes', () => {
    const source = { first: 'Jo', last: 'Smith', hasName: true };
    const spec = {
      name: {
        $if: { exists: '$.hasName' },
        then: { $concat: ['$.first', ' ', '$.last'] },
        else: 'Anonymous',
      },
    };
    expect(transform(source, spec)).toEqual({ name: 'Jo Smith' });
  });

  it('then/else can be JSONPath strings', () => {
    const source = { preferred: 'Alice' };
    const spec = {
      name: { $if: { exists: '$.preferred' }, then: '$.preferred', else: 'Unknown' },
    };
    expect(transform(source, spec)).toEqual({ name: 'Alice' });
  });
});

describe('$if numeric conditions', () => {
  it('evaluates gt / gte / lt / lte', () => {
    const source = { qty: 5 };
    expect(transform(source, { ok: { $if: { gt: ['$.qty', 0] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'yes' });
    expect(transform(source, { ok: { $if: { gte: ['$.qty', 5] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'yes' });
    expect(transform(source, { ok: { $if: { lt: ['$.qty', 5] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'no' });
    expect(transform(source, { ok: { $if: { lte: ['$.qty', 5] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'yes' });
  });

  it('treats missing or non-numeric values as not matching', () => {
    expect(transform({}, { ok: { $if: { gt: ['$.qty', 0] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'no' });
    expect(transform({ qty: 'abc' }, { ok: { $if: { gt: ['$.qty', 0] }, then: 'yes', else: 'no' } })).toEqual({ ok: 'no' });
  });
});

describe('$map operator', () => {
  const source = {
    order: {
      items: [
        { title: 'Pen', price: 2, quantity: 3 },
        { title: 'Pad', price: 5, quantity: 0 },
        { title: 'Ink', price: 9, quantity: 1 },
      ],
    },
  };

  it('reshapes each element of a source array', () => {
    const spec = {
      lines: {
        $path: '$.order.items',
        $map: { name: { $path: '$.title' }, cost: { $path: '$.price' } },
      },
    };
    expect(transform(source, spec)).toEqual({
      lines: [
        { name: 'Pen', cost: 2 },
        { name: 'Pad', cost: 5 },
        { name: 'Ink', cost: 9 },
      ],
    });
  });

  it('supports nested operators inside the map spec', () => {
    const spec = {
      lines: {
        $path: '$.order.items',
        $map: { label: { $upper: '$.title' } },
      },
    };
    expect(transform(source, spec)).toEqual({
      lines: [{ label: 'PEN' }, { label: 'PAD' }, { label: 'INK' }],
    });
  });

  it('omits keys per element using onMissing rules', () => {
    const spec = {
      lines: {
        $path: '$.order.items',
        $map: { name: { $path: '$.title' }, sku: { $path: '$.sku' } },
      },
    };
    expect(transform(source, spec)).toEqual({
      lines: [{ name: 'Pen' }, { name: 'Pad' }, { name: 'Ink' }],
    });
  });

  it('applies $default when the array path is missing', () => {
    const spec = { lines: { $path: '$.nope', $map: { x: { $path: '$.title' } }, $default: [] } };
    expect(transform(source, spec)).toEqual({ lines: [] });
  });
});

describe('$filter operator', () => {
  const source = {
    order: {
      items: [
        { title: 'Pen', price: 2, quantity: 3 },
        { title: 'Pad', price: 5, quantity: 0 },
        { title: 'Ink', price: 9, quantity: 1 },
      ],
    },
  };

  it('keeps only matching elements (standalone)', () => {
    const spec = { inStock: { $path: '$.order.items', $filter: { gt: ['$.quantity', 0] } } };
    expect(transform(source, spec)).toEqual({
      inStock: [
        { title: 'Pen', price: 2, quantity: 3 },
        { title: 'Ink', price: 9, quantity: 1 },
      ],
    });
  });

  it('filters before mapping when combined with $map', () => {
    const spec = {
      lines: {
        $path: '$.order.items',
        $filter: { gt: ['$.quantity', 0] },
        $map: { name: { $path: '$.title' } },
      },
    };
    expect(transform(source, spec)).toEqual({
      lines: [{ name: 'Pen' }, { name: 'Ink' }],
    });
  });

  it('returns an empty array (not omitted) when nothing matches', () => {
    const spec = { lines: { $path: '$.order.items', $filter: { gt: ['$.quantity', 999] } } };
    expect(transform(source, spec)).toEqual({ lines: [] });
  });

  it('supports eq / ne conditions', () => {
    const spec = { pens: { $path: '$.order.items', $filter: { eq: ['$.title', 'Pen'] } } };
    expect(transform(source, spec)).toEqual({ pens: [{ title: 'Pen', price: 2, quantity: 3 }] });
  });
});

describe('$find operator', () => {
  const source = {
    contacts: [
      { role: 'billing', email: 'b@example.com' },
      { role: 'primary', email: 'p@example.com' },
    ],
  };

  it('returns the first matching element itself, not an array', () => {
    const spec = { primary: { $path: '$.contacts', $find: { eq: ['$.role', 'primary'] } } };
    expect(transform(source, spec)).toEqual({
      primary: { role: 'primary', email: 'p@example.com' },
    });
  });

  it('uses $default when no element matches', () => {
    const spec = { primary: { $path: '$.contacts', $find: { eq: ['$.role', 'ceo'] }, $default: null } };
    expect(transform(source, spec)).toEqual({ primary: null });
  });

  it('omits by default when no element matches', () => {
    const spec = { primary: { $path: '$.contacts', $find: { eq: ['$.role', 'ceo'] } } };
    expect(transform(source, spec)).toEqual({});
  });

  it('throws on $onMissing: error when no element matches', () => {
    const spec = { primary: { $path: '$.contacts', $find: { eq: ['$.role', 'ceo'] }, $onMissing: 'error' } };
    expect(() => transform(source, spec)).toThrow(AjsontError);
  });

  it('throws when $find and $filter co-occur', () => {
    const spec = { x: { $path: '$.contacts', $find: { exists: '$.role' }, $filter: { exists: '$.role' } } };
    expect(() => transform(source, spec)).toThrow(AjsontError);
  });
});

describe('nested $map', () => {
  it('maps arrays nested inside mapped elements', () => {
    const source = {
      orders: [
        { id: 'o1', items: [{ sku: 'a' }, { sku: 'b' }] },
        { id: 'o2', items: [{ sku: 'c' }] },
      ],
    };
    const spec = {
      orders: {
        $path: '$.orders',
        $map: {
          orderId: { $path: '$.id' },
          skus: { $path: '$.items', $map: { code: { $path: '$.sku' } } },
        },
      },
    };
    expect(transform(source, spec)).toEqual({
      orders: [
        { orderId: 'o1', skus: [{ code: 'a' }, { code: 'b' }] },
        { orderId: 'o2', skus: [{ code: 'c' }] },
      ],
    });
  });
});

describe('transform - integration', () => {
  it('transforms a realistic event normalization scenario', () => {
    const source = {
      person: { firstName: 'Jane', lastName: 'Doe' },
      contact: { email: 'jane@example.com' },
      metadata: { uid: 'u-123' },
      subscription: { plan: 'enterprise' },
    };

    const spec = {
      user: {
        fullName: { $concat: ['$.person.firstName', ' ', '$.person.lastName'] },
        email: { $path: '$.contact.email', $onMissing: 'omit' },
        id: { $path: '$.metadata.uid' },
        region: { $path: '$.geo.region', $default: 'US' },
        tier: { $if: { exists: '$.subscription' }, then: 'premium', else: 'free' },
      },
    };

    expect(transform(source, spec)).toEqual({
      user: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        id: 'u-123',
        region: 'US',
        tier: 'premium',
      },
    });
  });

  it('handles nested structures and arrays in spec', () => {
    const source = { a: 1, b: 2, c: 3 };
    const spec = {
      values: [
        { $path: '$.a' },
        { $path: '$.b' },
        { $path: '$.c' },
      ],
      static: 'hello',
    };
    expect(transform(source, spec)).toEqual({
      values: [1, 2, 3],
      static: 'hello',
    });
  });

  it('passes through literal values in spec', () => {
    const spec = {
      version: 1,
      type: 'event',
      active: true,
      nothing: null,
    };
    expect(transform({}, spec)).toEqual({
      version: 1,
      type: 'event',
      active: true,
      nothing: null,
    });
  });
});
