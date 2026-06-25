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
  $default?: unknown;
  $onMissing?: OnMissing;
  [key: string]: unknown;
}

export type IfCondition =
  | { exists: string }
  | { eq: [string, unknown] }
  | { ne: [string, unknown] };

export interface OperatorHandler {
  (node: OperatorNode, source: unknown, options: TransformOptions): unknown;
}
