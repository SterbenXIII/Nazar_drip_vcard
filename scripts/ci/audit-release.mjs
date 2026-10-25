import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const severities = ['info', 'low', 'moderate', 'high', 'critical']
const activeImporters = new Set(['.', 'apps__api', 'apps__clinic-web', 'packages__shared'])
const legacyImporters = new Set(['apps__web'])
const exceptionIdentity = {
  advisoryId: 'GHSA-ch52-4w7c-c8xp',
  package: 'http-cache-semantics',
  version: '4.2.0',
  importerPath: 'apps__clinic-web>astro>http-cache-semantics',
  expires: '2026-11-24',
}

function invalidResult() {
  return { exitCode: 2, activeFindings: [], legacyFindings: [], acceptedExceptions: [] }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateExceptions(exceptions) {
  if (!Array.isArray(exceptions) || exceptions.length > 1) return false
  return exceptions.every(
    (exception) =>
      isRecord(exception) &&
      Object.entries(exceptionIdentity).every(([key, value]) => exception[key] === value) &&
      typeof exception.evidence === 'string' &&
      exception.evidence.trim().length > 0 &&
      typeof exception.rationale === 'string' &&
      exception.rationale.trim().length > 0,
  )
}

export function evaluateAudit(stdout, exceptions, today) {
  let report
  try {
    report = JSON.parse(stdout)
  } catch {
    return invalidResult()
  }
  const parsedDate = new Date(`${today}T00:00:00Z`)

  if (
    !isRecord(report) ||
    'error' in report ||
    !Array.isArray(report.actions) ||
    !isRecord(report.advisories) ||
    !Array.isArray(report.muted) ||
    !isRecord(report.metadata) ||
    !isRecord(report.metadata?.vulnerabilities) ||
    !Number.isSafeInteger(report.metadata.dependencies) ||
    report.metadata.dependencies < 0 ||
    !Number.isSafeInteger(report.metadata.totalDependencies) ||
    report.metadata.totalDependencies < 0 ||
    !Number.isSafeInteger(report.metadata.devDependencies) ||
    report.metadata.devDependencies < 0 ||
    !Number.isSafeInteger(report.metadata.optionalDependencies) ||
    report.metadata.optionalDependencies < 0 ||
    !validateExceptions(exceptions) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(today) ||
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== today
  ) {
    return invalidResult()
  }

  const expectedCounts = report.metadata.vulnerabilities
  const actualCounts = Object.fromEntries(severities.map((severity) => [severity, 0]))
  if (
    severities.some(
      (severity) => !Number.isSafeInteger(expectedCounts[severity]) || expectedCounts[severity] < 0,
    )
  ) {
    return invalidResult()
  }

  const activeFindings = []
  const legacyFindings = []
  const allFindings = []

  for (const advisory of Object.values(report.advisories)) {
    if (
      !isRecord(advisory) ||
      !severities.includes(advisory.severity) ||
      typeof advisory.github_advisory_id !== 'string' ||
      typeof advisory.module_name !== 'string' ||
      !Array.isArray(advisory.findings) ||
      advisory.findings.length === 0
    ) {
      return invalidResult()
    }

    for (const finding of advisory.findings) {
      if (
        !isRecord(finding) ||
        typeof finding.version !== 'string' ||
        !Array.isArray(finding.paths) ||
        finding.paths.length === 0
      ) {
        return invalidResult()
      }

      for (const importerPath of finding.paths) {
        if (typeof importerPath !== 'string' || importerPath.length === 0) return invalidResult()
        const importer = importerPath.split('>')[0]
        const classified = {
          advisoryId: advisory.github_advisory_id,
          package: advisory.module_name,
          version: finding.version,
          severity: advisory.severity,
          importerPath,
        }

        if (activeImporters.has(importer)) activeFindings.push(classified)
        else if (legacyImporters.has(importer)) legacyFindings.push(classified)
        else return invalidResult()

        actualCounts[advisory.severity] += 1
        allFindings.push(classified)
      }
    }
  }

  if (severities.some((severity) => actualCounts[severity] !== expectedCounts[severity])) {
    return invalidResult()
  }

  const matchingExceptionFindings = activeFindings.filter(
    (finding) =>
      finding.severity === 'high' &&
      Object.entries(exceptionIdentity)
        .filter(([key]) => key !== 'expires')
        .every(([key, value]) => finding[key] === value),
  )
  const acceptedExceptions = []
  const exception = exceptions[0]
  if (
    exception &&
    today <= exception.expires &&
    matchingExceptionFindings.length === 1 &&
    allFindings.filter((finding) => finding.advisoryId === exception.advisoryId).length === 1
  ) {
    acceptedExceptions.push(exception)
    activeFindings.splice(activeFindings.indexOf(matchingExceptionFindings[0]), 1)
  }

  const hasBlockingFinding = activeFindings.some(
    (finding) => finding.severity === 'high' || finding.severity === 'critical',
  )
  return {
    exitCode: hasBlockingFinding ? 1 : 0,
    activeFindings,
    legacyFindings,
    acceptedExceptions,
  }
}

function main() {
  let exceptions
  try {
    exceptions = JSON.parse(
      readFileSync(new URL('./audit-exceptions.json', import.meta.url), 'utf8'),
    )
  } catch {
    console.error('Audit gate: cannot read exception configuration.')
    return 2
  }

  const audit = spawnSync('pnpm', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  if (audit.error || typeof audit.stdout !== 'string') {
    console.error(
      `Audit gate: pnpm audit could not run${audit.error ? ` (${audit.error.message})` : ''}.`,
    )
    return 2
  }

  const result = evaluateAudit(audit.stdout, exceptions, new Date().toISOString().slice(0, 10))
  if (result.exitCode === 2 || (audit.status !== 0 && audit.status !== 1)) {
    console.error('Audit gate: invalid, incomplete, or unavailable pnpm audit report.')
    return 2
  }

  let report
  try {
    report = JSON.parse(audit.stdout)
  } catch {
    console.error('Audit gate: invalid pnpm audit JSON.')
    return 2
  }
  const reportedTotal = severities.reduce(
    (sum, severity) => sum + report.metadata.vulnerabilities[severity],
    0,
  )
  if (audit.status === 1 && reportedTotal === 0) {
    console.error('Audit gate: pnpm audit failed without reporting vulnerabilities.')
    return 2
  }

  if (process.env.AUDIT_REPORT_PATH) {
    writeFileSync(
      process.env.AUDIT_REPORT_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          metadata: report.metadata,
          activeFindings: result.activeFindings,
          legacyFindings: result.legacyFindings,
          acceptedExceptions: result.acceptedExceptions,
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    )
  }

  console.log(
    `Audit gate: ${result.activeFindings.length} active findings, ${result.legacyFindings.length} legacy findings, ${result.acceptedExceptions.length} accepted exceptions.`,
  )
  for (const finding of result.activeFindings.filter(
    (item) => item.severity === 'high' || item.severity === 'critical',
  )) {
    console.log(
      `BLOCKED ${finding.severity}: ${finding.package}@${finding.version} ${finding.advisoryId} (${finding.importerPath})`,
    )
  }
  return result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
