// Run from any directory: node scripts/verify.mjs --install --e2e
// No third-party dependencies are required by this orchestrator.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const reports = join(root, 'reports')
const output = join(reports, 'local-verification')
mkdirSync(output, { recursive: true })
mkdirSync(join(root, 'bin'), { recursive: true })
const flags = new Set(process.argv.slice(2))
const known = new Set(['--install', '--e2e', '--race', '--backend-only', '--help'])
for (const flag of flags) {
  if (!known.has(flag)) { console.error(`Unknown option: ${flag}`); process.exit(2) }
}
if (flags.has('--help')) {
  console.log('Usage: node scripts/verify.mjs [--install] [--e2e] [--race] [--backend-only]')
  console.log('--install generates a missing npm lockfile before the clean install. Commit that file.')
  console.log('--e2e installs Chromium and tests the production frontend against the real Go API.')
  process.exit(0)
}
if (flags.has('--backend-only') && (flags.has('--install') || flags.has('--e2e'))) {
  console.error('--backend-only cannot be combined with frontend options.'); process.exit(2)
}
const report = { startedAt: new Date().toISOString(), node: process.version, options: [...flags], steps: [], status: 'running' }

function run(name, command, args, directory = root, requireEmptyOutput = false) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: directory, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
    shell: process.platform === 'win32' && command === 'npm',
  })
  const text = (result.stdout ?? '') + (result.stderr ?? '') + (result.error ? `\n${result.error.message}\n` : '')
  process.stdout.write(text)
  writeFileSync(join(output, `${name}.txt`), text)
  const passed = result.status === 0 && (!requireEmptyOutput || !text.trim())
  report.steps.push({ name, command: [command, ...args], exitCode: result.status, passed })
  if (!passed) throw new Error(`${name} did not pass. See reports/local-verification/${name}.txt`)
  return text
}

try {
  const backend = join(root, 'backend')
  const frontend = join(root, 'frontend')
  run('go-version', 'go', ['version'])
  run('go-format', 'gofmt', ['-l', 'cmd', 'internal'], backend, true)
  run('go-vet', 'go', ['vet', './...'], backend)
  const coverage = ['test', '-count=1', '-coverprofile=../reports/backend-coverage.out', './...']
  if (flags.has('--race')) coverage.splice(1, 0, '-race')
  run('go-tests', 'go', coverage, backend)
  const coverageText = run('go-coverage', 'go', ['tool', 'cover', '-func=../reports/backend-coverage.out'], backend)
  writeFileSync(join(reports, 'backend-coverage.txt'), coverageText)
  run('go-coverage-html', 'go', ['tool', 'cover', '-html=../reports/backend-coverage.out', '-o', '../reports/backend-coverage.html'], backend)
  run('go-build', 'go', ['build', '-trimpath', '-o', '../bin/calculator' + (process.platform === 'win32' ? '.exe' : ''), './cmd/server'], backend)

  if (!flags.has('--backend-only')) {
    const lock = join(frontend, 'package-lock.json')
    if (!existsSync(lock) && flags.has('--install')) {
      run('npm-bootstrap', 'npm', ['install', '--include=dev', '--no-audit', '--no-fund'], frontend)
    }
    if (!existsSync(lock)) throw new Error('Missing frontend/package-lock.json. Run again with --install, then commit the generated lockfile.')
    run('npm-ci', 'npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], frontend)
    run('frontend-verify', 'npm', ['run', 'verify'], frontend)
    if (flags.has('--e2e')) {
      run('browser-install', 'npm', ['run', 'install:browsers'], frontend)
      run('browser-tests', 'npm', ['run', 'test:e2e'], frontend)
    }
    const totals = JSON.parse(readFileSync(join(reports, 'frontend-coverage/coverage-summary.json'), 'utf8')).total
    const backendTotal = coverageText.match(/total:\s+\(statements\)\s+([\d.]+)%/)
    const summary = [
      '# Measured coverage', '', `Generated: ${new Date().toISOString()}`, '',
      '| Scope | Statements | Branches | Functions | Lines |', '| --- | --- | --- | --- | --- |',
      `| Frontend | ${totals.statements.pct}% | ${totals.branches.pct}% | ${totals.functions.pct}% | ${totals.lines.pct}% |`,
      `| Backend, including server entrypoint | ${backendTotal?.[1] ?? 'unknown'}% | n/a | n/a | n/a |`, '',
      'Frontend excludes test code and main.tsx (DOM mounting). It includes App, the calculator component, and domain/API modules.',
      'Coverage measures execution, not proof of correctness. See the tests and full reports.', '',
    ].join('\n')
    writeFileSync(join(reports, 'COVERAGE.md'), summary)
  }
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.error = error instanceof Error ? error.message : String(error)
  console.error(`\nVerification stopped: ${report.error}`)
  process.exitCode = 1
} finally {
  report.finishedAt = new Date().toISOString()
  writeFileSync(join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n')
}
if (report.status === 'passed') {
  console.log(`\nRequested checks passed (${flags.has('--backend-only') ? 'backend only' : flags.has('--e2e') ? 'backend + frontend + browser' : 'backend + frontend'}).`)
  console.log('Docker and remote CI status are separate checks; they are not certified by this command.')
}
