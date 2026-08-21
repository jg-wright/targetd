#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Dev helper for consuming this checkout from non-Deno projects (e.g. Bun).
 *
 * `deno install --node-modules-dir=auto` materialises a `node_modules/` that
 * covers every npm-sourced dependency under its bare name — but it leaves
 * JSR-sourced deps inside the internal `.deno/` store, unreachable by the
 * bare specifier our source imports them with. This bridges those with a
 * scoped symlink so Node/Bun resolution can find them.
 *
 * Usually run via the task, which does the install + link together:
 *   deno task link:node
 *
 * Or standalone, after a `deno install --node-modules-dir=auto`:
 *   deno run -A scripts/link-jsr-node-modules.ts
 */
// deno-lint-ignore no-import-prefix
import { dirname, fromFileUrl, join } from 'jsr:@std/path@^1'

// JSR specifier as imported in source  ->  package name inside the .deno store.
const JSR_DEPS: Record<string, string> = {
  '@es-toolkit/es-toolkit': 'es-toolkit',
}

const root = dirname(dirname(fromFileUrl(import.meta.url)))
const nm = join(root, 'node_modules')
const store = join(nm, '.deno')

for (const [specifier, storeName] of Object.entries(JSR_DEPS)) {
  const storeDir = findStoreDir(storeName)
  if (!storeDir) {
    console.warn(`skip ${specifier}: no ${storeName}@* in ${store}`)
    continue
  }
  const linkPath = join(nm, ...specifier.split('/'))
  await Deno.mkdir(dirname(linkPath), { recursive: true })
  await Deno.remove(linkPath).catch(() => {})
  await Deno.symlink(storeDir, linkPath)
  console.log(`linked ${specifier} -> ${storeDir}`)
}

function findStoreDir(storeName: string): string | undefined {
  for (const entry of Deno.readDirSync(store)) {
    if (entry.name.startsWith(`${storeName}@`)) {
      return join(store, entry.name, 'node_modules', storeName)
    }
  }
}
