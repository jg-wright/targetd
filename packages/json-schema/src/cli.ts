import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'
import { argv, cwd } from 'node:process'
import { dataJSONSchemas } from './index.ts'
import type { Data } from '@targetd/api'

const { dataExport, inputModule, outputFile } = await yargs()
  .usage('targetd-json-schema [args]')
  .options({
    dataExport: {
      alias: 'e',
      default: 'data',
      describe: 'The name of the data export from the `inputModule`',
      string: true,
    },
    inputModule: {
      alias: 'i',
      demandOption: true,
      describe: 'The input module, relative to the current working directory',
      string: true,
    },
    outputFile: {
      alias: 'o',
      describe:
        'When specified, the JSONSchema will be written to this file (relative to the current working directory).',
      string: true,
    },
  })
  .help()
  .parseAsync(hideBin(argv))

const input = await import(
  pathToFileURL(path.resolve(cwd(), inputModule)).href
)

const data = input[dataExport]
if (!isDataLike(data)) {
  throw new Error(
    `Export "${dataExport}" from "${inputModule}" is not of a \`Data\` type.`,
  )
}

const jsonSchema = JSON.stringify(dataJSONSchemas(data), null, 2)

if (outputFile) await writeFile(outputFile, jsonSchema)
else console.info(jsonSchema)

function isDataLike(x: unknown): x is Data {
  return typeof x === 'object' && x !== null && 'payloadParsers' in x &&
    'targetingParsers' in x
}
