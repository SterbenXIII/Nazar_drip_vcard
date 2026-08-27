# Ansible Quick Reference

## 🚀 Common Commands

### Connectivity

```bash
# Test connection to VPS
ansible vps -i inventory.ini -m ping

# Test with custom key
ansible vps -i inventory.ini -m ping --private-key ~/.ssh/vps_deploy_ed25519

# Gather facts about VPS
ansible vps -i inventory.ini -m setup
```

### Playbook Execution

```bash
# Dry run (check mode - no changes)
ansible-playbook playbook.yml --check

# Dry run with diff (show what would change)
ansible-playbook playbook.yml --check --diff

# Normal execution
ansible-playbook playbook.yml

# With custom SSH key
ansible-playbook playbook.yml --private-key ~/.ssh/vps_deploy_ed25519

# Verbose output (add more 'v' for more verbosity)
ansible-playbook playbook.yml -v
ansible-playbook playbook.yml -vv
ansible-playbook playbook.yml -vvv

# Run specific tags only
ansible-playbook playbook.yml --tags docker,network
ansible-playbook playbook.yml --tags env,deploy

# Skip specific tags
ansible-playbook playbook.yml --skip-tags cleanup

# Override variables
ansible-playbook playbook.yml \
  -e "domain_name=example.com" \
  -e "backend_port=8080"
```

### Ad-hoc Commands

```bash
# Check disk space
ansible vps -i inventory.ini -m shell -a "df -h"

# Check Docker containers
ansible vps -i inventory.ini -m shell -a "docker ps"

# Check Docker networks
ansible vps -i inventory.ini -m shell -a "docker network ls"

# View logs
ansible vps -i inventory.ini -m shell -a "docker logs vcard-api --tail 50"

# Restart specific service
ansible vps -i inventory.ini -m shell -a "docker restart vcard-api"

# Check system info
ansible vps -i inventory.ini -m shell -a "uname -a"

# Check memory usage
ansible vps -i inventory.ini -m shell -a "free -h"
```

### Debugging

```bash
# Syntax check
ansible-playbook playbook.yml --syntax-check

# List all tasks
ansible-playbook playbook.yml --list-tasks

# List all tags
ansible-playbook playbook.yml --list-tags

# List all hosts
ansible vps -i inventory.ini --list-hosts

# Step-by-step execution (interactive)
ansible-playbook playbook.yml --step

# Start at specific task
ansible-playbook playbook.yml --start-at-task="🚀 Deploy with Docker Compose"
```

## 📋 Useful Flags

| Flag                  | Description            |
| --------------------- | ---------------------- |
| `-i`                  | Specify inventory file |
| `-e`                  | Extra variables        |
| `-v` / `-vv` / `-vvv` | Verbosity levels       |
| `--check`             | Dry run (no changes)   |
| `--diff`              | Show diffs             |
| `--tags`              | Run specific tags      |
| `--skip-tags`         | Skip specific tags     |
| `--list-tasks`        | List all tasks         |
| `--list-tags`         | List all tags          |
| `--syntax-check`      | Check playbook syntax  |
| `--private-key`       | SSH private key path   |
| `--step`              | Interactive mode       |
| `--start-at-task`     | Start at specific task |

## 🔍 Troubleshooting Commands

```bash
# Test SSH connection directly
ssh -i ~/.ssh/vps_deploy_ed25519 vps_user@YOUR_VPS_IP

# Check inventory parsing
ansible-inventory -i inventory.ini --list

# Check which variables are set
ansible vps -i inventory.ini -m debug -a "var=hostvars[inventory_hostname]"

# Check Docker daemon
ansible vps -i inventory.ini -m shell -a "systemctl status docker"

# View Ansible config
ansible-config dump

# Check Python version on VPS
ansible vps -i inventory.ini -m shell -a "python3 --version"
```

## 📊 Deployment Workflow

```bash
# 1. Test connectivity
ansible vps -i inventory.ini -m ping

# 2. Dry run to see what would change
ansible-playbook playbook.yml --check --diff

# 3. Deploy (with verbose output)
ansible-playbook playbook.yml -v

# 4. Verify deployment
curl https://krapelnytsia.com.ua
curl https://krapelnytsia.com.ua/api/health

# 5. Check logs if needed
ansible vps -i inventory.ini -m shell -a "docker logs vcard-api --tail 100"
```

## 🎯 Common Use Cases

### Full Deployment

```bash
cd ansible
ansible-playbook playbook.yml
```

### Deploy Only Docker Services (Skip System Setup)

```bash
ansible-playbook playbook.yml --tags deploy,health
```

### Update Environment Variables Only

```bash
ansible-playbook playbook.yml --tags env
```

### Check Docker and Network Setup

```bash
ansible-playbook playbook.yml --tags docker,network --check
```

### Cleanup Only (Remove Dangling Images)

```bash
ansible-playbook playbook.yml --tags cleanup
```

### Health Check Only

```bash
ansible-playbook playbook.yml --tags health
```

## 🔐 Working with Secrets

### Pass secrets via command line

```bash
ansible-playbook playbook.yml \
  -e "telegram_bot_token=YOUR_TOKEN" \
  -e "telegram_master_id=YOUR_ID"
```

### Pass secrets via environment

```bash
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_MASTER_ID="your_id"
ansible-playbook playbook.yml
```

### Use Ansible Vault (for production)

```bash
# Create encrypted vars file
ansible-vault create ansible/vars/secrets.yml

# Edit encrypted file
ansible-vault edit ansible/vars/secrets.yml

# Deploy with vault
ansible-playbook playbook.yml --ask-vault-pass
```

## 🐳 Docker Management via Ansible

```bash
# View all containers
ansible vps -i inventory.ini -m shell -a "docker ps -a"

# View container logs
ansible vps -i inventory.ini -m shell -a "docker logs vcard-api --tail 100 --follow"

# Restart all services
ansible vps -i inventory.ini -m shell -a "cd /home/vps_user/astro-vcard && docker compose restart"

# View Docker disk usage
ansible vps -i inventory.ini -m shell -a "docker system df"

# Prune system (careful!)
ansible vps -i inventory.ini -m shell -a "docker system prune -f"
```

## 📝 Notes

- Always test with `--check` before actual deployment
- Use `-v` for verbose output when debugging
- Tags make it easy to run specific parts of deployment
- Ansible is idempotent - safe to run multiple times
- Keep secrets out of inventory.ini (use environment or vault)

## 🔗 Quick Links

- [Ansible Docs](https://docs.ansible.com/)
- [Common Modules](https://docs.ansible.com/ansible/latest/collections/index_module.html)
- [Docker Module](https://docs.ansible.com/ansible/latest/collections/community/docker/docker_compose_v2_module.html)
