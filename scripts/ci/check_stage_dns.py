#!/usr/bin/env python3
"""Fail closed unless each hostname resolves only to the configured VPS addresses."""

import argparse
import ipaddress
import socket
import sys
from collections.abc import Callable, Iterable, Sequence


class DNSCheckError(ValueError):
    """Raised when DNS does not match the expected VPS addresses."""


def _parse_vps_ipv4(value: str) -> ipaddress.IPv4Address:
    try:
        address = ipaddress.ip_address(value.strip())
    except ValueError as error:
        raise DNSCheckError(f'Invalid VPS IPv4 address: {value!r}') from error
    if not isinstance(address, ipaddress.IPv4Address):
        raise DNSCheckError(f'VPS_IP must be IPv4: {value!r}')
    return address


def _parse_vps_ipv6(values: Iterable[str]) -> set[ipaddress.IPv6Address]:
    addresses: set[ipaddress.IPv6Address] = set()
    for value in values:
        try:
            address = ipaddress.ip_address(value.strip().split('%', 1)[0])
        except ValueError as error:
            raise DNSCheckError(f'Invalid VPS IPv6 address: {value!r}') from error
        if not isinstance(address, ipaddress.IPv6Address) or not address.is_global:
            raise DNSCheckError(f'VPS IPv6 address must be globally routable: {value!r}')
        addresses.add(address)
    return addresses


def _resolve_addresses(
    host: str,
    resolver: Callable[..., list[tuple]],
) -> tuple[set[ipaddress.IPv4Address], set[ipaddress.IPv6Address]]:
    if not host or host != host.strip():
        raise DNSCheckError(f'Invalid hostname: {host!r}')

    try:
        answers = resolver(host, None, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
    except OSError as error:
        raise DNSCheckError(f'DNS lookup failed for {host}: {error}') from error
    if not answers:
        raise DNSCheckError(f'DNS returned no addresses for {host}')

    ipv4: set[ipaddress.IPv4Address] = set()
    ipv6: set[ipaddress.IPv6Address] = set()
    for family, _socktype, _protocol, _canonname, sockaddr in answers:
        try:
            address = ipaddress.ip_address(sockaddr[0].split('%', 1)[0])
        except (IndexError, ValueError, AttributeError) as error:
            raise DNSCheckError(f'DNS returned an invalid address for {host}') from error
        if family == socket.AF_INET and isinstance(address, ipaddress.IPv4Address):
            ipv4.add(address)
        elif family == socket.AF_INET6 and isinstance(address, ipaddress.IPv6Address):
            ipv6.add(address)
        else:
            raise DNSCheckError(f'DNS returned an address-family mismatch for {host}')

    if not ipv4:
        raise DNSCheckError(f'DNS returned no IPv4 A record for {host}')
    return ipv4, ipv6


def check_stage_dns(
    hosts: Sequence[str],
    vps_ipv4: str,
    vps_ipv6: Iterable[str],
    resolver: Callable[..., list[tuple]] | None = None,
) -> None:
    """Raise DNSCheckError unless every hostname points only to this VPS."""
    if not hosts:
        raise DNSCheckError('At least one staging hostname is required')

    expected_ipv4 = _parse_vps_ipv4(vps_ipv4)
    expected_ipv6 = _parse_vps_ipv6(vps_ipv6)
    address_resolver = resolver or socket.getaddrinfo

    for host in hosts:
        ipv4, ipv6 = _resolve_addresses(host, address_resolver)
        if ipv4 != {expected_ipv4}:
            actual = ', '.join(sorted(str(address) for address in ipv4))
            raise DNSCheckError(f'{host} A records are [{actual}], expected only {expected_ipv4}')
        if ipv6 and not expected_ipv6:
            actual = ', '.join(sorted(str(address) for address in ipv6))
            raise DNSCheckError(f'{host} has AAAA records but the VPS has no global IPv6: {actual}')
        if not ipv6 <= expected_ipv6:
            actual = ', '.join(sorted(str(address) for address in ipv6 - expected_ipv6))
            raise DNSCheckError(f'{host} has AAAA records not assigned to the VPS: {actual}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', action='append', required=True, help='Hostname to validate; repeat per host')
    parser.add_argument('--vps-ip', required=True, help='Expected VPS IPv4 address')
    parser.add_argument(
        '--vps-ipv6',
        default='',
        help='Comma-separated globally routable IPv6 addresses assigned to the VPS',
    )
    args = parser.parse_args()
    vps_ipv6 = tuple(value.strip() for value in args.vps_ipv6.split(',') if value.strip())

    try:
        check_stage_dns(args.host, args.vps_ip, vps_ipv6)
    except DNSCheckError as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1

    print(f"PASS: DNS for {', '.join(args.host)} matches the VPS address configuration")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
