# Changelog

## [9.0.1](https://github.com/jg-wright/targetd/compare/@targetd/client-v9.0.0...@targetd/client-v9.0.1) (2026-05-18)


### Bug Fixes

* **deps:** upgrade latest deps ([6af085a](https://github.com/jg-wright/targetd/commit/6af085ab8f4e24dc09d5dd038603d159e4f3b4ba))

## [9.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v8.0.0...@targetd/client-v9.0.0) (2026-04-23)


### ⚠ BREAKING CHANGES

* **api:** `.build()`, `BuiltDataSchema`, `DT.Meta`, and `DT.EmptyMeta` have been removed.

### Code Refactoring

* **api:** collapse DataSchema builder/built distinction and remove DT.Meta ([55e3108](https://github.com/johngeorgewright/targetd/commit/55e31087dbe6a1478297e6bd8814ff2dd9074509))

## [8.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v7.1.0...@targetd/client-v8.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* **api:** Data.create() now requires a BuiltDataSchema argument. The schema configuration methods (usePayload, useTargeting, useFallThroughTargeting) have moved from Data/PromisedData to DataSchema. The ConfigurableData interface and the DT.Assign* type helpers have been removed from the public API.

### Features

* **api:** move schema configuration into a DataSchema builder ([46d7572](https://github.com/johngeorgewright/targetd/commit/46d75723fe7fcde566ae75071d3ac601840e6c3a))

## [7.1.0](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v7.0.3...@targetd/client-v7.1.0) (2026-04-10)


### Features

* enhance error handling and add tests for matching payloads ([e64b177](https://github.com/johngeorgewright/targetd/commit/e64b177937abf21ded60b328755635c7aed93125))
* introduce data interfaces ([4dfe412](https://github.com/johngeorgewright/targetd/commit/4dfe412d206b1f5d0b09ea69286dbe6b93712fe2))
* introduce data interfaces ([885b546](https://github.com/johngeorgewright/targetd/commit/885b54638afbbcf46159dfaee6cdf069061ad7f0))

## [7.0.3](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v7.0.2...@targetd/client-v7.0.3) (2026-04-10)


### Bug Fixes

* **release:** update workspace imports during release ([aa1ad25](https://github.com/johngeorgewright/targetd/commit/aa1ad2525246866c2fa980af09218bc8c335320b))
* **release:** update workspace imports during release ([abbbd29](https://github.com/johngeorgewright/targetd/commit/abbbd2911178d9aba6a4a26f46bde15651be6137))
* **release:** update workspace imports during release ([26dfaee](https://github.com/johngeorgewright/targetd/commit/26dfaeeb261a18ee4c73f8b4c8b00d15f614cc30))
* update deno.json references from deno.jsonc to deno.json across multiple packages ([84ff5ae](https://github.com/johngeorgewright/targetd/commit/84ff5ae4affb577d2f5a71a60841682f8bcb1159))

## [7.0.2](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v7.0.1...@targetd/client-v7.0.2) (2026-02-13)


### Bug Fixes

* **docs:** add descriptions to package metadata and enhance type documentation across modules ([69dacea](https://github.com/johngeorgewright/targetd/commit/69dacea15345739c1fc612bf9895752de9ee69dd))

## [7.0.1](https://github.com/johngeorgewright/targetd/compare/@targetd/client-v7.0.0...@targetd/client-v7.0.1) (2026-02-13)

### Bug Fixes

- **docs:** add comprehensive documentation and examples for Data API and
  targeting descriptors
  ([86545e9](https://github.com/johngeorgewright/targetd/commit/86545e96052bfeb67e281521b28dd33e9631fa65))

## [7.0.0](https://github.com/johngeorgewright/targetd/compare/@targetd/client-vv6.0.1...@targetd/client-vv7.0.0) (2026-02-09)

### ⚠ BREAKING CHANGES

- Data generics have changed.
- Data generics have changed.
- moving to jsr deployments
- DataParser --> PayloadParser
- `useDataParser` and `userDataParsers` have been combined in to `useData`
- Anything called "validator" is now a "parser"

### Features

- add ability to use multi targets
  ([1042c20](https://github.com/johngeorgewright/targetd/commit/1042c201a397f0354fca08ff06c17efa6529111f))
- **client:** allow objects in query
  ([b704e42](https://github.com/johngeorgewright/targetd/commit/b704e424e0fa6dae9352ca9acb1d07570ec4664b))
- converting everything to deno
  ([bf3b252](https://github.com/johngeorgewright/targetd/commit/bf3b25262c8c4c0a2522bdf663744b5386c49180))

### Bug Fixes

- **deps:** update dependency express to v4.18.3
  ([0a56fe9](https://github.com/johngeorgewright/targetd/commit/0a56fe9e09cdaa5b6cb98e9f30f12716aae162b8))
- **deps:** update dependency tslib to v2.6.3
  ([798c7a6](https://github.com/johngeorgewright/targetd/commit/798c7a69df162c0d977fb65b680d83c95323fd42))
- **deps:** update dependency tslib to v2.7.0
  ([95de94e](https://github.com/johngeorgewright/targetd/commit/95de94e43166bf40b8c3bd30407b80de2733741d))
- ensure workspace deps
  ([3fdd0ed](https://github.com/johngeorgewright/targetd/commit/3fdd0ed194009e22d82ed179b4b5bf9443eb7ffb))
- types
  ([d80cbba](https://github.com/johngeorgewright/targetd/commit/d80cbbaae80adac83486370b07b0a7e8445d5bd5))

### Performance Improvements

- reference required zod exports
  ([87bb323](https://github.com/johngeorgewright/targetd/commit/87bb323232899164cda2c873f8181cf323007c8f))

### Code Refactoring

- meta data typing
  ([a8d1d17](https://github.com/johngeorgewright/targetd/commit/a8d1d17b23c6e5321e5701489ca40ec6be6b8146))
- meta data typing
  ([abe3f25](https://github.com/johngeorgewright/targetd/commit/abe3f255b11075bd2b2b575de71df3e3deaa598c))
- rename dataparser to payloadparser
  ([52cd705](https://github.com/johngeorgewright/targetd/commit/52cd70579ddffba588bbb8b86029e2cc30441818))
- rename validators to parsers
  ([99c1014](https://github.com/johngeorgewright/targetd/commit/99c10142a0c716eb2c4a148a0f3561b85f222bc1))
- shortner api method names
  ([eb7c900](https://github.com/johngeorgewright/targetd/commit/eb7c9003c747c80236ec07d912850c8700eff350))
