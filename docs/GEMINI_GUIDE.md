# Gemini & MCP Usage Guide

This guide details how to effectively use the configured MCP servers with Gemini in the `astro-vcard` project.

## Available MCP Servers

### 1. Sequential Thinking (`mcp/sequentialthinking`)

**Purpose:** Solves complex, multi-step problems by breaking them down into manageable thoughts.
**When to use:**

- Planning architectural changes.
- Debugging complex issues where the root cause is unclear.
- Refactoring large components or modules.
- Whenever a task requires more than 3 logical steps.

**Usage:**

- Start with a clear goal.
- Use `sequentialthinking` to formulate a plan.
- Revise the plan as new information is discovered.

### 2. Context7 (`mcp/context7`)

**Purpose:** Provides up-to-date documentation for libraries and frameworks.
**When to use:**

- Checking API references for Astro, Hono, Zod, or other dependencies.
- verifying syntax for specific library versions.
- **Critical:** Always check library versions in `package.json` before querying.

**Usage:**

1. `resolve-library-id`: Find the correct library ID (e.g., "astro", "hono").
2. `get-library-docs`: Retrieve documentation for a specific topic.

### 3. Memory (`@modelcontextprotocol/server-memory`)

**Purpose:** Persists architectural decisions, project context, and user preferences across sessions.
**When to use:**

- Storing design decisions ("Why did we choose Strategy pattern for notifications?").
- Recording recurring user preferences ("User prefers 'standard' linter rules").
- Keeping track of long-term project goals.

**Usage:**

- `create_entities`: Store new information.
- `read_graph`: Retrieve stored information.

### 4. Hostinger MCP (`hostinger-api-mcp`)

**Purpose:** Interacts with Hostinger services for deployment and management.
**When to use:**

- Checking VPS status.
- Managing DNS records.
- deployment verification (if applicable via API).

## Best Practices for Gemini

1. **Check `AGENTS.md` First:** Always reference the project's single source of truth before suggesting changes.
2. **Use `sequentialthinking` for Plans:** extensive changes should start with a thought process, not code.
3. **Update `memory`:** If a significant decision is made, store it in the memory graph.
4. **Verify with `context7`:** Don't guess APIs. If you are unsure about a Hono or Astro feature, look it up.
5. **Security:** Never output API keys or secrets in the chat. Use `.env` files and `gitignore`.

## Example Workflow: Adding a New Feature

1. **Understand:** Read `AGENTS.md` and related code.
2. **Plan:** Use `sequentialthinking` to outline the steps (Schema -> API -> UI).
3. **Research:** Use `context7` to check for best practices in Astro 5 or Hono.
4. **Implement:** Write code, following project conventions (e.g., specific folder structure).
5. **Document:** Update `AGENTS.md` if the architecture changes.
6. **Memories:** Save the new feature context to `memory`.
