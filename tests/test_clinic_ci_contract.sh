#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ruby <<'RUBY'
require 'yaml'
require 'date'

def workflow(path)
  YAML.safe_load(File.read(path), permitted_classes: [Date, Time], aliases: true)
end

required = %w[
  secret-scan
  active-checks
  api-tests
  clinic-acceptance
  clinic-publication
  runtime-images
  ops-contract
]
ci = workflow('.github/workflows/ci.yml')
jobs = ci.fetch('jobs')
missing = required - jobs.keys
abort("CI missing required jobs: #{missing.join(', ')}") unless missing.empty?

ready = jobs.fetch('release-ready')
abort('release-ready must depend on exactly the required jobs') unless Array(ready['needs']).sort == required.sort
abort('release-ready must always run') unless ready.fetch('if', '').include?('always()')
required.each do |job|
  abort("release-ready does not require #{job} success") unless ready.fetch('if', '').include?("needs.#{job}.result == 'success'")
end

abort('CI permissions must be read-only') unless ci.fetch('permissions') == { 'contents' => 'read' }
required.each do |job|
  definition = jobs.fetch(job)
  if definition.key?('uses')
    abort("#{job} must call the shared clinic workflow") unless definition['uses'] == './.github/workflows/clinic-web-ci.yml'
  else
    abort("#{job} must use ubuntu-24.04") unless definition.fetch('runs-on') == 'ubuntu-24.04'
  end
end
jobs.each do |id, definition|
  next if id == 'release-ready'
  serialized = definition.to_yaml
  abort("blocking job #{id} includes legacy web or n8n") if serialized.match?(%r{apps/web|n8n})
end

events = ci[true] || ci['on'] || {}
unless events.keys == ['workflow_dispatch']
  abort('CI must be manually dispatched only while local-first mode is active')
end
%w[paths paths-ignore].each do |key|
  abort('CI must not use path filters') if events.values.any? { |config| config.is_a?(Hash) && config.key?(key) }
end

clinic = workflow('.github/workflows/clinic-web-ci.yml')
clinic_events = clinic[true] || clinic['on'] || {}
abort('clinic checks must only run as a reusable workflow') unless clinic_events.keys == ['workflow_call']
abort('clinic reusable workflow must use ubuntu-24.04') unless clinic.dig('jobs', 'verify', 'runs-on') == 'ubuntu-24.04'
abort('clinic reusable workflow must pin Node 24.20.0') unless File.read('.github/workflows/clinic-web-ci.yml').include?('node-version: 24.20.0')
abort('clinic reusable workflow must install Playwright from the workspace lockfile') unless clinic.dig('jobs', 'verify', 'steps').any? { |step| step['run']&.include?('playwright install --with-deps chromium') }
active_check_text = jobs.fetch('active-checks').to_yaml
abort('active-checks must test the audit classifier') unless active_check_text.include?('node --test scripts/ci/audit-release.test.mjs')
abort('active-checks must run the audit release gate') unless active_check_text.include?('node scripts/ci/audit-release.mjs')

legacy = workflow('.github/workflows/legacy-web-ci.yml')
legacy_events = legacy[true] || legacy['on'] || {}
unless legacy_events.keys == ['workflow_dispatch']
  abort('legacy web CI must be manually dispatched only while local-first mode is active')
end
abort('legacy web workflow must have a job') if legacy.fetch('jobs').empty?
abort('legacy web workflow must not depend on CI') if legacy.fetch('jobs').values.any? { |job| job.key?('needs') }

deploy = workflow('.github/workflows/deploy.yml')
deploy_events = deploy[true] || deploy['on'] || {}
abort('deploy must listen only to workflow_run') unless deploy_events.keys == ['workflow_run']
abort('deploy must listen only to CI') unless deploy_events.dig('workflow_run', 'workflows') == ['CI']
abort('deploy must use the tested fail-closed release head helper') unless File.read('.github/workflows/deploy.yml').include?('run: bash scripts/ci/check_release_head.sh')
abort('release head gate contract test must run in CI') unless jobs.fetch('ops-contract').to_yaml.include?('bash scripts/ci/test_release_head.sh')

puts 'Clinic CI contract passed.'
RUBY
