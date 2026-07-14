# @targetd/json-schema

> Creates JSON Schema from targetd data objects

Generate a [JSON Schema](https://json-schema.org) describing the rule files
accepted by a `Data` instance — useful for editor autocompletion and validation
of your rule JSON/YAML files (for example with `@targetd/fs`).

## API

```typescript
import { Data, DataSchema, targetIncludes } from '@targetd/api'
import { dataJSONSchema, dataJSONSchemas } from '@targetd/json-schema'
import { z } from 'zod'

const data = await Data.create(
  DataSchema.create()
    .usePayload({ greeting: z.string() })
    .useTargeting({ country: targetIncludes(z.string()) }),
)

// A schema describing every payload's rules
const schema = dataJSONSchemas(data)

// ...or the rules of a single payload
const greetingSchema = dataJSONSchema(data, 'greeting')
```

## CLI

Generates the schema from a module that exports a `Data` instance.

```sh
deno run --allow-read --allow-write jsr:@targetd/json-schema/cli \
  --inputModule src/data.ts \
  --dataExport data \
  --outputFile src/data.schema.json
```

| Option          | Alias | Description                                                            |
| --------------- | ----- | ---------------------------------------------------------------------- |
| `--inputModule` | `-i`  | Module to import, relative to the current working directory (required) |
| `--dataExport`  | `-e`  | Name of the `Data` export in that module (default: `data`)             |
| `--outputFile`  | `-o`  | File to write to; prints to stdout when omitted                        |

Reference the generated schema from your rule files:

```yaml
# yaml-language-server: $schema=./data.schema.json
greeting:
  rules:
    - targeting:
        country: [US]
      payload: Hello!
    - payload: Hi!
```
