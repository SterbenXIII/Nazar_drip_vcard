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

### Staging and production deployment

After CI succeeds on `main`, GitHub Actions deploys only to `https://staging.havenhub.com.ua`. The staging API has a separate SQLite volume and sends email to an internal Mailpit service; it does not use production Telegram or email credentials. Promotion to `https://havenhub.com.ua` is a separate manual workflow using the exact verified staging release. See the [deployment contract](./ops/ansible/README.md#production-deployment-contract).

Before staging can receive HTTPS traffic, add `A staging → 72.61.138.53` in NIC.UA. Keep the existing `@`, `www`, and all mail records unchanged. Staging requires HTTP Basic Auth and `noindex`; `www.havenhub.com.ua` redirects to the production apex.

---

## 🛠 Available Commands

| Command              | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `make help`          | Show all commands                           |
| `make dev`           | Start local stack                           |
| `make logs`          | View service logs                           |
| `make verify-deploy` | Authenticated staging and API health checks |

---

## 📖 Documentation

- [Ansible deployment quick reference](./docs/deployment/ansible-quickref.md) — Setup & troubleshooting guide
- [AGENTS.md](./AGENTS.md) — Architecture & development conventions

---

## 🔐 Security

- ✅ SSH-based VPS deployment (no exposed passwords)
- ✅ GitHub Secrets for environment variables
- ✅ Automated SSL certificates (Let's Encrypt)
- ✅ Telegram notifications for production deployments
- ✅ SQLite backups to Telegram

---

## 📄 License

MIT
