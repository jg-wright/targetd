# @targetd/redis

Load, save and watch [@targetd/api](https://jsr.io/@targetd/api) rules from
Redis, with pub/sub hot-reloading via keyspace notifications.

## Installation

| JS Runtime | Command                                        |
| ---------- | ---------------------------------------------- |
| Node.js    | `npx jsr add @targetd/api @targetd/redis`      |
| Bun        | `bunx jsr add @targetd/api @targetd/redis`     |
| Deno       | `deno add jsr:@targetd/api jsr:@targetd/redis` |

You also need a Redis client. The examples use
[node-redis](https://github.com/redis/node-redis) (`npm:redis`), but any client
that structurally satisfies the exported `RedisClient` interface works.

## Overview

`@targetd/redis` stores each payload's rules under a single Redis key
(`targetd:<payloadName>` by default) as a JSON value. The targeting engine still
runs in-memory inside `@targetd/api` — Redis is only responsible for
**persistence** and **change notification**:

- **`load`** — hydrate a `Data` instance from Redis.
- **`save` / `remove`** — persist or delete a payload's rules.
- **`watch`** — subscribe to keyspace notifications and reload on change.

Because every reload is a full reload (not a delta), a briefly missed
notification is self-healing: the next change reloads everything.

## Stored value format

Each key holds the same shape used by `@targetd/fs` files — either an array of
rules or an object with `rules` (and optional `variables`):

```jsonc
// key: targetd:greeting
{
  "rules": [
    { "targeting": { "country": ["US"] }, "payload": "Hello!" },
    { "payload": "Hi!" }
  ]
}
```

## Basic usage

```ts
import { createClient } from 'redis'
import { Data, DataSchema, targetIncludes } from '@targetd/api'
import { load, save, watch } from '@targetd/redis'
import { z } from 'zod'

const redis = createClient()
await redis.connect()

const baseData = await Data.create(
  DataSchema.create()
    .usePayload({ greeting: z.string() })
    .useTargeting({ country: targetIncludes(z.string()) }),
)

// Persist some rules.
await save(redis, {
  greeting: {
    rules: [
      { targeting: { country: ['US'] }, payload: 'Hello!' },
      { payload: 'Hi!' },
    ],
  },
})

// Load them into a Data instance.
const data = await load(baseData, redis)

await data.getPayload('greeting', { country: 'US' }) // 'Hello!'
await data.getPayload('greeting') // 'Hi!'
```

## Hot reloading

`watch` opens a dedicated subscriber connection (a duplicate of the client) and
reloads whenever a key under the prefix changes:

```ts
let currentData = baseData

const stop = await watch(baseData, redis, (error, data) => {
  if (error) console.error('Failed to reload rules:', error)
  else currentData = data
})

// Any `save`/`remove` (from this or another process) triggers a reload.
await save(redis, { greeting: { rules: [{ payload: 'Hey!' }] } })

// Later:
await stop()
```

### Keyspace notifications

`watch` requires Redis
[keyspace notifications](https://redis.io/docs/latest/develop/use/keyspace-notifications/).
By default it runs `CONFIG SET notify-keyspace-events KEA` on startup. If your
server already has them enabled, or forbids `CONFIG SET` (common on managed
Redis), pass `configureNotifications: false` and configure the server directly:

```ts
const stop = await watch(
  baseData,
  redis,
  { configureNotifications: false, db: 0 },
  (error, data) => {/* ... */},
)
```

## Options

Both `load` and `watch` accept a `keyPrefix` (default `targetd:`). `watch`
additionally accepts:

| Option                   | Default      | Description                                         |
| ------------------------ | ------------ | --------------------------------------------------- |
| `keyPrefix`              | `'targetd:'` | Prefix for keys holding rules.                      |
| `db`                     | `0`          | Logical DB index for keyspace notification channel. |
| `debounceMS`             | `300`        | Debounce window for change events before reloading. |
| `configureNotifications` | `true`       | Enable notifications via `CONFIG SET` on startup.   |

## License

MIT
