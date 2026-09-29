/**
 * Lets plain `node` run this repository's TypeScript, and the Wildflower
 * packages' TypeScript sources it imports, without a build step — what Vitest
 * does for the tests, for the scripts.
 *
 * @remarks
 * Two synchronous module hooks:
 *
 * - **TypeScript.** Node's own type stripping handles only erasable syntax, and
 *   the Wildflower packages use constructor parameter properties, so `.ts`
 *   files are transformed with Oxc — `rolldown/utils`' `transformSync`, the
 *   transformer Vite+ itself uses.
 * - **CommonJS named exports.** A TypeScript module importing a CommonJS
 *   package by name (`import { parseDicom } from 'dicom-parser'`, a UMD
 *   bundle Node's export detection cannot read) gets an ES module wrapper
 *   exporting every property the package's `module.exports` has, as Vitest's
 *   `interopDefault` does.
 *
 * Pair it with `--conditions=source`, which resolves each Wildflower package
 * to its `source` export (`./src/index.ts`), as `vite.config.ts` does for the
 * tests:
 *
 * ```sh
 * node --conditions=source --import ./scripts/register-ts.ts scripts/emit.ts
 * ```
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { transformSync } from 'rolldown/utils'

const TYPESCRIPT = /\.[cm]?ts$/
const INTEROP_SCHEME = 'cjs-interop:'
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/** The `type` a `package.json` declares, read without trusting its shape. */
const packageTypeOf = (manifest: string): unknown => {
  const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
  return typeof parsed === 'object' && parsed !== null && 'type' in parsed ? parsed.type : undefined
}

/** Whether the file at `url` loads as CommonJS: `.cjs`, or `.js` under a package that is not `"type": "module"`. */
const isCommonJs = (url: string): boolean => {
  if (!url.startsWith('file:')) return false
  const fileName = fileURLToPath(url)
  if (fileName.endsWith('.cjs')) return true
  if (!fileName.endsWith('.js')) return false
  for (let directory = dirname(fileName); ; directory = dirname(directory)) {
    const manifest = join(directory, 'package.json')
    if (existsSync(manifest)) return packageTypeOf(manifest) !== 'module'
    if (dirname(directory) === directory) return true
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context)
    const fromTypeScript = context.parentURL !== undefined && TYPESCRIPT.test(context.parentURL)
    const commonJs =
      resolved.format === 'commonjs' || (resolved.format == null && isCommonJs(resolved.url))
    return fromTypeScript && commonJs
      ? { url: `${INTEROP_SCHEME}${resolved.url}`, format: 'module', shortCircuit: true }
      : resolved
  },
  load(url, context, nextLoad) {
    if (url.startsWith(INTEROP_SCHEME)) {
      const fileUrl = url.slice(INTEROP_SCHEME.length)
      const exported: unknown = createRequire(fileUrl)(fileURLToPath(fileUrl))
      const names = Object.keys(exported ?? {}).filter(
        (name) => IDENTIFIER.test(name) && name !== 'default'
      )
      const source = [
        `import { createRequire } from 'node:module'`,
        `const cjs = createRequire(${JSON.stringify(fileUrl)})(${JSON.stringify(fileURLToPath(fileUrl))})`,
        `export default cjs`,
        ...names.map((name) => `export const ${name} = cjs[${JSON.stringify(name)}]`),
      ].join('\n')
      return { format: 'module', source, shortCircuit: true }
    }
    if (!url.startsWith('file:') || !TYPESCRIPT.test(url)) return nextLoad(url, context)
    const fileName = fileURLToPath(url)
    const result = transformSync(fileName, readFileSync(fileName, 'utf8'), {
      lang: 'ts',
      sourceType: 'module',
    })
    if (result.errors.length > 0) {
      throw new Error(`${fileName}: ${result.errors.map((error) => error.message).join('\n')}`)
    }
    return { format: 'module', source: result.code, shortCircuit: true }
  },
})
