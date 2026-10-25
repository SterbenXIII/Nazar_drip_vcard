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

- `host_key_checking = True` - SSH host identity verification is required
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

- Deploy `apps/api`, `apps/clinic-web`, and Caddy from immutable commit-SHA images. The canonical production Compose invocation does not start `apps/web`, n8n, or PostgreSQL.
- `VPS_IP` is the public IPv4 address used for SSH. The stage hostname is fixed in the workflows to `havenhub.tech`; Caddy serves the apex and `www` over HTTPS. `DEPLOY_PATH` defaults to `/home/emerald-recovery`.
- Inbound TCP ports 80 and 443 must reach this VPS. The published apex and `www` A/AAAA records must all route to this server before Caddy can obtain and renew public certificates.
- The stage build uses `CLINIC_SITE_MODE=staging` with `noindex,nofollow` and Caddy Basic Auth. Authenticated HTTPS lead submissions reach the API and use the configured Telegram notification provider; HTTP requests redirect to HTTPS. The API persists submissions in its existing SQLite store. API port `5678` remains internal to `web-gateway`.
- Deployment and rollback verify authenticated `https://havenhub.tech/`, `https://www.havenhub.tech/`, and the API health endpoint. They also verify unauthenticated access receives 401, HTTP lead requests redirect with 308, and an invalid HTTPS lead payload reaches API validation and receives 400 without sending a notification or saving a lead.
- A public production release remains separate: it requires owner-approved content, a gated production SEO build with the approved canonical origin, and explicit release review. The stage intentionally has no HSTS policy.

### Verified live staging rollout

On 2026-10-25, CI run `40223729739` and deploy run `40223918442` released commit
`abb4878c023c7f61eeeebeee579acf35f46cd569`. API image digest:
`sha256:e19a3f36998ddecc822689e4b0c4aef0b221f8f5d17da8d1913128a886241e1b`;
clinic-web image digest:
`sha256:f3fb62289eee1c40faf38a89ec201f3372e25a1ced982f68d46d8fd6a5d7ceee`.
Ansible health checks and public smoke checks passed for both `havenhub.tech`
and `www.havenhub.tech`: authenticated homepage/API health returned 200,
unauthenticated and invalid credentials returned 401, HTTP redirected with 308,
lead submissions returned 403 over HTTP and HTTPS, and staging robots metadata
was present. This confirms staging only; historical credential rotation, daily
SQLite backup/restore, external port `5678` reachability, and live rollback are
not verified. That deployed SHA predates staging lead submissions; the updated
Telegram delivery path is not live until CD deploys this change and a real,
authorized submission is confirmed in Telegram.

### Rollback safety

Every successful deploy records both `releases/<sha>.json` and the atomically updated `releases/current.json`. Before either a deploy or rollback changes the checkout or containers, Ansible validates the current manifest and snapshots an existing SQLite database from its recorded API image into `backups/`. The snapshot directory is mode `0700`; verified snapshots are mode `0600` and must pass SQLite `integrity_check`. A first launch with no existing data skips the snapshot. Existing volumes without a valid current manifest, missing prior images, or failed backups block recreation.

Manual rollback accepts only a full lowercase SHA whose release manifest is on the VPS, whose commit is an ancestor of `main`, and whose CI and deploy workflow runs succeeded. It verifies the manifest's digest images are pullable and their OCI revisions match the SHA before Ansible runs. The current release SHA cannot be selected. After service recreation, HTTPS/auth/health and API validation checks must pass before `current.json` changes.

Ansible atomically writes `releases/reconciliation-required.json` immediately before Compose recreation. The marker includes the candidate SHA and image digests, previous successful SHA, and snapshot path. The workflow removes it only after the release manifest/current pointer has been recorded following successful smoke checks. A remaining marker blocks all later deploys and rollbacks until an operator reconciles the running containers, checkout, backup and SQLite schema. On failure, the workflow reports the previous successful SHA and available snapshot path. No automatic rollback runs because forward-only migrations may make the old API incompatible with the current database.

The backup uses SQLite's backup API rather than copying `leads.db` or its WAL sidecars. It **does not delete Docker volumes or the SQLite database**. Do not add `docker compose down --volumes`, `docker volume rm`, or prune commands with `--volumes` to deployment or rollback steps.

The application rollback contract is limited: an older image is supported only when its migrations remain readable with the existing database schema. The repository has forward-only startup migrations and no general backward-compatibility guarantee. If an older image cannot read the schema, restore from the pre-rollback SQLite backup instead of assuming that image replacement alone is safe.
The VPS provider currently backs up weekly. Before enabling lead collection for a public release, add a separate daily SQLite backup and verify a restore; the rollback snapshot is not a scheduled backup.

### Ubuntu 26.04 deployment rehearsal

