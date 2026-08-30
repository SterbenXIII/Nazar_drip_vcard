# Ansible Deployment for astro-vcard

Idempotent deployment automation for Hostinger VPS using Ansible.

## � Quick Start (Automated Setup)

**New to Ansible or setting up for the first time?**

👉 **See [GETTING_STARTED.md](GETTING_STARTED.md)** for automated setup with scripts!

**TL;DR:**

```bash
cd ansible
./check-vps.sh YOUR_VPS_IP    # Test connectivity
./setup-ssh.sh                # Automated SSH setup
# Add GitHub secrets (shown by script)
# Push to main → Automated deployment!
```

---

## �📋 Prerequisites

### DNS Setup (Важливо!)

**Перед деплойментом налаштуйте DNS для вашого домену:**

👉 **Див. [DNS_SETUP.md](DNS_SETUP.md)** — повна інструкція по налаштуванню nameservers та A-записів!

### Local Machine

```bash
# Install Ansible (macOS)
brew install ansible

# Or (Ubuntu/Debian)
sudo apt install ansible

# Install required collections
cd ansible
ansible-galaxy collection install -r requirements.yml
```

### VPS Server

- Ubuntu 20.04+ (Hostinger VPS)
- SSH access with key-based authentication
- User with sudo privileges

## 🗂️ Structure

```
ansible/
├── ansible.cfg          # Ansible configuration
├── inventory.ini        # Server inventory
├── playbook.yml         # Main deployment playbook
├── env.j2              # Environment file template
├── requirements.yml     # Ansible collections
├── setup-ssh.sh        # Automated SSH setup script
├── check-vps.sh        # VPS connectivity diagnostic
├── README.md           # This file
├── DNS_SETUP.md        # DNS nameservers setup guide
├── SSH_SETUP.md        # Detailed SSH setup guide
├── MIGRATION.md        # Migration guide
├── GETTING_STARTED.md  # Quick start guide
├── TROUBLESHOOTING.md  # Connection issues guide
└── QUICKREF.md         # Quick command reference
```

## 🔐 SSH Key Setup

### 🚀 Automated Setup (Recommended)

Use the automated script for quick setup:

```bash
cd ansible
./setup-ssh.sh
```

The script will:

- ✅ Generate SSH key pair (ed25519)
- ✅ Test VPS connectivity
- ✅ Copy public key to VPS
- ✅ Verify key-based authentication
- ✅ Update Ansible inventory
- ✅ Display GitHub Secrets instructions

### 📋 Manual Setup (Alternative)

#### 1. Generate SSH Key (if needed)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vps_deploy_ed25519
```

#### 2. Add Public Key to VPS

```bash
# Copy public key to VPS
ssh-copy-id -i ~/.ssh/vps_deploy.pub vps_user@YOUR_VPS_IP

# Or manually
cat ~/.ssh/vps_deploy.pub | ssh vps_user@YOUR_VPS_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Add Private Key to GitHub Secrets

```bash
# Display private key (copy entire output including headers)
cat ~/.ssh/vps_deploy
```

Go to GitHub Repository → Settings → Secrets and Variables → Actions → New repository secret:

- Name: `HOSTINGER_SSH_KEY`
- Value: (paste entire private key content)

## 🚀 Manual Deployment

### Local Testing

```bash
cd ansible

# Check connectivity
ansible vps -i inventory.ini -m ping

# Dry run (check mode)
ansible-playbook playbook.yml --check --diff

# Deploy
ansible-playbook playbook.yml
```

### Using Environment Variables

```bash
export HOSTINGER_VPS_HOST="YOUR_VPS_IP"
export HOSTINGER_SSH_USER="vps_user"
export DEPLOY_PATH="/home/vps_user/astro-vcard"
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_MASTER_ID="your_id"
# Set this only in a protected operator environment; never commit or log the IDs.
export TELEGRAM_ALLOWED_CHAT_IDS="<comma-separated numeric IDs>"

ansible-playbook playbook.yml
```

The canonical production deployment requires `TELEGRAM_ALLOWED_CHAT_IDS`. Ansible rewrites `apps/api/allowed_chats.json` on every run with mode `0600`. The manual SSH and SSL workflows do not transport this secret; ensure the protected allowlist already exists on the VPS before running `make rebuild` through either workflow.

## 🔧 Configuration

### inventory.ini

Update the VPS IP and user:

```ini
[vps]
hostinger-vps ansible_host=YOUR_VPS_IP

[vps:vars]
ansible_user=vps_user
deploy_path=/home/vps_user/astro-vcard
domain_name=krapelnytsia.com.ua
```

### ansible.cfg

Default settings are configured for CI/CD. Key options:

- `host_key_checking = False` - Disabled for CI/CD (security tradeoff)
- `diff_mode = True` - Show diffs when files change
- `gathering = explicit` - Only gather facts when needed

## 🎯 Playbook Tasks

The playbook performs these tasks **idempotently**:

### 1. System Check

- ✅ Verify Docker installation
- 📦 Install Docker if missing
- 🔍 Check Docker Compose plugin

### 2. Network Management

- 🌐 Create `web-gateway` Docker network if missing

### 3. Project Setup

- 📁 Create project directory structure
- 📥 Pull latest code from Git
- 📋 Ensure required files exist

### 4. Environment Configuration

- 🔐 Generate `.env` from template
- ✅ Verify environment file

### 5. Docker Orchestration

