# @targetd

A powerful, type-safe targeting and feature flag system for dynamically serving
different content based on query conditions.

## Overview

`@targetd` is a TypeScript-first monorepo providing a complete solution for
building context-aware applications with dynamic content delivery. Perfect for
feature flags, A/B testing, content personalization, and configuration
management.

**Key Features:**

- 🎯 **Type-safe targeting** - Full TypeScript inference and runtime validation
  with [Zod](https://zod.dev)
- ⚡ **High performance** - In-memory data store optimized for speed
- 🔌 **Modular architecture** - Use only what you need with focused packages
- 🌐 **HTTP-ready** - Built-in server and client for distributed systems
- 📁 **File-based rules** - Load rules from JSON/YAML files with hot-reloading
- 🎨 **Extensible** - Custom targeting descriptors and predicates

## Packages

### [@targetd/api](./packages/api)

Core targeting and data querying API. Define payloads, targeting rules, and
query logic.

```typescript
import { Data, DataSchema, targetIncludes } from '@targetd/api'
import { z } from 'zod'

const schema = DataSchema.create()
  .usePayload({ greeting: z.string() })
  .useTargeting({ country: targetIncludes(z.string()) })

const data = await Data.create(schema).addRules('greeting', [
  { targeting: { country: ['US'] }, payload: 'Hello!' },
  { targeting: { country: ['ES'] }, payload: '¡Hola!' },
  { payload: 'Hi!' },
])

await data.getPayload('greeting', { country: 'US' }) // 'Hello!'
```

**[View Documentation →](./packages/api)**

### [@targetd/server](./packages/server)

HTTP server for exposing `@targetd/api` data over REST endpoints.

```typescript
import { createServer } from '@targetd/server'

createServer(data).listen(3000)
// GET /greeting?country=US → "Hello!"
```

**[View Documentation →](./packages/server)**

### [@targetd/client](./packages/client)

Type-safe HTTP client for querying `@targetd/server` instances.

```typescript
import { Client } from '@targetd/client'

const client = await Client.create('http://localhost:3000', schema)
const greeting = await client.getPayload('greeting', { country: 'US' })
```

**[View Documentation →](./packages/client)**

### [@targetd/fs](./packages/fs)

Load targeting rules from JSON/YAML files with hot-reloading support.

```typescript
import { load, watch } from '@targetd/fs'

const data = await load(baseData, './rules')
watch(baseData, './rules', (error, updatedData) => {
  // Rules automatically reload on file changes
})
```

**[View Documentation →](./packages/fs)**

### [@targetd/date-range](./packages/date-range)

Built-in targeting descriptor for date range queries.

```typescript
import dateRangeTargeting from '@targetd/date-range'

const schema = DataSchema.create()
  .usePayload({ campaign: z.string() })
  .useTargeting({ date: dateRangeTargeting })

const data = await Data.create(schema).addRules('campaign', [
  {
    targeting: { date: { start: '2024-12-01', end: '2024-12-31' } },
    payload: 'Holiday Campaign',
  },
])
```

**[View Documentation →](./packages/date-range)**

### [@targetd/explode](./packages/explode)

Transform flat key notation to nested objects.

```typescript
import { explode } from '@targetd/explode'

explode({ 'user.name': 'John' })
// { user: { name: 'John' } }
```

**[View Documentation →](./packages/explode)**

### [@targetd/json-schema](./packages/json-schema)

Generate JSON Schema from Zod schemas for documentation and validation.

**[View Documentation →](./packages/json-schema)**

## Quick Start

### Installation

```bash
# Core API
npm install zod && npx jsr add @targetd/api

# With server and client
npx jsr add @targetd/api @targetd/server @targetd/client

# With file loading
npx jsr add @targetd/api @targetd/fs
```

### Basic Example

**1. Define your data:**

```typescript
import { Data, DataSchema, targetIncludes } from '@targetd/api'
import { z } from 'zod'

const schema = DataSchema.create()
  .usePayload({
    banner: z.string(),
    feature: z.object({
      enabled: z.boolean(),
      maxUsers: z.number(),
    }),
  })
  .useTargeting({
    platform: targetIncludes(z.string()),
    isPremium: targetIncludes(z.boolean()),
  })

export const data = await Data.create(schema)
  .addRules('banner', [
    { targeting: { platform: ['mobile'] }, payload: '📱 Mobile Banner' },
    { targeting: { platform: ['desktop'] }, payload: '🖥 Desktop Banner' },
    { payload: 'Default Banner' },
  ])
  .addRules('feature', [
    {
      targeting: { isPremium: [true] },
      payload: { enabled: true, maxUsers: 1000 },
    },
    { payload: { enabled: true, maxUsers: 10 } },
  ])
```

**2. Start a server:**

```typescript
import { createServer } from '@targetd/server'
import { data } from './data.ts'

createServer(data).listen(3000)
```

**3. Query from a client:**

```typescript
import { Client } from '@targetd/client'
import { data } from './data.ts'

const client = new Client('http://localhost:3000', data)

// Type-safe queries
const banner = await client.getPayload('banner', { platform: 'mobile' })
const allPayloads = await client.getPayloadForEachName({ isPremium: true })
```

## Use Cases

### Feature Flags

```typescript
const data = await Data.create(
  DataSchema.create()
    .usePayload({ newFeature: z.boolean() })
    .useTargeting({ userTier: targetEquals(z.string()) }),
).addRules('newFeature', [
  { targeting: { userTier: 'beta' }, payload: true },
  { payload: false },
])
```

### A/B Testing

```typescript
const data = await Data.create(
  DataSchema.create()
    .usePayload({ variant: z.string() })
    .useTargeting({ userId: targetIncludes(z.string()) }),
).addRules('variant', [
  { targeting: { userId: experimentGroup }, payload: 'variant-a' },
  { payload: 'variant-b' },
])
```

### Content Personalization

```typescript
const data = await Data.create(
  DataSchema.create()
    .usePayload({ content: z.string() })
    .useTargeting({
      region: targetIncludes(z.string()),
      language: targetIncludes(z.string()),
    }),
).addRules('content', [
  {
    targeting: { region: ['US'], language: ['en'] },
    payload: 'US English content',
  },
  {
    targeting: { region: ['US'], language: ['es'] },
    payload: 'US Spanish content',
  },
  { payload: 'Default content' },
])
```

### Configuration Management

```typescript
const data = await Data.create(
  DataSchema.create()
    .usePayload({
      config: z.object({
        apiUrl: z.string(),
        timeout: z.number(),
      }),
    })
    .useTargeting({ environment: targetEquals(z.string()) }),
).addRules('config', [
  {
    targeting: { environment: 'production' },
    payload: { apiUrl: 'https://api.prod.com', timeout: 5000 },
  },
  {
    targeting: { environment: 'staging' },
    payload: { apiUrl: 'https://api.staging.com', timeout: 10000 },
  },
  { payload: { apiUrl: 'http://localhost:3000', timeout: 30000 } },
])
```

## Core Concepts

### Schema Configuration

Use `DataSchema` to declare payload schemas and targeting descriptors, then pass
the resulting schema directly to `Data.create()`. Splitting the schema and data
phases keeps TypeScript compilation cheap even with hundreds of payloads and
targeting descriptors.

### Payloads

Define what data you want to serve using Zod schemas.

### Targeting

Specify conditions that determine which payload to serve using predicates like
`targetIncludes` and `targetEquals`, or create custom ones.

### Rules

Map targeting conditions to payloads. Rules are evaluated in order—first match
wins.

### Variables

Reusable values with their own targeting rules that can be referenced in
payloads using `{{variableName}}` syntax.

### Fall-through Targeting

Pass unresolved targeting conditions between services for evaluation in
distributed systems.

## Architecture

```
┌─────────────────┐
│   @targetd/api  │  Core targeting engine
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌─▼──────────┐
│ server │ │ file loaders│
└───┬────┘ └────────────┘
    │
┌───▼────┐
│ client │
└────────┘
```

## Documentation

- [API Documentation](./packages/api/README.md)
- [Server Documentation](./packages/server/README.md)
- [Client Documentation](./packages/client/README.md)
- [File System Loader Documentation](./packages/fs/README.md)
- [Date Range Targeting Documentation](./packages/date-range/README.md)
- [Explode Utility Documentation](./packages/explode/README.md)
- [JSON Schema Documentation](./packages/json-schema/README.md)

## Contributing

This is a monorepo managed with
[Deno workspaces](https://deno.land/manual/basics/workspaces).

### Development

```bash
# Install dependencies
deno install

# Run tests
deno task test

# Run tests for specific package
cd packages/api && deno task test
```

## License

See individual package LICENSE files for details.
