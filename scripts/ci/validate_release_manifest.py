#!/usr/bin/env python3
"""Validate a previous staging release before a manual rollback."""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


class ReleaseManifestError(ValueError):
    """Raised when a release manifest is incomplete or inconsistent."""


EXPECTED_KEYS = {
    'release_sha',
    'api_image_ref',
    'clinic_web_image_ref',
    'ci_run_id',
    'deploy_run_id',
}
SHA_PATTERN = re.compile(r'^[0-9a-f]{40}$')
API_REF_PATTERN = re.compile(r'^ghcr\.io/[a-z0-9._/-]+/vcard-api@sha256:[0-9a-f]{64}$')
CLINIC_REF_PATTERN = re.compile(
    r'^ghcr\.io/[a-z0-9._/-]+/vcard-clinic-web@sha256:[0-9a-f]{64}$'
)


def read_manifest(path: Path, expected_repository: str) -> dict[str, str]:
    try:
        manifest: Any = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ReleaseManifestError(f'Cannot read a valid release manifest: {path.name}') from error

    if not isinstance(manifest, dict) or set(manifest) != EXPECTED_KEYS:
        raise ReleaseManifestError(f'Invalid release manifest fields: {path.name}')
    if any(not isinstance(value, str) for value in manifest.values()):
        raise ReleaseManifestError(f'Release manifest values must be strings: {path.name}')
    if not SHA_PATTERN.fullmatch(manifest['release_sha']):
        raise ReleaseManifestError('Invalid release SHA in manifest')
    if not API_REF_PATTERN.fullmatch(manifest['api_image_ref']):
        raise ReleaseManifestError('Invalid API digest reference in manifest')
    if not CLINIC_REF_PATTERN.fullmatch(manifest['clinic_web_image_ref']):
        raise ReleaseManifestError('Invalid clinic digest reference in manifest')
    repository = re.escape(expected_repository.lower())
    if not re.fullmatch(
        rf'ghcr\.io/{repository}/vcard-api@sha256:[0-9a-f]{{64}}',
        manifest['api_image_ref'],
    ) or not re.fullmatch(
        rf'ghcr\.io/{repository}/vcard-clinic-web@sha256:[0-9a-f]{{64}}',
        manifest['clinic_web_image_ref'],
    ):
        raise ReleaseManifestError('Release images do not belong to this repository')
    if not manifest['ci_run_id'].isdigit() or not manifest['deploy_run_id'].isdigit():
        raise ReleaseManifestError('Invalid workflow run ID in manifest')
    return manifest


def validate_rollback_manifests(
    candidate_path: Path,
    current_path: Path,
    expected_sha: str,
    expected_repository: str,
) -> tuple[dict[str, str], dict[str, str]]:
    if not SHA_PATTERN.fullmatch(expected_sha):
        raise ReleaseManifestError('Rollback SHA must be a full lowercase 40-character commit SHA')

    candidate = read_manifest(candidate_path, expected_repository)
    current = read_manifest(current_path, expected_repository)
    if candidate['release_sha'] != expected_sha:
        raise ReleaseManifestError('Requested SHA does not match its successful release manifest')
    if current['release_sha'] == expected_sha:
        raise ReleaseManifestError('Requested SHA is already the current release')
    return candidate, current


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path, help='Previously successful release JSON')
    parser.add_argument('--current', required=True, type=Path, help='Current release JSON')
    parser.add_argument('--sha', required=True, help='Requested rollback commit SHA')
    parser.add_argument('--repository', required=True, help='Expected GitHub repository in owner/name form')
    parser.add_argument('--output', type=Path, help='GitHub Actions output file')
    args = parser.parse_args()

    try:
        candidate, current = validate_rollback_manifests(
            args.manifest,
            args.current,
            args.sha,
            args.repository,
        )
    except ReleaseManifestError as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1

    if args.output:
        with args.output.open('a', encoding='utf-8') as output:
            output.write(f"release_sha={candidate['release_sha']}\n")
            output.write(f"api_image_ref={candidate['api_image_ref']}\n")
            output.write(f"clinic_web_image_ref={candidate['clinic_web_image_ref']}\n")
            output.write(f"current_release_sha={current['release_sha']}\n")

    print(f"PASS: rollback manifest validated for {candidate['release_sha']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
