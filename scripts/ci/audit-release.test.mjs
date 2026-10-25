import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { evaluateAudit } from './audit-release.mjs'

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/pnpm-audit-v10.json', import.meta.url), 'utf8'),
)
const exactException = [
  {
    advisoryId: 'GHSA-ch52-4w7c-c8xp',
    package: 'http-cache-semantics',
    version: '4.2.0',
    importerPath: 'apps__clinic-web>astro>http-cache-semantics',
    evidence:
      'The package is used by Astro image caching during build and is absent from the nginx runtime image.',
    rationale:
      'No patched upstream version is available; this exact build-only path is time-limited.',
    expires: '2026-11-24',
  },
]

function reportWith({ paths, severity = 'high', advisoryId, packageName, version } = {}) {
  const report = structuredClone(fixture)
  const id = advisoryId ?? 'GHSA-ch52-4w7c-c8xp'
  const name = packageName ?? 'http-cache-semantics'
  const affectedVersion = version ?? '4.2.0'
  report.advisories = {
    1102341: {
      findings: [
        {
          version: affectedVersion,
          paths: paths ?? ['apps__clinic-web>astro>http-cache-semantics'],
        },
      ],
      github_advisory_id: id,
      module_name: name,
      severity,
    },
  }
  report.metadata.vulnerabilities = {
    info: 0,
    low: 0,
    moderate: 0,
    high: severity === 'high' ? (paths?.length ?? 1) : 0,
    critical: severity === 'critical' ? (paths?.length ?? 1) : 0,
  }
  return JSON.stringify(report)
}

test('active high and critical findings block release', () => {
  for (const severity of ['high', 'critical']) {
    const result = evaluateAudit(reportWith({ severity }), [], '2026-10-25')
    assert.equal(result.exitCode, 1)
    assert.equal(result.activeFindings.length, 1)
  }
})

test('legacy-only high findings are reported separately and do not block', () => {
  const result = evaluateAudit(
    reportWith({ paths: ['apps__web>astro>http-cache-semantics'] }),
    [],
    '2026-10-25',
  )
  assert.equal(result.exitCode, 0)
  assert.equal(result.activeFindings.length, 0)
  assert.equal(result.legacyFindings.length, 1)
})

test('an advisory with both legacy and active paths blocks release', () => {
  const result = evaluateAudit(
    reportWith({
      paths: [
        'apps__web>astro>http-cache-semantics',
        'apps__clinic-web>astro>http-cache-semantics',
      ],
    }),
    [],
    '2026-10-25',
  )
  assert.equal(result.exitCode, 1)
  assert.equal(result.activeFindings.length, 1)
  assert.equal(result.legacyFindings.length, 1)
})

test('unknown importers fail closed', () => {
  assert.equal(
    evaluateAudit(reportWith({ paths: ['apps__unknown>package'] }), [], '2026-10-25').exitCode,
    2,
  )
})

test('malformed JSON and registry error output fail closed', () => {
  assert.equal(evaluateAudit('{not-json', [], '2026-10-25').exitCode, 2)
  assert.equal(
    evaluateAudit('ERR_PNPM_AUDIT_BAD_RESPONSE: registry unavailable', [], '2026-10-25').exitCode,
    2,
  )
  const registryError = JSON.parse(reportWith())
  registryError.error = { code: 'ERR_PNPM_AUDIT_BAD_RESPONSE' }
  assert.equal(evaluateAudit(JSON.stringify(registryError), [], '2026-10-25').exitCode, 2)
})

test('an exact, unexpired exception accepts only its matching finding', () => {
  const result = evaluateAudit(reportWith(), exactException, '2026-10-24')
  assert.equal(result.exitCode, 0)
  assert.equal(result.acceptedExceptions.length, 1)
  assert.equal(result.activeFindings.length, 0)
})

test('exception version, path, advisory, and expiry mismatches still block', () => {
  const cases = [
    reportWith({ version: '4.2.1' }),
    reportWith({ paths: ['apps__clinic-web>vite>http-cache-semantics'] }),
    reportWith({ advisoryId: 'GHSA-other' }),
    reportWith({ severity: 'critical' }),
  ]
  for (const stdout of cases) {
    assert.equal(evaluateAudit(stdout, exactException, '2026-10-24').exitCode, 1)
  }
  assert.equal(evaluateAudit(reportWith(), exactException, '2026-11-25').exitCode, 1)
})

test('incomplete audit counts fail closed', () => {
  const report = JSON.parse(reportWith())
  report.metadata.vulnerabilities.high = 0
  assert.equal(evaluateAudit(JSON.stringify(report), [], '2026-10-25').exitCode, 2)

  report.metadata.vulnerabilities.high = 1
  delete report.metadata.totalDependencies
  assert.equal(evaluateAudit(JSON.stringify(report), [], '2026-10-25').exitCode, 2)
})
