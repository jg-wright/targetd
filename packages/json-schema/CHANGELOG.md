# Changelog

## [7.0.2](https://github.com/jg-wright/targetd/compare/@targetd/json-schema-v7.0.1...@targetd/json-schema-v7.0.2) (2026-07-15)


### Bug Fixes

* **json-schema:** strip runtime binary from CLI argv; rewrite README ([b6dcfb3](https://github.com/jg-wright/targetd/commit/b6dcfb33bb7bf2413b77d1230e69f9558f3f50b3))

## [7.0.1](https://github.com/jg-wright/targetd/compare/@targetd/json-schema-v7.0.0...@targetd/json-schema-v7.0.1) (2026-05-18)


### Bug Fixes

* **deps:** upgrade latest deps ([6af085a](https://github.com/jg-wright/targetd/commit/6af085ab8f4e24dc09d5dd038603d159e4f3b4ba))

## [7.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v6.0.0...@targetd/json-schema-v7.0.0) (2026-04-23)


### ⚠ BREAKING CHANGES

* **api:** `.build()`, `BuiltDataSchema`, `DT.Meta`, and `DT.EmptyMeta` have been removed.

### Code Refactoring

* **api:** collapse DataSchema builder/built distinction and remove DT.Meta ([55e3108](https://github.com/johngeorgewright/targetd/commit/55e31087dbe6a1478297e6bd8814ff2dd9074509))

## [6.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v5.2.1...@targetd/json-schema-v6.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* **api:** Data.create() now requires a BuiltDataSchema argument. The schema configuration methods (usePayload, useTargeting, useFallThroughTargeting) have moved from Data/PromisedData to DataSchema. The ConfigurableData interface and the DT.Assign* type helpers have been removed from the public API.

### Features

* **api:** move schema configuration into a DataSchema builder ([46d7572](https://github.com/johngeorgewright/targetd/commit/46d75723fe7fcde566ae75071d3ac601840e6c3a))

## [5.2.1](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v5.2.0...@targetd/json-schema-v5.2.1) (2026-04-10)


### Bug Fixes

* **release:** update workspace imports during release ([aa1ad25](https://github.com/johngeorgewright/targetd/commit/aa1ad2525246866c2fa980af09218bc8c335320b))
* **release:** update workspace imports during release ([abbbd29](https://github.com/johngeorgewright/targetd/commit/abbbd2911178d9aba6a4a26f46bde15651be6137))
* **release:** update workspace imports during release ([26dfaee](https://github.com/johngeorgewright/targetd/commit/26dfaeeb261a18ee4c73f8b4c8b00d15f614cc30))
* update deno.json references from deno.jsonc to deno.json across multiple packages ([84ff5ae](https://github.com/johngeorgewright/targetd/commit/84ff5ae4affb577d2f5a71a60841682f8bcb1159))

## [5.2.0](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v5.1.0...@targetd/json-schema-v5.2.0) (2026-03-14)


### Features

* variables in nested records and arrays ([8e4e4d2](https://github.com/johngeorgewright/targetd/commit/8e4e4d288d42d5c79b5ccb08ea14f6d603776630))


### Bug Fixes

* attach variables to existing schemas ([a606e6b](https://github.com/johngeorgewright/targetd/commit/a606e6bba16fdc569bc15da35c114f8a61fbcb61))
* export ToJSONSchemaParams ([36601e9](https://github.com/johngeorgewright/targetd/commit/36601e9fca505cac0296690cbff313d38f4e9995))
* mutations of recursive variable resolvers ([59e2214](https://github.com/johngeorgewright/targetd/commit/59e22143c59d8e0bf7f5a5727e7e7fc7cd8fe1e8))

## [5.1.0](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v5.0.1...@targetd/json-schema-v5.1.0) (2026-03-13)


### Features

* overridable tojson params ([f0cdd0a](https://github.com/johngeorgewright/targetd/commit/f0cdd0ae12a6b55d283bfb9714ba060d670a3c1a))


### Bug Fixes

* attempt to fix jsr problems ([b14b47f](https://github.com/johngeorgewright/targetd/commit/b14b47fafa1bfdc2930cff002faad20edbd794b8))
* json schema additions ([8196c9a](https://github.com/johngeorgewright/targetd/commit/8196c9aa0dc94d35ca827ca62114c93f20497620))

## [5.0.1](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v5.0.0...@targetd/json-schema-v5.0.1) (2026-02-13)


### Bug Fixes

* **docs:** add descriptions to package metadata and enhance type documentation across modules ([69dacea](https://github.com/johngeorgewright/targetd/commit/69dacea15345739c1fc612bf9895752de9ee69dd))

## [5.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/json-schema-v4.2.2...@targetd/json-schema-vv5.0.0) (2026-02-09)


### ⚠ BREAKING CHANGES

* Data generics have changed.

### Reverts

* major import without breaking change ([6745423](https://github.com/johngeorgewright/targetd/commit/6745423576bfa0afe8805e54efe6e63f15b13411))


### Miscellaneous Chores

* @targetd/api@8 ([7e48e8b](https://github.com/johngeorgewright/targetd/commit/7e48e8b24e22d546decce24a51c4db24242b1621))
