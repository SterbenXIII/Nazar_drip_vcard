#!/bin/bash
# setup-vps-deploy.sh — ONE-TIME deployment setup script
# Automates: SSH key generation, VPS user creation, repo cloning, secrets setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 astro-vcard Deployment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================================
# 1. SSH KEY GENERATION
# ============================================================================

SSH_KEY_PATH="$HOME/.ssh/astro-vcard"
if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${GREEN}✓ SSH key already exists: $SSH_KEY_PATH${NC}"
else
    echo -e "${BLUE}1️⃣  Generating SSH ed25519 key...${NC}"
    ssh-keygen -t ed25519 -C "astro-vcard-deploy" -f "$SSH_KEY_PATH" -N ""
    echo -e "${GREEN}✓ SSH key generated${NC}"
fi

SSH_PUB=$(cat "${SSH_KEY_PATH}.pub")
SSH_PRIV=$(cat "$SSH_KEY_PATH")

echo ""

# ============================================================================
# 2. VPS CONNECTION INFO
# ============================================================================

echo -e "${BLUE}2️⃣  Enter VPS Connection Details${NC}"
read -p "VPS IP or hostname (e.g., 12.34.56.78): " VPS_HOST
read -p "VPS username (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}
read -sp "VPS password: " VPS_PASS
echo ""

# Test connection
echo -e "${YELLOW}Testing SSH connection...${NC}"
if sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "echo 'OK'" &>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ SSH connection failed${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 3. VPS SETUP (via post-install script)
# ============================================================================

echo -e "${BLUE}3️⃣  Setting up VPS environment...${NC}"

POST_INSTALL_SCRIPT=$(cat << 'POSTINST'
#!/bin/bash
set -e

echo "📦 Setting up VPS user and directories..."

# Create deploy user if doesn't exist
if ! id "vps_user" &>/dev/null; then
    useradd -m -s /bin/bash vps_user
    echo "vps_user created"
fi

# Add to docker group
usermod -aG docker vps_user 2>/dev/null || true

# Create SSH directory
mkdir -p /home/vps_user/.ssh
chmod 700 /home/vps_user/.ssh

# Add public key (will be passed as argument)
echo "$1" >> /home/vps_user/.ssh/authorized_keys
chmod 600 /home/vps_user/.ssh/authorized_keys
chown -R vps_user:vps_user /home/vps_user/.ssh

# Create deploy directory
mkdir -p /home/vps_user/astro-vcard
chown -R vps_user:vps_user /home/vps_user/astro-vcard

# Clone repo if not exists
if [ ! -d /home/vps_user/astro-vcard/.git ]; then
    cd /home/vps_user/astro-vcard
    sudo -u vps_user git clone https://github.com/krapeulytsia/astro-vcard.git .
fi

# Create required directories
mkdir -p /home/vps_user/astro-vcard/{backups,certbot/conf,certbot/www,apps/api/data,certs/local}
chown -R vps_user:vps_user /home/vps_user/astro-vcard

echo "✅ VPS setup complete"
POSTINST
)

# Execute post-install on VPS
echo "$POST_INSTALL_SCRIPT" | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "bash -s '$SSH_PUB'"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ VPS user and directories created${NC}"
else
    echo -e "${RED}✗ VPS setup failed${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 4. PREP .ENV FILE
# ============================================================================

echo -e "${BLUE}4️⃣  Preparing .env file${NC}"

ENV_TEMPLATE="DOMAIN_NAME=localhost
TELEGRAM_BOT_TOKEN=<your_bot_token_from_@BotFather>
TELEGRAM_MASTER_ID=<your_telegram_user_id>
BACKEND_PORT=5678
ENABLED_PROVIDERS=TELEGRAM,EMAIL
ADMIN_EMAIL=<your_email_for_ssl_certificate>
SMTP_USER=<gmail_account@gmail.com>
GMAIL_CLIENT_ID=<from_google_cloud_console>
GMAIL_CLIENT_SECRET=<from_google_cloud_console>
GMAIL_REFRESH_TOKEN=<from_oauth2_flow>
N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 16)"

echo -e "${YELLOW}Copy this template and fill in your values:${NC}"
echo ""
echo "$ENV_TEMPLATE"
echo ""
echo -e "${YELLOW}Then run:${NC}"
echo "scp -i $SSH_KEY_PATH .env vps_user@$VPS_HOST:/home/vps_user/astro-vcard/.env"
echo ""
read -p "Press Enter after uploading .env to VPS: "

echo ""

# ============================================================================
# 5. GITHUB SECRETS SETUP
# ============================================================================

echo -e "${BLUE}5️⃣  Setting up GitHub secrets${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not found. Install it: https://cli.github.com${NC}"
    echo -e "${YELLOW}Then run these commands manually:${NC}"
    echo ""
    echo "gh secret set HOSTINGER_SSH_KEY < $SSH_KEY_PATH"
    echo "gh secret set HOSTINGER_SSH_USER --body 'vps_user'"
    echo "gh secret set HOSTINGER_VPS_HOST --body '$VPS_HOST'"
    echo "gh secret set DEPLOY_PATH --body '/home/vps_user/astro-vcard'"
    echo "gh secret set TELEGRAM_BOT_TOKEN --body '<your_token>'"
    echo "gh secret set TELEGRAM_MASTER_ID --body '<your_id>'"
else
    echo -e "${YELLOW}Adding secrets via GitHub CLI...${NC}"
    gh secret set HOSTINGER_SSH_KEY < "$SSH_KEY_PATH" && echo -e "${GREEN}✓ HOSTINGER_SSH_KEY set${NC}"
    gh secret set HOSTINGER_SSH_USER --body "vps_user" && echo -e "${GREEN}✓ HOSTINGER_SSH_USER set${NC}"
    gh secret set HOSTINGER_VPS_HOST --body "$VPS_HOST" && echo -e "${GREEN}✓ HOSTINGER_VPS_HOST set${NC}"
    gh secret set DEPLOY_PATH --body "/home/vps_user/astro-vcard" && echo -e "${GREEN}✓ DEPLOY_PATH set${NC}"
fi

echo ""

# ============================================================================
# 6. NEXT STEPS
# ============================================================================

echo -e "${BLUE}6️⃣  Next Steps${NC}"
echo ""
echo -e "${YELLOW}1. Complete .env file:${NC}"
echo "   - Get TELEGRAM_BOT_TOKEN from @BotFather"
echo "   - Get your TELEGRAM_MASTER_ID"
echo "   - Set up Gmail OAuth2 (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)"
echo "   - See: DEPLOYMENT.md section 'Env Variables'"
echo ""
echo -e "${YELLOW}2. Upload .env to VPS:${NC}"
echo "   scp -i $SSH_KEY_PATH .env vps_user@$VPS_HOST:/home/vps_user/astro-vcard/.env"
echo ""
echo -e "${YELLOW}3. (Optional) Add remaining GitHub secrets:${NC}"
echo "   gh secret set TELEGRAM_BOT_TOKEN --body '<token>'"
echo "   gh secret set TELEGRAM_MASTER_ID --body '<id>'"
echo ""
echo -e "${YELLOW}4. Initialize SSL certificate on VPS:${NC}"
echo "   ssh -i $SSH_KEY_PATH vps_user@$VPS_HOST 'cd astro-vcard && make cert-init'"
echo ""
echo -e "${YELLOW}5. First deployment:${NC}"
echo "   git push origin main"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup complete! You're ready to deploy${NC}"
echo -e "${GREEN}========================================${NC}"