- 🏗️ Pull latest Docker images
- 🚀 Build and start services
- 🔄 Deploy proxy (if SSL configured)

### 6. Permissions

- 🔐 Set correct permissions for SQLite data directory
- 📝 Ensure database file is writable

### 7. Cleanup

- 🧹 Remove dangling Docker images
- 💾 Save disk space

### 8. Health Checks

- 🔍 Verify containers are running
- ✅ Check API health endpoint

## 🔍 Troubleshooting

### Check Ansible connectivity

```bash
ansible vps -i inventory.ini -m ping
```

### Verbose output

```bash
ansible-playbook playbook.yml -v    # verbose
ansible-playbook playbook.yml -vv   # more verbose
ansible-playbook playbook.yml -vvv  # debug
```

### Run specific tags

```bash
# Only Docker tasks
ansible-playbook playbook.yml --tags docker

# Only environment setup
ansible-playbook playbook.yml --tags env,config

# Skip cleanup
ansible-playbook playbook.yml --skip-tags cleanup
```

### Test without changes

```bash
ansible-playbook playbook.yml --check --diff
```

## 📊 Available Tags

| Tag           | Description                    |
| ------------- | ------------------------------ |
| `docker`      | Docker installation/management |
| `network`     | Docker network setup           |
| `project`     | Project directory setup        |
| `git`         | Git operations                 |
| `env`         | Environment configuration      |
| `deploy`      | Docker Compose deployment      |
| `permissions` | File permissions               |
| `cleanup`     | Docker image cleanup           |
| `health`      | Health checks                  |

## 🤖 GitHub Actions Integration

The playbook is designed to be called from GitHub Actions. See `.github/workflows/deploy.yml` for the complete workflow.

### Production deployment contract

- Use one canonical repository path on the VPS: the GitHub Actions `DEPLOY_PATH` repository variable. All deployment and rollback workflows default to `/home/emerald-recovery`; set the variable explicitly if the VPS uses another path.
- The API listens on port `5678` **only inside the Docker `web-gateway` network**. It is not a public VPS port and must not be used for CI smoke checks.
- Deployment and rollback verification use the public proxy endpoints `https://DOMAIN_NAME/` and `https://DOMAIN_NAME/api/health`, then verify the production Content-Security-Policy header. Each check retries before failing with endpoint and HTTP-status context.
- Deployment failures fail the workflow. Telegram notifications are best-effort only and must not turn a failed deployment into a successful workflow.

### Rollback safety

The rollback workflow deploys a previously built image tag through the same Ansible playbook and uses the same `DEPLOY_PATH` and public HTTPS checks. It recreates application/proxy containers as needed but **does not delete Docker volumes or the SQLite database**. Do not add `docker compose down --volumes`, `docker volume rm`, or prune commands with `--volumes` to rollback steps.

### Required GitHub Secrets

| Secret                           | Description                                                   |
| -------------------------------- | ------------------------------------------------------------- |
| `HOSTINGER_SSH_KEY`              | Private SSH key (ed25519)                                     |
| `HOSTINGER_VPS_HOST`             | VPS IP address                                                |
| `HOSTINGER_SSH_USER`             | SSH user (e.g., vps_user)                                     |
| `DEPLOY_PATH`                    | Project path on VPS                                           |
| `TELEGRAM_BOT_TOKEN`             | Telegram bot token                                            |
| `TELEGRAM_MASTER_ID`             | Telegram admin user ID                                        |
| `TELEGRAM_ALLOWED_CHAT_IDS`      | Comma-separated numeric Telegram IDs (required in production) |
| `SMTP_USER`                      | Gmail address                                                 |
| `GMAIL_CLIENT_ID`                | Google OAuth client ID                                        |
| `GMAIL_CLIENT_SECRET`            | Google OAuth client secret                                    |
| `GMAIL_REFRESH_TOKEN`            | Google OAuth refresh token                                    |
| `ADMIN_EMAIL`                    | Email for lead notifications                                  |
| `N8N_PORT`                       | n8n port (default: 5679)                                      |
| `N8N_HOST`                       | n8n public host                                               |
| `N8N_PROTOCOL`                   | n8n protocol (default: https)                                 |
| `N8N_ENCRYPTION_KEY`             | Persistent n8n encryption key (required in production)        |
| `N8N_COMMUNITY_PACKAGES_ENABLED` | Enable n8n community packages                                 |
| `GENERIC_TIMEZONE`               | n8n timezone (default: Europe/Kyiv)                           |
| `POSTGRES_PASSWORD`              | PostgreSQL password                                           |
| `POSTGRES_NON_ROOT_USER`         | n8n PostgreSQL user (default: n8n)                            |
| `POSTGRES_NON_ROOT_PASSWORD`     | PostgreSQL password (required in production)                  |
| `PUBLIC_GSC_VERIFICATION`        | Google Search Console token (optional)                        |

## 🔒 Security Notes

1. **SSH Keys**: Use ed25519 keys (more secure than RSA)
2. **Permissions**: `.env` file is created with `0600` permissions
3. **Secrets**: Never commit `.env` or private keys to Git
4. **Network**: `web-gateway` network isolates containers
5. **Host Key Checking**: Disabled for CI/CD, but SSH keys are verified

## 📚 Further Reading

- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Compose V2 Module](https://docs.ansible.com/ansible/latest/collections/community/docker/docker_compose_v2_module.html)
- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
