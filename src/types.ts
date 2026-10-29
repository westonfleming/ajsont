export interface TransformOptions {
  /** Global default behavior when a source path is missing. Default: 'omit' */
  onMissing?: OnMissing;
}

export type OnMissing = 'omit' | 'null' | 'error' | 'skip';

/** Sentinel value used internally to represent a missing/unresolved path */
export const MISSING = Symbol('MISSING');

/** Any value in a mapping spec: either a literal, an operator node, or a nested structure */
export type SpecValue =
  | OperatorNode
  | SpecObject
  | SpecArray
  | string
  | number
  | boolean
  | null;

export interface SpecObject {
  [key: string]: SpecValue;
}

export type SpecArray = SpecValue[];

/** An operator node is an object with at least one $-prefixed key */
export interface OperatorNode {
  $path?: string;
  $literal?: unknown;
  $concat?: SpecValue[];
  $coalesce?: string[];
  $lower?: string;
  $upper?: string;
  $trim?: string;
  $if?: IfCondition;
  then?: SpecValue;
  else?: SpecValue;
  $map?: SpecValue;
  $filter?: ArrayCondition;
  $find?: ArrayCondition;
  $default?: unknown;
  $onMissing?: OnMissing;
  [key: string]: unknown;
}

/**
 * A condition describes a test against a JSONPath-resolved value. Shared by
 * $if, $filter, and $find. The comparison forms test a single path; the boolean
 * combinators (and/or/not) compose other conditions and nest arbitrarily.
 */
export type Condition =
  | { exists: string }
  | { eq: [string, unknown] }
  | { ne: [string, unknown] }
  | { gt: [string, number] }
  | { lt: [string, number] }
  | { gte: [string, number] }
  | { lte: [string, number] }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition };

/** Condition used by $if's then/else branching. */
export type IfCondition = Condition;

/** Condition used by $filter and $find to test array elements. */
export type ArrayCondition = Condition;

export interface OperatorHandler {
  (node: OperatorNode, source: unknown, options: TransformOptions): unknown;
}
