# Historical exposure incident-response runbook

## Scope and authorization

## MANUAL SECURITY ACTION REQUIRED

This repository must not rotate credentials, mutate remote systems, rewrite history, force-push, or put secret values in issues, logs, or documentation. Those actions require a restricted incident record and written authorization from the service and repository owners.

The initial commit `f8d69cc13c9f9b15d70f35508faf7602ef40cad7` historically exposed these categories:

- Hostinger API token and Context7 API key.
- ACME account private key, local TLS private key/certificate, and SSH private key.
- Lead database content: 47 rows in `apps/api/data/leads.db`; `data/leads.db` was an empty duplicate.

Record only the affected system, operator confirmation, revocation timestamp, and residual-risk decision. Do not copy secret values, certificate material, Telegram IDs, or lead records into the incident record.

## Controlled credential rotation

1. Create a replacement Hostinger credential in the approved secret store, update the protected deployment secret, verify the intended service, then revoke the old credential.
2. Repeat the same overlap-and-verify sequence for Context7. Keep it outside project configuration and Git.
3. Create a new ACME account key, reissue every affected certificate, install the replacement TLS material, and retire the old local/deployed keys.
4. Generate a new SSH keypair, authorize and verify the new key, remove the old public key, and revoke old repository/CI access.
5. Preserve the protected Telegram allowlist only in the approved runtime secret path; verify a canonical deploy rewrites `apps/api/allowed_chats.json` with mode `0600` without logging values.
6. Have an authorized privacy/legal owner record the lead-data exposure assessment. Do not attach exports or sample data.

Rotation is complete only when each replacement is verified and the corresponding old credential or key is revoked.

## Authorized history rewrite program

Start only after all rotations are complete and written authorization covers force-pushing every protected branch and tag.

1. Freeze releases and protected-branch changes. Inventory remote branches, tags, release artifacts, clone/fork owners, and the backup retention owner.
2. Create an encrypted, access-controlled mirror backup outside the repository. Do not store its location or contents in Git.
3. In a disposable mirror clone, use `git filter-repo` to remove historical secret-only paths (certificate material, lead databases, and legacy MCP configuration). Use an external, access-controlled replacement-text file for embedded private-key blocks; never add it to the repository.
4. Before publication, run redacted full-history Gitleaks, verify affected historical paths and embedded private-key material are absent from every ref, then run `git fsck`, fresh-clone, frozen-install, build, and current-tree secret-scan checks.
5. Under the incident authorization only, force-push rewritten branches/tags, restore protections, invalidate stale release artifacts where possible, and require collaborators to reclone.
6. Record the residual risk: forks, caches, prior clones, and third-party archives cannot be forcibly erased. Rotate again if validation discovers any new exposure.

## Completion record

The incident owner must retain a restricted completion record with: authorization, rotations/revocations, certificate reissue confirmation, privacy assessment confirmation, rewrite validation results, force-push approval, collaborator notification, and residual risk. Repository documentation must retain only this redacted runbook and the statement above.
