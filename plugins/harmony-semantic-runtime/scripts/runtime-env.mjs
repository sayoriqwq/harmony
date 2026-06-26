#!/usr/bin/env node
import { createHash } from 'node:crypto'
import Fs from 'node:fs'
import { createRequire } from 'node:module'
import Path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)
const scriptDir = Path.dirname(scriptFile)
const defaultPluginRoot = Path.resolve(scriptDir, '..')

let cachedRepoRoot

function pluginRoot() {
  return Path.resolve(process.env.PLUGIN_ROOT ?? process.env.extensionPath ?? defaultPluginRoot)
}

function safeReadJson(path) {
  try {
    return JSON.parse(Fs.readFileSync(path, 'utf8'))
  }
  catch {
    return undefined
  }
}

function hasHarmonyRuntime(root) {
  return Fs.existsSync(Path.join(root, 'packages/headless-runtime/src/runtime/semantic-runtime-facade.ts'))
    && Fs.existsSync(Path.join(root, 'packages/semantic-model/src/schema/host-event.ts'))
}

function findRepoRootFrom(start) {
  let current = Path.resolve(start)
  while (true) {
    const packageJson = safeReadJson(Path.join(current, 'package.json'))
    if (packageJson?.name === 'harmony' && hasHarmonyRuntime(current)) {
      return current
    }
    const parent = Path.dirname(current)
    if (parent === current) {
      return undefined
    }
    current = parent
  }
}

function repoRoot() {
  if (cachedRepoRoot !== undefined) {
    return cachedRepoRoot
  }

  const candidates = [
    process.env.HARMONY_REPO_ROOT,
    process.cwd(),
    pluginRoot(),
    Path.resolve(pluginRoot(), '../..'),
  ].filter(value => typeof value === 'string' && value.length > 0)

  for (const candidate of candidates) {
    const root = findRepoRootFrom(candidate)
    if (root !== undefined) {
      cachedRepoRoot = root
      return cachedRepoRoot
    }
  }

  throw new Error(
    'Harmony repo root not found. Start Codex in the harmony repo or set HARMONY_REPO_ROOT.',
  )
}

function repoRequire() {
  return createRequire(Path.join(repoRoot(), 'package.json'))
}

export async function importFromRepo(specifier) {
  const resolved = repoRequire().resolve(specifier)
  return import(pathToFileURL(resolved).href)
}

export async function importHeadlessRuntime(relativePath) {
  return import(pathToFileURL(Path.join(repoRoot(), 'packages/headless-runtime/src/runtime', relativePath)).href)
}

export async function importSemanticSchema(relativePath) {
  return import(pathToFileURL(Path.join(repoRoot(), 'packages/semantic-model/src/schema', relativePath)).href)
}

export async function runEffect(effect, layer) {
  const { Effect } = await importFromRepo('effect')
  const program = layer === undefined ? effect : effect.pipe(Effect.provide(layer))
  return Effect.runPromise(program)
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let input = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      input += chunk
    })
    process.stdin.on('end', () => resolve(input))
    process.stdin.on('error', reject)
  })
}

export async function readStdinJson() {
  const input = (await readStdin()).trim()
  if (input.length === 0) {
    return undefined
  }
  return JSON.parse(input)
}

export function unwrapHostFixture(value) {
  if (value !== null && typeof value === 'object' && value.fixtureKind === 'codex-host-event-fixture') {
    return {
      payload: value.payload,
      runtime: value.runtime ?? {},
    }
  }
  return {
    payload: value,
    runtime: {},
  }
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function safeLabel(value) {
  const label = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return label.length === 0 ? 'project' : label
}

function realpathOrResolve(path) {
  try {
    return Fs.realpathSync(path)
  }
  catch {
    return Path.resolve(path)
  }
}

export function dataRoot(runtime = {}) {
  const root = process.env.HARMONY_SEMANTIC_DATA_ROOT
    ?? process.env.PLUGIN_DATA
    ?? runtime.pluginData
    ?? Path.join(pluginRoot(), '.data')

  return Path.resolve(root)
}

function projectRootForCwd(cwd) {
  return findRepoRootFrom(cwd) ?? realpathOrResolve(cwd)
}

export function projectRefForCwd(cwd) {
  const canonicalRoot = projectRootForCwd(cwd)
  const projectRef = {
    projectId: process.env.HARMONY_SEMANTIC_PROJECT_ID
      ?? `project:${safeLabel(Path.basename(canonicalRoot))}-${digest(canonicalRoot)}`,
    canonicalRoot,
  }
  const worktreeId = process.env.HARMONY_SEMANTIC_WORKTREE_ID
  return worktreeId === undefined || worktreeId.length === 0
    ? projectRef
    : { ...projectRef, worktreeId }
}

export function projectRefInputForCwd(cwd) {
  const projectRef = projectRefForCwd(cwd)
  return {
    project_id: projectRef.projectId,
    canonical_root: projectRef.canonicalRoot,
    ...(projectRef.worktreeId !== undefined ? { worktree_id: projectRef.worktreeId } : {}),
  }
}

export function isManagedProject(cwd) {
  if (process.env.HARMONY_SEMANTIC_MANAGED === '1') {
    return true
  }
  if (process.env.HARMONY_SEMANTIC_MANAGED === '0') {
    return false
  }
  return projectRootForCwd(cwd) === repoRoot()
}

export function requestId(prefix, parts) {
  return `request:${prefix}-${digest(parts.map(part => String(part ?? '')).join('\n'))}`
}

export function operationId(prefix, parts) {
  return `operation:${prefix}-${digest(parts.map(part => String(part ?? '')).join('\n'))}`
}

export function json(value) {
  return JSON.stringify(value, null, 2)
}

export function stderrLine(message) {
  process.stderr.write(`${message}\n`)
}

export function causeMessage(cause) {
  if (cause instanceof Error && cause.stack !== undefined) {
    return cause.stack
  }
  if (cause instanceof Error) {
    return cause.message
  }
  return String(cause)
}

export function hookContext(title, fields) {
  const lines = [`${title}:`]
  for (const [key, value] of fields) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    lines.push(`- ${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
  }
  return lines.join('\n')
}
