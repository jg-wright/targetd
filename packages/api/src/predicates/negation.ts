/**
 * Whether a targeting value is a negation (a string prefixed with `!`).
 *
 * @internal
 */
export function isNegation(value: unknown): value is `!${string}` {
  return typeof value === 'string' && value.startsWith('!')
}
