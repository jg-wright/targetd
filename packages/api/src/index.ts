export { default as Data } from './Data.ts'
export * from './PromisedData.ts'
export { DataSchema } from './DataSchema.ts'
export { DataItemParser } from './parsers/DataItem.ts'
export { DataItemsParser } from './parsers/DataItems.ts'
export { DataItemRuleParser } from './parsers/DataItemRule.ts'
export { DataItemRulesParser } from './parsers/DataItemRules.ts'
export * from './parsers/switch.ts'
export { default as createTargetingDescriptor } from './createTargetingDescriptor.ts'
export type { default as TargetingDescriptor } from './parsers/TargetingDescriptor.ts'
export type { default as TargetingPredicate } from './parsers/TargetingPredicate.ts'
export type { default as TargetingPredicates } from './parsers/TargetingPredicates.ts'
export { targetEquals } from './predicates/equals.ts'
export { targetIncludes } from './predicates/targetIncludes.ts'
export type { CreatableData } from './CreatableData.ts'
export type { InsertableData } from './InsertableData.ts'
export type { QueryableData } from './QueryableData.ts'
export type { StaticRecord } from './types.ts'

/**
 * Type helpers for the {@link Data} class.
 */
export type * as DT from './types/Data.ts'

/**
 * Type helers for fallthrough-targeting
 */
export type * as FTTT from './types/FallThroughTargeting.ts'

/**
 * Type helers for payloads
 */
export type * as PT from './types/Payload.ts'

/**
 * Type helpers for queries
 */
export type * as QT from './types/Query.ts'

/**
 * Type helpers for targeting
 */
export type * as TT from './types/Targeting.ts'
