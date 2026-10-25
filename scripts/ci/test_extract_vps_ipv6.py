import unittest

from extract_vps_ipv6 import extract_vps_ipv6


class ExtractVpsIpv6Tests(unittest.TestCase):
    def test_skips_address_records_without_local_field(self):
        payload = '[{"addr_info":[{"family":"inet6","scope":"global"},' \
            '{"family":"inet6","local":"2a02:4780:c:d0da::1"}]}]'

        self.assertEqual(extract_vps_ipv6(payload), '2a02:4780:c:d0da::1')

    def test_returns_empty_when_no_records_have_local_addresses(self):
        payload = '[{"addr_info":[{"family":"inet6","scope":"global"}]}]'

        self.assertEqual(extract_vps_ipv6(payload), '')


if __name__ == '__main__':
    unittest.main()
