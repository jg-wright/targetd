# Changelog

## [10.1.0](https://github.com/jg-wright/targetd/compare/@targetd/server-v10.0.1...@targetd/server-v10.1.0) (2026-07-15)


### Features

* **server:** configurable CORS ([65c94c1](https://github.com/jg-wright/targetd/commit/65c94c1796f59a7f1cbe39d053b80669e65a8b4f))


### Bug Fixes

* **client,server:** resolve fall-through rules with the original query ([c0cefb0](https://github.com/jg-wright/targetd/commit/c0cefb0a0a5c4fd9da05102ed94e278670d6762c))
* **server:** route reachability, schema-driven casting, safe errors ([ee53968](https://github.com/jg-wright/targetd/commit/ee53968958729d7d54a0fb497030768843a0ecf9))

## [10.0.1](https://github.com/jg-wright/targetd/compare/@targetd/server-v10.0.0...@targetd/server-v10.0.1) (2026-05-18)


### Bug Fixes

* **deps:** upgrade latest deps ([6af085a](https://github.com/jg-wright/targetd/commit/6af085ab8f4e24dc09d5dd038603d159e4f3b4ba))

## [10.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v9.0.0...@targetd/server-v10.0.0) (2026-04-23)


### ⚠ BREAKING CHANGES

* **api:** `.build()`, `BuiltDataSchema`, `DT.Meta`, and `DT.EmptyMeta` have been removed.

### Code Refactoring

* **api:** collapse DataSchema builder/built distinction and remove DT.Meta ([55e3108](https://github.com/johngeorgewright/targetd/commit/55e31087dbe6a1478297e6bd8814ff2dd9074509))

## [9.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.2.0...@targetd/server-v9.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* **api:** Data.create() now requires a BuiltDataSchema argument. The schema configuration methods (usePayload, useTargeting, useFallThroughTargeting) have moved from Data/PromisedData to DataSchema. The ConfigurableData interface and the DT.Assign* type helpers have been removed from the public API.

### Features

* **api:** move schema configuration into a DataSchema builder ([46d7572](https://github.com/johngeorgewright/targetd/commit/46d75723fe7fcde566ae75071d3ac601840e6c3a))

## [8.2.0](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.1.3...@targetd/server-v8.2.0) (2026-04-10)


### Features

* enhance error handling and add tests for matching payloads ([e64b177](https://github.com/johngeorgewright/targetd/commit/e64b177937abf21ded60b328755635c7aed93125))
* introduce data interfaces ([4dfe412](https://github.com/johngeorgewright/targetd/commit/4dfe412d206b1f5d0b09ea69286dbe6b93712fe2))
* introduce data interfaces ([885b546](https://github.com/johngeorgewright/targetd/commit/885b54638afbbcf46159dfaee6cdf069061ad7f0))

## [8.1.3](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.1.2...@targetd/server-v8.1.3) (2026-04-10)


### Bug Fixes

* **release:** update workspace imports during release ([aa1ad25](https://github.com/johngeorgewright/targetd/commit/aa1ad2525246866c2fa980af09218bc8c335320b))
* **release:** update workspace imports during release ([abbbd29](https://github.com/johngeorgewright/targetd/commit/abbbd2911178d9aba6a4a26f46bde15651be6137))
* **release:** update workspace imports during release ([26dfaee](https://github.com/johngeorgewright/targetd/commit/26dfaeeb261a18ee4c73f8b4c8b00d15f614cc30))
* update deno.json references from deno.jsonc to deno.json across multiple packages ([84ff5ae](https://github.com/johngeorgewright/targetd/commit/84ff5ae4affb577d2f5a71a60841682f8bcb1159))

## [8.1.2](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.1.1...@targetd/server-v8.1.2) (2026-02-13)


### Bug Fixes

* **docs:** add descriptions to package metadata and enhance type documentation across modules ([69dacea](https://github.com/johngeorgewright/targetd/commit/69dacea15345739c1fc612bf9895752de9ee69dd))

## [8.1.1](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.1.0...@targetd/server-v8.1.1) (2026-02-13)

### Bug Fixes

- **docs:** add comprehensive documentation and examples for Data API and
  targeting descriptors
  ([86545e9](https://github.com/johngeorgewright/targetd/commit/86545e96052bfeb67e281521b28dd33e9631fa65))

## [8.1.0](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v8.0.0...@targetd/server-v8.1.0) (2026-02-13)

### Features

- update server error handling and add validation error responses
  ([07ac201](https://github.com/johngeorgewright/targetd/commit/07ac201c309034723ccba0057103079c2ceee93c))

## [8.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/server-v7.0.2...@targetd/server-vv8.0.0) (2026-02-09)

### ⚠ BREAKING CHANGES

- Data generics have changed.

### Code Refactoring

- meta data typing
  ([abe3f25](https://github.com/johngeorgewright/targetd/commit/abe3f255b11075bd2b2b575de71df3e3deaa598c))
