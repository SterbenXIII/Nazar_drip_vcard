import json
import tempfile
import unittest
from pathlib import Path

from validate_release_manifest import ReleaseManifestError, validate_rollback_manifests


CURRENT_SHA = 'a' * 40
ROLLBACK_SHA = 'b' * 40
REPOSITORY = 'SterbenXIII/Nazar_drip_vcard'


def manifest(sha):
    return {
        'manifest_version': 'havenhub-production-v1',
        'release_sha': sha,
        'api_image_ref': f'ghcr.io/{REPOSITORY.lower()}/vcard-api@sha256:{"1" * 64}',
        'clinic_web_image_ref': f'ghcr.io/{REPOSITORY.lower()}/vcard-clinic-web@sha256:{"2" * 64}',
        'ci_run_id': '1001',
        'deploy_run_id': '2002',
    }


class ReleaseManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.candidate_path = Path(self.temp_dir.name) / 'candidate.json'
        self.current_path = Path(self.temp_dir.name) / 'current.json'
        self.write(self.candidate_path, manifest(ROLLBACK_SHA))
        self.write(self.current_path, manifest(CURRENT_SHA))

    @staticmethod
    def write(path, content):
        path.write_text(json.dumps(content), encoding='utf-8')

    def test_valid_prior_release_passes(self):
        candidate, current = validate_rollback_manifests(
            self.candidate_path,
            self.current_path,
            ROLLBACK_SHA,
            REPOSITORY,
        )

        self.assertEqual(candidate['release_sha'], ROLLBACK_SHA)
        self.assertEqual(current['release_sha'], CURRENT_SHA)

    def test_current_release_cannot_be_rolled_back_to(self):
        self.write(self.candidate_path, manifest(CURRENT_SHA))

        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(self.candidate_path, self.current_path, CURRENT_SHA, REPOSITORY)

    def test_requested_sha_must_match_manifest(self):
        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(
                self.candidate_path,
                self.current_path,
                CURRENT_SHA,
                REPOSITORY,
            )

    def test_unknown_manifest_fields_fail_closed(self):
        candidate = manifest(ROLLBACK_SHA)
        candidate['extra'] = 'unexpected'
        self.write(self.candidate_path, candidate)

        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(self.candidate_path, self.current_path, ROLLBACK_SHA, REPOSITORY)

    def test_invalid_digest_reference_fails_closed(self):
        candidate = manifest(ROLLBACK_SHA)
        candidate['api_image_ref'] = 'ghcr.io/example/vcard-api:latest'
        self.write(self.candidate_path, candidate)

        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(self.candidate_path, self.current_path, ROLLBACK_SHA, REPOSITORY)

    def test_non_numeric_workflow_id_fails_closed(self):
        candidate = manifest(ROLLBACK_SHA)
        candidate['deploy_run_id'] = 'not-a-run'
        self.write(self.candidate_path, candidate)

        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(self.candidate_path, self.current_path, ROLLBACK_SHA, REPOSITORY)

    def test_other_repository_image_is_rejected(self):
        candidate = manifest(ROLLBACK_SHA)
        candidate['api_image_ref'] = candidate['api_image_ref'].replace(
            REPOSITORY.lower(),
            'some-owner/another-repository',
        )
        self.write(self.candidate_path, candidate)

        with self.assertRaises(ReleaseManifestError):
            validate_rollback_manifests(self.candidate_path, self.current_path, ROLLBACK_SHA, REPOSITORY)


if __name__ == '__main__':
    unittest.main()
