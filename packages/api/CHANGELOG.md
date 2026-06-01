# Changelog

## [10.0.2](https://github.com/jg-wright/targetd/compare/@targetd/api-v10.0.1...@targetd/api-v10.0.2) (2026-06-01)


### Bug Fixes

* **api:** preserve optional payload properties through variable resolver ([e595f71](https://github.com/jg-wright/targetd/commit/e595f71ffd1f6372ae6284b9b17fe54243527c57))

## [10.0.1](https://github.com/jg-wright/targetd/compare/@targetd/api-v10.0.0...@targetd/api-v10.0.1) (2026-05-18)


### Bug Fixes

* **deps:** upgrade latest deps ([6af085a](https://github.com/jg-wright/targetd/commit/6af085ab8f4e24dc09d5dd038603d159e4f3b4ba))

## [10.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v9.0.0...@targetd/api-v10.0.0) (2026-04-23)


### ⚠ BREAKING CHANGES

* **api:** `.build()`, `BuiltDataSchema`, `DT.Meta`, and `DT.EmptyMeta` have been removed.

### Code Refactoring

* **api:** collapse DataSchema builder/built distinction and remove DT.Meta ([55e3108](https://github.com/johngeorgewright/targetd/commit/55e31087dbe6a1478297e6bd8814ff2dd9074509))

## [9.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.2.1...@targetd/api-v9.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* **api:** Data.create() now requires a BuiltDataSchema argument. The schema configuration methods (usePayload, useTargeting, useFallThroughTargeting) have moved from Data/PromisedData to DataSchema. The ConfigurableData interface and the DT.Assign* type helpers have been removed from the public API.

### Features

* **api:** move schema configuration into a DataSchema builder ([46d7572](https://github.com/johngeorgewright/targetd/commit/46d75723fe7fcde566ae75071d3ac601840e6c3a))

## [8.2.1](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.2.0...@targetd/api-v8.2.1) (2026-04-10)


### Bug Fixes

* simplify requiresQuery assignment and update Any type to use any for parser definitions ([be29759](https://github.com/johngeorgewright/targetd/commit/be29759a1f76e3e9033fa352fa8471fda22d532d))
* update Any type to use Record for parser definitions ([cdf9866](https://github.com/johngeorgewright/targetd/commit/cdf98666ee006d6d07846eb1327155863be1aba8))

## [8.2.0](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.1.2...@targetd/api-v8.2.0) (2026-04-10)


### Features

* introduce data interfaces ([4dfe412](https://github.com/johngeorgewright/targetd/commit/4dfe412d206b1f5d0b09ea69286dbe6b93712fe2))
* introduce data interfaces ([885b546](https://github.com/johngeorgewright/targetd/commit/885b54638afbbcf46159dfaee6cdf069061ad7f0))


### Bug Fixes

* export Merge type from util.ts ([a9fdfb3](https://github.com/johngeorgewright/targetd/commit/a9fdfb385714a39095b64f61e963e22b03883a3e))

## [8.1.2](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.1.1...@targetd/api-v8.1.2) (2026-04-10)


### Bug Fixes

* add type annotation for ZodSwitch constructor ([acd7d07](https://github.com/johngeorgewright/targetd/commit/acd7d07cff7b39d3689fe3e0159ffa1eb820ae7f))
* handle unmatched conditions in ZodSwitch parser ([51a0fae](https://github.com/johngeorgewright/targetd/commit/51a0faebce0ebcc9ce7d598ea9f72f789e15b708))
* update deno.json references from deno.jsonc to deno.json across multiple packages ([db89eca](https://github.com/johngeorgewright/targetd/commit/db89ecaa87845949a5de27f3316806c07a6fc578))


### Performance Improvements

* replace object merging logic with Merge utility type ([7f1c984](https://github.com/johngeorgewright/targetd/commit/7f1c984e58a212dc891bd0cce2efbb672336d5fe))

## [8.1.1](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.1.0...@targetd/api-v8.1.1) (2026-03-15)


### Bug Fixes

* correct switch parsing ([fb194fb](https://github.com/johngeorgewright/targetd/commit/fb194fb68d6bd4f66509a5ed78c43a4670789907))
* customise message ([67f0a64](https://github.com/johngeorgewright/targetd/commit/67f0a64af846ca1e1c098f05ec039ac7c12ed963))
* variable error path ([7a3bd41](https://github.com/johngeorgewright/targetd/commit/7a3bd4121a8749c95f59491a0fb5afc19ab19ad4))

## [8.1.0](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.0.3...@targetd/api-v8.1.0) (2026-03-14)


### Features

* variables in nested records and arrays ([8e4e4d2](https://github.com/johngeorgewright/targetd/commit/8e4e4d288d42d5c79b5ccb08ea14f6d603776630))
* variables in nested records and arrays ([b86dd5a](https://github.com/johngeorgewright/targetd/commit/b86dd5ac55b8401c4ffd27b079425ef02c51164f))


### Bug Fixes

* attach variables to existing schemas ([a606e6b](https://github.com/johngeorgewright/targetd/commit/a606e6bba16fdc569bc15da35c114f8a61fbcb61))
* mutations of recursive variable resolvers ([59e2214](https://github.com/johngeorgewright/targetd/commit/59e22143c59d8e0bf7f5a5727e7e7fc7cd8fe1e8))
* recursively resolve array variables ([1481453](https://github.com/johngeorgewright/targetd/commit/14814537cbe1ed48f353811247fe2bbacae91997))

## [8.0.3](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.0.2...@targetd/api-v8.0.3) (2026-02-13)


### Bug Fixes

* export required references ([7012ea8](https://github.com/johngeorgewright/targetd/commit/7012ea81fbe0022d3ae6f7efab02ef654ba77f3c))

## [8.0.2](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.0.1...@targetd/api-v8.0.2) (2026-02-13)


### Bug Fixes

* **api:** safeextend when attaching variable schemas ([54de23c](https://github.com/johngeorgewright/targetd/commit/54de23ceffda120f20da69116454a91b19bd176a))
* **api:** safeextend when attaching variable schemas ([7283b64](https://github.com/johngeorgewright/targetd/commit/7283b6499eba602234d2aacde07f09da0943d023))
* **docs:** add descriptions to package metadata and enhance type documentation across modules ([69dacea](https://github.com/johngeorgewright/targetd/commit/69dacea15345739c1fc612bf9895752de9ee69dd))

## [8.0.1](https://github.com/johngeorgewright/targetd/compare/@targetd/api-v8.0.0...@targetd/api-v8.0.1) (2026-02-13)

### Bug Fixes

- **docs:** add comprehensive documentation and examples for Data API and
  targeting descriptors
  ([86545e9](https://github.com/johngeorgewright/targetd/commit/86545e96052bfeb67e281521b28dd33e9631fa65))
