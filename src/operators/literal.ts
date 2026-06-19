import type { OperatorNode } from '../types.js';

/**
 * Handle $literal operator: return the value as-is without interpretation.
 */
export function handleLiteral(node: OperatorNode): unknown {
  return node.$literal;
}
