#!/usr/bin/env bash
# ==============================================================================
# Automated SSH Key Setup for VPS Deployment
# ==============================================================================
# This script automates the process of:
# 1. Generating SSH key pair (ed25519)
# 2. Copying public key to VPS
# 3. Testing connection
# 4. Displaying instructions for GitHub Secrets
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KEY_NAME="vps_deploy_ed25519"
KEY_PATH="$HOME/.ssh/${KEY_NAME}"
COMMENT="github-actions-deploy-$(date +%Y%m%d)"

# Functions
print_header() {
    echo -e "${BLUE}=======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=======================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"

    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${prompt}${NC} [${default}]: )" value
        eval "$var_name=\"${value:-$default}\""
    else
        read -p "$(echo -e ${BLUE}${prompt}${NC}: )" value
        eval "$var_name=\"$value\""
    fi
}

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check for ssh-keygen
    if ! command -v ssh-keygen &> /dev/null; then
        print_error "ssh-keygen not found. Please install OpenSSH."
        exit 1
    fi
    print_success "ssh-keygen found"

    # Check for ssh
    if ! command -v ssh &> /dev/null; then
        print_error "ssh not found. Please install OpenSSH."
        exit 1
    fi
    print_success "ssh found"

    # Check for ssh-copy-id
    if ! command -v ssh-copy-id &> /dev/null; then
        print_warning "ssh-copy-id not found. Will use alternative method."
        HAS_SSH_COPY_ID=false
    else
        print_success "ssh-copy-id found"
        HAS_SSH_COPY_ID=true
    fi

    echo ""
}

generate_ssh_key() {
    print_header "Generating SSH Key Pair"

    if [ -f "$KEY_PATH" ]; then
        print_warning "SSH key already exists at $KEY_PATH"
        prompt_input "Overwrite existing key? (yes/no)" OVERWRITE "no"

        if [ "$OVERWRITE" != "yes" ]; then
            print_info "Using existing key"
            return 0
        fi

        print_info "Backing up existing key..."
        mv "$KEY_PATH" "${KEY_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "${KEY_PATH}.pub" "${KEY_PATH}.pub.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    print_info "Generating ed25519 key (no passphrase for CI/CD)..."
    ssh-keygen -t ed25519 -C "$COMMENT" -f "$KEY_PATH" -N ""

    if [ $? -eq 0 ]; then
        print_success "Key pair generated successfully"
        print_info "Private key: $KEY_PATH"
        print_info "Public key: ${KEY_PATH}.pub"
        chmod 600 "$KEY_PATH"
        chmod 644 "${KEY_PATH}.pub"
    else
        print_error "Failed to generate key pair"
        exit 1
    fi

    echo ""
}

get_vps_details() {
    print_header "VPS Connection Details"

    prompt_input "VPS IP address or hostname" VPS_HOST ""
    prompt_input "SSH username" VPS_USER "root"
    prompt_input "SSH port" VPS_PORT "22"

    # Validate IP/hostname
    if [ -z "$VPS_HOST" ]; then
        print_error "VPS host cannot be empty"
        exit 1
    fi

    echo ""
}

test_connection() {
    print_header "Testing VPS Connectivity"

    print_info "Testing SSH connection to ${VPS_USER}@${VPS_HOST}:${VPS_PORT}..."

    # Test with timeout
    if timeout 10 ssh -p "$VPS_PORT" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "echo 'Connection successful'" 2>/dev/null; then
        print_success "VPS is reachable"
        return 0
    else
        print_error "Cannot connect to VPS"
        print_info "Possible reasons:"
        echo "  1. VPS is not running"
        echo "  2. Firewall blocking SSH port $VPS_PORT"
        echo "  3. Network connectivity issues"
        echo "  4. Incorrect IP/hostname"
        echo ""
        prompt_input "Continue anyway? (yes/no)" CONTINUE "no"

        if [ "$CONTINUE" != "yes" ]; then
            print_info "Aborted. Please check VPS connectivity and try again."
            exit 1
        fi
    fi

    echo ""
}

copy_public_key() {
    print_header "Copying Public Key to VPS"

    if [ "$HAS_SSH_COPY_ID" = true ]; then
        print_info "Using ssh-copy-id..."

        if ssh-copy-id -i "${KEY_PATH}.pub" -p "$VPS_PORT" "${VPS_USER}@${VPS_HOST}"; then
            print_success "Public key copied successfully"
        else
            print_error "Failed to copy public key"
            print_info "Falling back to manual method..."
            HAS_SSH_COPY_ID=false
        fi
    fi

    if [ "$HAS_SSH_COPY_ID" = false ]; then
        print_info "Using manual copy method..."
        print_warning "You will be prompted for your VPS password"

        cat "${KEY_PATH}.pub" | ssh -p "$VPS_PORT" "${VPS_USER}@${VPS_HOST}" \
            "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Key copied successfully'"

        if [ $? -eq 0 ]; then
            print_success "Public key copied successfully"
        else
            print_error "Failed to copy public key"
            echo ""
            print_info "Manual instructions:"
            echo "1. SSH into your VPS: ssh -p $VPS_PORT ${VPS_USER}@${VPS_HOST}"
            echo "2. Run: mkdir -p ~/.ssh && chmod 700 ~/.ssh"
            echo "3. Edit: nano ~/.ssh/authorized_keys"
            echo "4. Paste this public key:"
            echo ""
            cat "${KEY_PATH}.pub"
            echo ""
            exit 1
        fi
    fi

    echo ""
}

