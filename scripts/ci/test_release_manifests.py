import json
import tempfile
import unittest
from pathlib import Path

from validate_release_manifest import ReleaseManifestError, validate_rollback_manifests
from validate_staging_release_manifest import validate_manifest as validate_staging_manifest


REPOSITORY = 'SterbenXIII/Nazar_drip_vcard'
SHA = 'a' * 40


def image_ref(image, digest):
    return f'ghcr.io/{REPOSITORY.lower()}/{image}@sha256:{digest * 64}'


class ReleaseManifestTests(unittest.TestCase):
    def write_manifest(self, directory, name, data):
        path = Path(directory) / name
        path.write_text(json.dumps(data), encoding='utf-8')
        return path

    def staging_manifest(self):
        return {
            'release_sha': SHA,
            'api_image_ref': image_ref('vcard-api', '1'),
            'staging_clinic_web_image_ref': image_ref('vcard-clinic-web', '2'),
            'production_clinic_web_image_ref': image_ref('vcard-clinic-web', '3'),
            'ci_run_id': '100',
            'deploy_run_id': '200',
        }

    def production_manifest(self, sha=SHA):
        return {
            'manifest_version': 'havenhub-production-v1',
            'release_sha': sha,
            'api_image_ref': image_ref('vcard-api', '1'),
            'clinic_web_image_ref': image_ref('vcard-clinic-web', '3'),
            'ci_run_id': '100',
            'deploy_run_id': '200',
        }

    def test_staging_manifest_requires_repository_digests_and_distinct_web_variants(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.write_manifest(directory, 'staging.json', self.staging_manifest())
            self.assertEqual(validate_staging_manifest(path, SHA, REPOSITORY)['release_sha'], SHA)

            invalid = self.staging_manifest()
            invalid['production_clinic_web_image_ref'] = invalid['staging_clinic_web_image_ref']
            path.write_text(json.dumps(invalid), encoding='utf-8')
            with self.assertRaises(ValueError):
                validate_staging_manifest(path, SHA, REPOSITORY)

            foreign = self.staging_manifest()
            foreign['api_image_ref'] = foreign['api_image_ref'].replace(
                REPOSITORY.lower(), 'someone-else/project'
            )
            path.write_text(json.dumps(foreign), encoding='utf-8')
            with self.assertRaises(ValueError):
                validate_staging_manifest(path, SHA, REPOSITORY)

    def test_production_rollback_manifest_must_be_a_verified_production_release(self):
        with tempfile.TemporaryDirectory() as directory:
            candidate = self.write_manifest(directory, 'candidate.json', self.production_manifest())
            current = self.write_manifest(directory, 'current.json', self.production_manifest('b' * 40))
            selected, active = validate_rollback_manifests(candidate, current, SHA, REPOSITORY)
            self.assertEqual(selected['manifest_version'], 'havenhub-production-v1')
            self.assertEqual(active['release_sha'], 'b' * 40)

            legacy = self.production_manifest()
            legacy.pop('manifest_version')
            candidate.write_text(json.dumps(legacy), encoding='utf-8')
            with self.assertRaises(ReleaseManifestError):
                validate_rollback_manifests(candidate, current, SHA, REPOSITORY)

    def test_staging_release_rejects_a_sha_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.write_manifest(directory, 'staging.json', self.staging_manifest())
            with self.assertRaises(ValueError):
                validate_staging_manifest(path, 'b' * 40, REPOSITORY)


if __name__ == '__main__':
    unittest.main()
