# Architectural Planning Prompt

**Goal:** Plan a [Feature Name/Change Description]

**Tools:**

- `sequentialthinking`: To break down the complexity.
- `memory`: To retrieve existing architectural constraints and store new decisions.
- `context7`: To verify library capabilities.

**Steps:**

1. **Retrieve Context:**
   - Read `AGENTS.md` to understand the current architecture.
   - Call `memory` to see if there are related past decisions.

2. **Analyze Requirements:**
   - Use `sequentialthinking` to list all requirements and constraints.
   - Identify potential impacts on `apps/web` (Astro) and `apps/api` (Hono).

3. **Draft Design:**
   - Propose data models (`packages/shared`).
   - Define API endpoints.
   - Sketch UI components.

4. **Validate:**
   - Use `context7` to ensure the proposed design uses valid patterns for Astro 5 / Hono.

5. **Output:**
   - Create a detailed `implementation_plan.md`.
   - Ask for user review.
