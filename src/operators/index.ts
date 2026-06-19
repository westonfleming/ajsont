import type { OperatorNode, TransformOptions } from '../types.js';
import { handlePath } from './path.js';
import { handleLiteral } from './literal.js';
import { handleConcat } from './concat.js';
import { handleCoalesce } from './coalesce.js';
import { handleLower, handleUpper, handleTrim } from './string.js';
import { handleIf } from './conditional.js';

const OPERATOR_KEYS = new Set([
  '$path',
  '$literal',
  '$concat',
  '$coalesce',
  '$lower',
  '$upper',
  '$trim',
  '$if',
]);

/**
 * Determine if an object is an operator node (has at least one $-prefixed key
 * that is a known operator).
 */
export function isOperatorNode(obj: object): obj is OperatorNode {
  return Object.keys(obj).some((key) => OPERATOR_KEYS.has(key));
}

/**
 * Execute the appropriate operator handler for a node.
 * Priority order matters: $literal > $if > $path > $concat > $coalesce > string ops
 */
export function executeOperator(
  node: OperatorNode,
  source: unknown,
  options: TransformOptions,
): unknown {
  if ('$literal' in node) {
    return handleLiteral(node);
  }
  if ('$if' in node) {
    return handleIf(node, source, options);
  }
  if ('$path' in node) {
    return handlePath(node, source, options);
  }
  if ('$concat' in node) {
    return handleConcat(node, source, options);
  }
  if ('$coalesce' in node) {
    return handleCoalesce(node, source, options);
  }
  if ('$lower' in node) {
    return handleLower(node, source);
  }
  if ('$upper' in node) {
    return handleUpper(node, source);
  }
  if ('$trim' in node) {
    return handleTrim(node, source);
  }

  // Shouldn't reach here if isOperatorNode is correct
  return node;
}
