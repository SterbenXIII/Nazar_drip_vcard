# 🎫 astro-vcard — Modern vCard Site with Lead Management

**A pnpm monorepo** combining:

- **Astro 5** static vCard site (production-ready, Ukrainian)
- **Hono** HTTP API (lead submissions, Telegram/Email notifications)
- **SQLite** database (zero DevOps)
- **Docker** deployment to Hostinger VPS

---

## 🚀 Quick Start

### Development

```bash
# Install dependencies (all packages)
pnpm install

# Start local dev environment
make dev
# → Frontend: http://localhost:4321
# → API: http://localhost:5678
```

### Production Deployment

```bash
# ONE-TIME setup (15 minutes)
make deploy-setup

# Then every push triggers automatic deployment:
git push origin main  # ✅ Deployed automatically
```

**That's it!** No manual VPS configuration needed. See [Ansible deployment quick reference](./docs/deployment/ansible-quickref.md) for details.

---

## 🛠 Available Commands

| Command             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `make help`         | Show all commands                                |
| `make dev`          | Start local stack                                |
| `make deploy-setup` | 🔴 **ONE-TIME: Auto VPS setup + GitHub secrets** |
| `make logs`         | View service logs                                |
| `make cert-init`    | Production SSL (Let's Encrypt)                   |

---

## 📖 Documentation

- [Ansible deployment quick reference](./docs/deployment/ansible-quickref.md) — Setup & troubleshooting guide
- [AGENTS.md](./AGENTS.md) — Architecture & development conventions

---

## 🔐 Security

- ✅ SSH-based VPS deployment (no exposed passwords)
- ✅ GitHub Secrets for environment variables
- ✅ Automated SSL certificates (Let's Encrypt)
- ✅ Telegram notifications for all deployments
- ✅ SQLite backups to Telegram

---

## 📄 License

MIT
