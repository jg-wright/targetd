import config from '@commitlint/config-conventional'
import { UserConfig } from '@commitlint/types'

// Import the shared config directly instead of `extends`: commitlint resolves
// `extends` strings with a CJS require.resolve that cannot resolve
// conventional-changelog-conventionalcommits' import-only exports map under
// Deno. The parser preset is omitted for the same reason; commitlint's
// default conventional-commits parser covers these rules.
export default {
  rules: config.rules,
} satisfies UserConfig