Run `bash tests/deployment/ubuntu2604_lab.sh` from the repository root on a machine with Multipass, Docker-compatible network access, and at least 4 CPUs, 6 GB RAM, and 32 GB free disk. The script creates a uniquely named disposable Ubuntu 26.04 VM, confirms Docker is absent, bootstraps Docker with the production Ansible task, then uses synthetic Telegram/auth values and a local bare Git remote to test first deploy, same-SHA idempotency, stale-SHA rejection, missing-image/backup refusal, update, reconciliation blocking, SQLite backup integrity, and rollback. It deletes the VM on exit and keeps the run log under `/tmp/clinic-cd-ubuntu2604-*.log`. The lab-only Ansible path is accepted only for `localhost`, `/opt/clinic-cd-lab/`, and local image names tagged with the full release SHA. It does not verify public DNS, public TLS, GitHub Actions credentials, or a live VPS.

If a real deployment leaves `releases/reconciliation-required.json`, do not start another deploy or rollback and do not delete the marker. Compare the marker's candidate SHA and backup path with `git -C "$DEPLOY_PATH" rev-parse HEAD`, the running `vcard-api`/`vcard-clinic-web` image references and OCI revision labels, the current manifest, the named `api_data` volume, and a read-only SQLite `integrity_check`/schema check against the recorded backup. Run the authenticated staging smoke checks before deciding which release is actually serving traffic. Only after the running image pair, checkout, database schema, and backup agree may an operator atomically record the verified release manifest/current pointer and remove the marker; if they do not agree, preserve the volume and backup and restore from the verified snapshot using the documented SQLite recovery procedure. Never infer that the previous image is safe just because it is available: migrations are forward-only.

### Notification provider contract

The VPS sets `ENABLED_PROVIDERS=TELEGRAM`; `TELEGRAM_BOT_TOKEN` is required. Email remains available to other environments but is not configured in this deployment. `TELEGRAM_ALLOWED_CHAT_IDS` is required as comma-separated numeric IDs and is written to `apps/api/allowed_chats.json` with mode `0600` and `no_log: true`.

### GitHub Actions variables and secrets

Set these in repository settings before running deployment:

| Name                        | Type     | Requirement | Purpose                                                      |
| --------------------------- | -------- | ----------- | ------------------------------------------------------------ |
| `VPS_IP`                    | Variable | Required    | Public VPS IPv4 for SSH                                      |
| `DEPLOY_PATH`               | Variable | Optional    | VPS checkout path; defaults to `/home/emerald-recovery`      |
| `HOSTINGER_SSH_KEY`         | Secret   | Required    | Private deployment key                                       |
| `HOSTINGER_SSH_USER`        | Secret   | Required    | VPS SSH account                                              |
| `HOSTINGER_SSH_KNOWN_HOSTS` | Secret   | Required    | Pinned SSH host key entry for the VPS                        |
| `STAGE_BASIC_AUTH_PASSWORD` | Secret   | Required    | Stage password, at least 16 characters; user name is `stage` |
| `TELEGRAM_BOT_TOKEN`        | Secret   | Required    | Bot credential for API and workflow notifications            |
| `TELEGRAM_MASTER_ID`        | Secret   | Required    | Primary notification recipient                               |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Secret   | Required    | Comma-separated numeric production allowlist                 |
| `TELEGRAM_NOTIFY_IDS`       | Secret   | Optional    | Additional notification recipients                           |
| `WEBHOOK_SECRET`            | Secret   | Optional    | Shared secret for authenticated Telegram webhook requests    |

The stage hostname is fixed to `havenhub.tech`; no `DOMAIN_NAME` variable is required. Actions provides `GITHUB_TOKEN`; the workflow grants `packages: write` to publish GHCR images and Ansible uses it to pull private images. Do not create a separate `GITHUB_TOKEN` secret.
Actions derives the Caddy password hash from `STAGE_BASIC_AUTH_PASSWORD`; only the hash is passed to Caddy. The plaintext is used for authenticated smoke checks and is not written to the VPS.
The provided VPS account is `root`; current workflows use that same privileged SSH identity for Docker login, pulls, Compose, verification and cleanup.
Manual `make up` and `make rebuild` runs require `STAGE_BASIC_AUTH_HASH`; they stop before modifying the stack when it is absent. `make verify-deploy` requires `STAGE_BASIC_AUTH_PASSWORD` for its authenticated checks.
Generate a manual Caddy hash interactively with the pinned runtime image:

```sh
docker run --rm -it docker.io/library/caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f caddy hash-password
```

Keep the plaintext password out of `.env` and Git.

## 🔒 Security Notes

1. **SSH Keys**: Use ed25519 keys (more secure than RSA)
2. **Permissions**: `.env` file is created with `0600` permissions
3. **Secrets**: Never commit `.env` or private keys to Git
4. **Network**: `web-gateway` network isolates containers
5. **Host Key Checking**: Enabled; the workflow verifies the pinned VPS host key

## 📚 Further Reading

- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Compose V2 Module](https://docs.ansible.com/ansible/latest/collections/community/docker/docker_compose_v2_module.html)
- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
