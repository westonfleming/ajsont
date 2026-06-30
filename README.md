# ajsont

Declarative JSON-to-JSON transformation using JSONPath.

Define the shape of your output as a template, reference source values with [JSONPath](https://datatracker.ietf.org/doc/rfc9535/) expressions, and let `ajsont` do the rest. No custom query language to learn — just standard JSONPath plus a small set of `$`-prefixed operators.

## Install

```bash
npm install @westonfleming/ajsont
```

## Quick Example

```typescript
import { transform } from "@westonfleming/ajsont";

const source = {
  person: { firstName: "Jane", lastName: "Doe" },
  contact: { email: "jane@example.com" },
  metadata: { uid: "u-123" },
  subscription: { plan: "enterprise" },
};

const spec = {
  user: {
    fullName: { $concat: ["$.person.firstName", " ", "$.person.lastName"] },
    email: { $path: "$.contact.email", $onMissing: "omit" },
    id: { $path: "$.metadata.uid" },
    region: { $path: "$.geo.region", $default: "US" },
    tier: { $if: { exists: "$.subscription" }, then: "premium", else: "free" },
  },
};

const result = transform(source, spec);
// {
//   user: {
//     fullName: 'Jane Doe',
//     email: 'jane@example.com',
//     id: 'u-123',
//     region: 'US',
//     tier: 'premium'
//   }
// }
```

## Working with Arrays

Reshape, narrow, or pluck items out of a source array with `$map`, `$filter`, and `$find`. Inside these operators, each array element becomes the JSONPath root, so paths like `$.title` refer to fields on the current item.

```typescript
import { transform } from "@westonfleming/ajsont";

const source = {
  order: {
    items: [
      { title: "Pen", price: 2, quantity: 3 },
      { title: "Pad", price: 5, quantity: 0 },
      { title: "Ink", price: 9, quantity: 1 },
    ],
  },
};

const spec = {
  lineItems: {
    $path: "$.order.items",
    $filter: { gt: ["$.quantity", 0] },
    $map: {
      name: { $path: "$.title" },
      total: { $concat: ["$", "$.price"] },
    },
  },
};

const result = transform(source, spec);
// {
//   lineItems: [
//     { name: 'Pen', total: '$2' },
//     { name: 'Ink', total: '$9' }
//   ]
// }
```

Use `$find` to extract a single matching item (the item itself, not an array):

```typescript
const spec = {
  primaryContact: { $path: "$.contacts", $find: { eq: ["$.role", "primary"] }, $default: null },
};
```

## How It Works

The mapping spec **is** the target shape. Every key in the spec becomes a key in the output. When a value is an operator node (an object with a `$`-prefixed key), `ajsont` resolves it against the source. Plain values (strings, numbers, booleans, null) pass through as literals.

## API

### `transform(source, spec, options?)`

Transform a source object according to a mapping spec.

```typescript
import { transform } from "@westonfleming/ajsont";

const result = transform(source, spec);
const result = transform(source, spec, { onMissing: "null" });
```

**Parameters:**

| Parameter | Type               | Description                                        |
| --------- | ------------------ | -------------------------------------------------- |
| `source`  | `unknown`          | The source JSON object to transform                |
| `spec`    | `SpecValue`        | The mapping specification (target-shaped template) |
| `options` | `TransformOptions` | Optional global settings                           |

**Options:**

| Option      | Type                          | Default  | Description                                  |
| ----------- | ----------------------------- | -------- | -------------------------------------------- |
| `onMissing` | `'omit' \| 'null' \| 'error'` | `'omit'` | Global default when a source path is missing |

### `validateSpec(spec)`

Validate a mapping spec without executing it. Returns an array of validation errors.

```typescript
import { validateSpec } from "@westonfleming/ajsont";

const errors = validateSpec(spec);
if (errors.length > 0) {
  console.error("Invalid spec:", errors);
}
```

Each error has `{ path: string, message: string }` describing where in the spec the issue is and what's wrong.

### `AjsontError`

Thrown when `$onMissing` is set to `'error'` and a path cannot be resolved.

```typescript
import { transform, AjsontError } from "@westonfleming/ajsont";

try {
  transform(source, spec);
} catch (err) {
  if (err instanceof AjsontError) {
    console.error(err.message); // "Missing value at path: $.foo.bar"
    console.error(err.jsonPath); // "$.foo.bar"
  }
}
```

## Operators

### `$path` — Extract a value

Resolve a JSONPath expression against the source and place the result in the output.

```json
{ "$path": "$.user.name" }
```

Combine with `$default` or `$onMissing` to control behavior when the path doesn't exist:

```json
{ "$path": "$.user.nickname", "$default": "Anonymous" }
{ "$path": "$.user.nickname", "$onMissing": "null" }
```

### `$literal` — Escape hatch

Return a value as-is, without interpreting `$`-prefixed keys as operators. Use this when your target output needs to contain keys that start with `$`.

```json
{ "$literal": { "$path": "this is not an operator, just data" } }
```

### `$concat` — Concatenate values

Join multiple values into a single string. Items that start with `$.` are resolved as JSONPath; everything else is treated as a literal string.

```json
{ "$concat": ["$.person.firstName", " ", "$.person.lastName"] }
```

### `$coalesce` — First available value

Return the first non-null, non-undefined value from a list of JSONPath expressions.

```json
{ "$coalesce": ["$.user.preferredName", "$.user.firstName", "$.user.id"] }
```

Supports `$default` as a final fallback:

```json
{ "$coalesce": ["$.primary", "$.secondary"], "$default": "unknown" }
```

### `$lower` — Lowercase

Resolve a JSONPath and lowercase the result.

```json
{ "$lower": "$.user.email" }
```

### `$upper` — Uppercase

Resolve a JSONPath and uppercase the result.

```json
{ "$upper": "$.event.type" }
```

### `$trim` — Trim whitespace

Resolve a JSONPath and trim leading/trailing whitespace.

```json
{ "$trim": "$.input.rawName" }
```

### `$if` — Conditional mapping

Evaluate a condition and resolve either the `then` or `else` branch.

```json
{
  "$if": { "exists": "$.subscription" },
  "then": "premium",
  "else": "free"
}
```

**Supported conditions:**

| Condition                       | Meaning                                              |
| ------------------------------- | ---------------------------------------------------- |
| `{ "exists": "$.path" }`        | True if the path resolves to any value               |
| `{ "eq": ["$.path", "value"] }` | True if resolved value equals the literal            |
| `{ "ne": ["$.path", "value"] }` | True if resolved value does not equal the literal    |
| `{ "gt": ["$.path", 0] }`       | True if the resolved number is greater than the value |
| `{ "lt": ["$.path", 0] }`       | True if the resolved number is less than the value   |
| `{ "gte": ["$.path", 0] }`      | True if the resolved number is `>=` the value        |
| `{ "lte": ["$.path", 0] }`      | True if the resolved number is `<=` the value        |

The same condition shape is shared by `$filter` and `$find`. Numeric comparisons coerce both sides to numbers; a missing or non-numeric value is `false`.

The `then` and `else` branches can be:

- Literal values (`"active"`, `42`, `true`)
- JSONPath strings (`"$.user.name"` — resolved against source)
- Operator nodes (nested operators like `$concat`, `$path`, etc.)

```json
{
  "$if": { "exists": "$.user.fullName" },
  "then": "$.user.fullName",
  "else": { "$concat": ["$.user.first", " ", "$.user.last"] }
}
```

### `$map` — Transform each item in an array

Apply a nested spec to every element of the array resolved by `$path`. Each element becomes the JSONPath root for paths inside the nested spec. Nesting (a `$map` inside a `$map`) is supported.

```json
{
  "$path": "$.order.items",
  "$map": { "name": { "$path": "$.title" }, "cost": { "$path": "$.price" } }
}
```

### `$filter` — Keep matching items

Drop array elements that don't match a condition (same condition shape as `$if`, including `gt`/`lt`/`gte`/`lte`). Use it standalone, or combine it with `$map` — filtering happens first, then the remaining items are reshaped.

```json
{ "$path": "$.order.items", "$filter": { "gt": ["$.quantity", 0] } }
```

### `$find` — Extract the first matching item

Return the first array element matching a condition — the element itself, not an array. Supports `$default` (or `$onMissing`) for the no-match case. `$find` and `$filter` cannot be used together on the same node.

```json
{
  "$path": "$.contacts",
  "$find": { "eq": ["$.role", "primary"] },
  "$default": null
}
```

## Missing Property Handling

When a JSONPath doesn't match anything in the source, behavior is controlled at two levels:

### Per-field: `$onMissing`

```json
{ "$path": "$.optional.field", "$onMissing": "null" }
```

### Global: `options.onMissing`

```typescript
transform(source, spec, { onMissing: "null" });
```

**Strategies:**

| Strategy  | Behavior                              |
| --------- | ------------------------------------- |
| `'omit'`  | Key is excluded from output (default) |
| `'null'`  | Key is included with value `null`     |
| `'error'` | Throws `AjsontError`                  |

Per-field `$onMissing` always takes priority over the global option.

The `$default` property provides a specific fallback value and takes priority over both:

```json
{ "$path": "$.missing", "$default": "fallback value" }
```

### Arrays

A `$filter` that removes every element produces an empty array (`[]`) — the key is kept, not omitted. If the source array itself is missing, the usual `$default` → `$onMissing` → global precedence applies. `$find` with no match follows the same precedence as `$path`.

## Spec Validation

Use `validateSpec` to catch issues in a mapping spec before execution:

```typescript
import { validateSpec } from "@westonfleming/ajsont";

const errors = validateSpec({
  x: { $unknownOp: "$.a" },
  y: { $if: { invalid: true } },
});

// [
//   { path: '$.x', message: 'Unknown operator: $unknownOp' },
//   { path: '$.y', message: '$if condition must have one of: exists, eq, ne' },
//   { path: '$.y', message: '$if requires a "then" property' }
// ]
```

## TypeScript

The package ships with full type definitions. Key exported types:

```typescript
import type {
  TransformOptions,
  OnMissing,
  SpecValue,
  Condition,
  IfCondition,
  ArrayCondition,
} from "@westonfleming/ajsont";
```

## License

MIT
