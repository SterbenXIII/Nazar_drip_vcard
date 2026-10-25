#!/usr/bin/env python3
"""Extract assigned IPv6 addresses from `ip -j address` output."""

import json
import sys


def extract_vps_ipv6(payload: str) -> str:
    links = json.loads(payload)
    return ','.join(
        address['local']
        for link in links
        for address in link.get('addr_info', [])
        if isinstance(address.get('local'), str) and address['local']
    )


if __name__ == '__main__':
    print(extract_vps_ipv6(sys.stdin.read()))
