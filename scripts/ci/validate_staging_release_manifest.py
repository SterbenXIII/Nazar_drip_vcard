#!/usr/bin/env python3
"""Validate the isolated staging manifest selected for production promotion."""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


EXPECTED_KEYS = {
    'release_sha',
    'api_image_ref',
    'staging_clinic_web_image_ref',
    'production_clinic_web_image_ref',
    'ci_run_id',
    'deploy_run_id',
}


def validate_manifest(path: Path, sha: str, repository: str) -> dict[str, str]:
    try:
        manifest: Any = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError('Cannot read a valid staging release manifest') from error

    if not isinstance(manifest, dict) or set(manifest) != EXPECTED_KEYS:
        raise ValueError('Staging release manifest fields do not match the contract')
    if any(not isinstance(value, str) for value in manifest.values()):
        raise ValueError('Staging release manifest values must be strings')
    if not re.fullmatch(r'[0-9a-f]{40}', sha) or manifest['release_sha'] != sha:
        raise ValueError('Requested SHA does not match the staging release')

    repository_pattern = re.escape(repository.lower())
    image_patterns = {
        'api_image_ref': rf'ghcr\.io/{repository_pattern}/vcard-api@sha256:[0-9a-f]{{64}}',
        'staging_clinic_web_image_ref': (
            rf'ghcr\.io/{repository_pattern}/vcard-clinic-web@sha256:[0-9a-f]{{64}}'
        ),
        'production_clinic_web_image_ref': (
            rf'ghcr\.io/{repository_pattern}/vcard-clinic-web@sha256:[0-9a-f]{{64}}'
        ),
    }
    if any(not re.fullmatch(pattern, manifest[key]) for key, pattern in image_patterns.items()):
        raise ValueError('Staging release image is not an immutable digest from this repository')
    if not all(manifest[key].isdigit() for key in ('ci_run_id', 'deploy_run_id')):
        raise ValueError('Staging release run IDs must be numeric')
    if manifest['staging_clinic_web_image_ref'] == manifest['production_clinic_web_image_ref']:
        raise ValueError('Staging and production web images must be distinct build variants')
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--repository', required=True)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()

    try:
        manifest = validate_manifest(args.manifest, args.sha, args.repository)
    except ValueError as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1

    if args.output:
        with args.output.open('a', encoding='utf-8') as output:
            for key, value in manifest.items():
                output.write(f'{key}={value}\n')

    print(f"PASS: staging release validated for {manifest['release_sha']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
