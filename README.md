# 🎫 astro-vcard — Modern vCard Site with Lead Management

**A pnpm monorepo** combining:

- **Astro 7.3.1** static vCard site (production-ready, Ukrainian)
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

### VPS Stage Deployment

Before the first deploy, configure SSH access, DNS, and inbound ports 80/443, then add the GitHub Actions variables and secrets listed in the [deployment contract](./ops/ansible/README.md#github-actions-variables-and-secrets). A successful CI run on `main` triggers deployment. The old `make deploy-setup` helper is disabled because it does not match the current protected HTTPS stack.

The VPS stage target is `havenhub.tech` and `www.havenhub.tech`; it is authenticated, noindex, and does not accept lead submissions. No deployment has been performed by this change.

---

## 🛠 Available Commands

| Command             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `make help`         | Show all commands                                |
| `make dev`          | Start local stack                                |
| `make logs`         | View service logs                                |
| `make verify-deploy` | Authenticated stage and API health checks        |

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