verify_key_auth() {
    print_header "Verifying Key-Based Authentication"

    print_info "Testing SSH connection with key..."

    if ssh -i "$KEY_PATH" -p "$VPS_PORT" -o PasswordAuthentication=no \
        -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" "echo 'Authentication successful'"; then
        print_success "Key-based authentication working!"
    else
        print_error "Key-based authentication failed"
        print_info "Troubleshooting steps:"
        echo "  1. Check ~/.ssh/authorized_keys on VPS contains the public key"
        echo "  2. Verify permissions: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
        echo "  3. Check /var/log/auth.log on VPS for errors"
        exit 1
    fi

    echo ""
}

display_github_instructions() {
    print_header "GitHub Secrets Configuration"

    echo "Add these secrets to your GitHub repository:"
    echo ""
    echo -e "${YELLOW}1. HOSTINGER_SSH_KEY${NC}"
    echo "   Go to: Repository → Settings → Secrets → Actions → New secret"
    echo "   Name: HOSTINGER_SSH_KEY"
    echo "   Value: (copy command below)"
    echo ""
    echo -e "${BLUE}   # macOS (copy to clipboard):${NC}"
    echo "   cat $KEY_PATH | pbcopy"
    echo ""
    echo -e "${BLUE}   # Linux (display):${NC}"
    echo "   cat $KEY_PATH"
    echo ""
    echo -e "${BLUE}   # Or copy the locally generated key into the GitHub secret:${NC}"
    echo "   HOSTINGER_SSH_KEY must contain the contents of $KEY_PATH."
    echo ""

    echo -e "${YELLOW}2. HOSTINGER_VPS_HOST${NC}"
    echo "   Name: HOSTINGER_VPS_HOST"
    echo "   Value: $VPS_HOST"
    echo ""

    echo -e "${YELLOW}3. HOSTINGER_SSH_USER${NC}"
    echo "   Name: HOSTINGER_SSH_USER"
    echo "   Value: $VPS_USER"
    echo ""

    echo -e "${YELLOW}4. DEPLOY_PATH${NC}"
    echo "   Name: DEPLOY_PATH"
    prompt_input "   Project path on VPS" DEPLOY_PATH "/home/${VPS_USER}/astro-vcard"
    echo "   Value: $DEPLOY_PATH"
    echo ""

    print_info "Summary for GitHub Secrets:"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║ HOSTINGER_SSH_KEY    = <private key content>              ║"
    echo "║ HOSTINGER_VPS_HOST   = $VPS_HOST"
    printf "║ HOSTINGER_SSH_USER   = %-36s║\n" "$VPS_USER"
    printf "║ DEPLOY_PATH          = %-36s║\n" "$DEPLOY_PATH"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

update_ansible_inventory() {
    print_header "Updating Ansible Inventory"

    INVENTORY_FILE="$(dirname "$0")/inventory.ini"

    if [ ! -f "$INVENTORY_FILE" ]; then
        print_warning "inventory.ini not found at $INVENTORY_FILE"
        return
    fi

    print_info "Updating $INVENTORY_FILE with VPS details..."

    # Create backup
    cp "$INVENTORY_FILE" "${INVENTORY_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

    # Update inventory (preserve template variables)
    sed -i.tmp "s|ansible_host={{ lookup.*|ansible_host=$VPS_HOST|g" "$INVENTORY_FILE"
    sed -i.tmp "s|ansible_user={{ lookup.*|ansible_user=$VPS_USER|g" "$INVENTORY_FILE"

    # For deploy_path, only update the default value
    sed -i.tmp "s|deploy_path={{ lookup('env', 'DEPLOY_PATH') or '.*'|deploy_path={{ lookup('env', 'DEPLOY_PATH') or '$DEPLOY_PATH'|g" "$INVENTORY_FILE"

    rm -f "${INVENTORY_FILE}.tmp"

    print_success "Inventory updated"
    echo ""
}

test_ansible_connection() {
    print_header "Testing Ansible Connection"

    if ! command -v ansible &> /dev/null; then
        print_warning "Ansible not installed. Skipping Ansible connectivity test."
        print_info "Install with: brew install ansible (macOS) or pip install ansible"
        return
    fi

    INVENTORY_FILE="$(dirname "$0")/inventory.ini"

    if [ ! -f "$INVENTORY_FILE" ]; then
        print_warning "inventory.ini not found. Skipping Ansible test."
        return
    fi

    print_info "Testing Ansible ping..."

    cd "$(dirname "$0")"

    if ansible vps -i inventory.ini -m ping --private-key "$KEY_PATH" 2>/dev/null; then
        print_success "Ansible can connect to VPS"
    else
        print_error "Ansible connection failed"
        print_info "Manual test: cd ansible && ansible vps -i inventory.ini -m ping --private-key $KEY_PATH"
    fi

    echo ""
}

final_summary() {
    print_header "Setup Complete!"

    print_success "SSH key generated and deployed"
    print_success "Key-based authentication verified"

    echo ""
    echo "Next steps:"
    echo "  1. Add secrets to GitHub (see instructions above)"
    echo "  2. Test Ansible locally:"
    echo "     cd ansible"
    echo "     ansible vps -i inventory.ini -m ping --private-key $KEY_PATH"
    echo "  3. Deploy with Ansible:"
    echo "     ansible-playbook playbook.yml --private-key $KEY_PATH"
    echo "  4. Push to main branch to trigger CI/CD"
    echo ""

    print_info "Private key location: $KEY_PATH"
    print_info "Keep this key secure and never commit it to Git!"
    echo ""
}

# Main execution
main() {
    print_header "Automated SSH Key Setup for VPS"
    echo ""

    check_prerequisites
    generate_ssh_key
    get_vps_details
    test_connection
    copy_public_key
    verify_key_auth
    display_github_instructions
    update_ansible_inventory
    test_ansible_connection
    final_summary
}

# Run main function
main "$@"
