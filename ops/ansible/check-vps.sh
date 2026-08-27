#!/usr/bin/env bash
# ==============================================================================
# VPS Connectivity Diagnostic Script
# ==============================================================================
# Quick check to verify VPS is reachable before running setup-ssh.sh
# ==============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=======================================${NC}"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}  ✓ PASS${NC} $1"
}

print_fail() {
    echo -e "${RED}  ✗ FAIL${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}  ⚠ WARN${NC} $1"
}

# Get VPS IP from user
if [ -z "${1:-}" ]; then
    echo -e "${YELLOW}Usage: $0 <VPS_IP> [SSH_PORT]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 123.45.67.89"
    echo "  $0 vps.example.com 2222"
    echo ""
    read -p "Enter VPS IP or hostname: " VPS_HOST
else
    VPS_HOST="$1"
fi

SSH_PORT="${2:-22}"

ALL_PASSED=true

print_header "VPS Connectivity Diagnostic"
echo "Target: $VPS_HOST:$SSH_PORT"
echo ""

# Test 1: DNS Resolution (if hostname)
if [[ ! "$VPS_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_test "DNS Resolution"
    if resolved=$(dig +short "$VPS_HOST" 2>/dev/null | head -n1); then
        if [ -n "$resolved" ]; then
            print_pass "Resolved to $resolved"
        else
            print_fail "Cannot resolve hostname"
            ALL_PASSED=false
        fi
    else
        print_warn "dig not available, skipping DNS test"
    fi
    echo ""
fi

# Test 2: ICMP Ping
print_test "ICMP Ping (network reachability)"
if ping -c 2 -W 3 "$VPS_HOST" >/dev/null 2>&1; then
    print_pass "VPS responds to ping"
else
    print_fail "VPS does not respond to ping"
    print_warn "ICMP might be blocked (not necessarily a problem)"
    echo "        Some VPSes disable ping for security"
fi
echo ""

# Test 3: Port Scan
print_test "Port $SSH_PORT availability"

# Try nc first
if command -v nc >/dev/null 2>&1; then
    if timeout 5 nc -zv "$VPS_HOST" "$SSH_PORT" 2>&1 | grep -q succeeded; then
        print_pass "Port $SSH_PORT is open"
    else
        print_fail "Port $SSH_PORT is closed or filtered"
        ALL_PASSED=false
    fi
# Fallback to telnet
elif command -v telnet >/dev/null 2>&1; then
    if timeout 5 bash -c "echo quit | telnet $VPS_HOST $SSH_PORT" 2>&1 | grep -q Connected; then
        print_pass "Port $SSH_PORT is open"
    else
        print_fail "Port $SSH_PORT is closed or filtered"
        ALL_PASSED=false
    fi
# Fallback to nmap
elif command -v nmap >/dev/null 2>&1; then
    if nmap -p "$SSH_PORT" "$VPS_HOST" 2>/dev/null | grep -q open; then
        print_pass "Port $SSH_PORT is open"
    else
        print_fail "Port $SSH_PORT is closed or filtered"
        ALL_PASSED=false
    fi
else
    print_warn "No port scanning tool available (nc/telnet/nmap)"
    print_warn "Cannot verify port availability"
fi
echo ""

# Test 4: SSH Banner
print_test "SSH service response"
if timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no \
    -p "$SSH_PORT" "nonexistentuser@$VPS_HOST" 2>&1 | grep -qE "(Permission denied|publickey|password)"; then
    print_pass "SSH service is responding"
else
    ssh_result=$(timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes \
        -o StrictHostKeyChecking=no -p "$SSH_PORT" "nonexistentuser@$VPS_HOST" 2>&1 || true)

    if echo "$ssh_result" | grep -q "Connection refused"; then
        print_fail "SSH service refused connection (not running)"
        ALL_PASSED=false
    elif echo "$ssh_result" | grep -q "No route to host"; then
        print_fail "No route to host (VPS down or firewall)"
        ALL_PASSED=false
    elif echo "$ssh_result" | grep -q "timed out"; then
        print_fail "Connection timed out (firewall or network issue)"
        ALL_PASSED=false
    else
        print_warn "SSH test inconclusive"
        echo "        Response: $ssh_result"
    fi
fi
echo ""

# Test 5: Traceroute
print_test "Network path to VPS"
if command -v traceroute >/dev/null 2>&1; then
    hops=$(traceroute -m 15 -w 2 "$VPS_HOST" 2>/dev/null | grep -c " ms" || echo "0")
    if [ "$hops" -gt 0 ]; then
        print_pass "Network path found ($hops hops)"
    else
        print_warn "Traceroute failed or no response"
    fi
else
    print_warn "traceroute not available"
fi
echo ""

# Summary
print_header "Diagnostic Summary"

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo ""
    echo "You can proceed with SSH setup:"
    echo "  cd ansible"
    echo "  ./setup-ssh.sh"
    echo ""
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Possible issues:"
    echo "  1. VPS is not running (check Hostinger control panel)"
    echo "  2. Firewall blocking SSH port $SSH_PORT"
    echo "  3. Wrong IP address or hostname"
    echo "  4. Network connectivity problems"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Verify VPS is running in Hostinger panel"
    echo "  2. Check you're using PUBLIC IP (not VPS ID number)"
    echo "  3. Try accessing via Hostinger web console"
    echo "  4. Review: ansible/TROUBLESHOOTING.md"
    echo ""
fi

# Additional info
echo "Debug information:"
echo "  VPS: $VPS_HOST"
echo "  SSH Port: $SSH_PORT"
echo "  Your IP: $(curl -s ifconfig.me 2>/dev/null || echo 'unknown')"
echo ""

if [ "$ALL_PASSED" = true ]; then
    exit 0
else
    exit 1
fi
