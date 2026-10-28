import socket
import unittest
from unittest.mock import patch

from check_stage_dns import DNSCheckError, check_stage_dns


VPS_IPV4 = '72.61.138.53'
VPS_IPV6 = '2001:4860:4860::8888'
HOSTS = ('staging.havenhub.com.ua', 'www.staging.havenhub.com.ua')


def answer(address):
    ip = socket.inet_pton(socket.AF_INET6 if ':' in address else socket.AF_INET, address)
    family = socket.AF_INET6 if ':' in address else socket.AF_INET
    normalized = socket.inet_ntop(family, ip)
    sockaddr = (normalized, 443, 0, 0) if family == socket.AF_INET6 else (normalized, 443)
    return (family, socket.SOCK_STREAM, socket.IPPROTO_TCP, '', sockaddr)


class CheckStageDnsTests(unittest.TestCase):
    def resolve(self, records):
        def getaddrinfo(host, *_args, **_kwargs):
            if host not in records:
                raise socket.gaierror(socket.EAI_NONAME, 'name not found')
            return [answer(record) for record in records[host]]

        return getaddrinfo

    def test_matching_ipv4_for_each_hostname_passes_without_ipv6(self):
        records = {host: [VPS_IPV4] for host in HOSTS}

        with patch('check_stage_dns.socket.getaddrinfo', self.resolve(records)):
            check_stage_dns(HOSTS, VPS_IPV4, ())

    def test_matching_ipv4_and_global_ipv6_pass(self):
        records = {host: [VPS_IPV4, '2001:4860:4860:0:0:0:0:8888'] for host in HOSTS}

        with patch('check_stage_dns.socket.getaddrinfo', self.resolve(records)):
            check_stage_dns(HOSTS, VPS_IPV4, (VPS_IPV6,))

    def test_foreign_ipv4_fails(self):
        records = {HOSTS[0]: [VPS_IPV4], HOSTS[1]: ['72.61.138.54']}

        with patch('check_stage_dns.socket.getaddrinfo', self.resolve(records)):
            with self.assertRaises(DNSCheckError):
                check_stage_dns(HOSTS, VPS_IPV4, ())

    def test_foreign_ipv6_fails(self):
        records = {host: [VPS_IPV4, '2001:4860:4860::8844'] for host in HOSTS}

        with patch('check_stage_dns.socket.getaddrinfo', self.resolve(records)):
            with self.assertRaises(DNSCheckError):
                check_stage_dns(HOSTS, VPS_IPV4, (VPS_IPV6,))

    def test_aaaa_fails_when_vps_has_no_global_ipv6(self):
        records = {host: [VPS_IPV4, VPS_IPV6] for host in HOSTS}

        with patch('check_stage_dns.socket.getaddrinfo', self.resolve(records)):
            with self.assertRaises(DNSCheckError):
                check_stage_dns(HOSTS, VPS_IPV4, ())

    def test_unavailable_dns_fails_closed(self):
        def unavailable(*_args, **_kwargs):
            raise socket.gaierror(socket.EAI_AGAIN, 'temporary failure')

        with patch('check_stage_dns.socket.getaddrinfo', unavailable):
            with self.assertRaises(DNSCheckError):
                check_stage_dns(HOSTS, VPS_IPV4, ())


if __name__ == '__main__':
    unittest.main()
