# ADR 0007: Use Codex App as the V1.1 Semantic Runtime Host

Harmony will postpone a custom Semantic Workbench and use Codex app as the V1.1 interaction and review host. Codex app provides threads, clarification UX, file and diff review, artifact preview, browser support, approvals, parallel work, and automations. Harmony remains responsible for semantic truth through the headless core, versioned semantic packages, typed cases and corrections, patch candidates, regression, and an append-only ledger.

## Decision

Build V1.1 as a Codex-hosted Semantic Runtime:

- A Codex plugin packages hooks, skills, and an MCP server.
- `UserPromptSubmit` hook becomes the semantic prompt gate.
- `PreToolUse` hook becomes the action gate for prohibited behavior.
- MCP exposes a small facade over the existing headless runtime.
- Codex threads and artifacts replace the first version of a custom workbench UI.
- SQLite append-only ledger becomes the runtime persistence target.
- Codex Memory is not a semantic authority.

## Rationale

The V1 headless core already proves the semantic loop. The next risk is spending too early on a custom workbench before real cases stress the model. Codex app already provides the interaction shell needed for dogfooding, while Harmony can stay focused on semantic invariants, persistence, gates, and correction/regression flows.

This preserves the core boundary:

- Codex app handles conversation, review, approval, artifact preview, and automation.
- Harmony headless core decides semantic validity, package activation, correction legality, patch promotion, and regression outcome.

## Consequences

- V1.1 issues should target plugin, hook, MCP, ledger, and trace artifact seams instead of React workbench pages.
- Prompt and tool gates must be implemented as hard runtime hooks where possible, not merely as skill instructions.
- Domain activation must be scoped to user, project, and session/thread; it cannot be a global mutable flag.
- Human-readable files under `.semantic/` are projections for review, not the source of runtime truth.
- Publication still requires the core patch and regression gate.

## Alternatives Rejected

- Build a full custom Semantic Workbench now: rejected because it expands UI surface before enough real cases exist.
- Rely only on Codex skills: rejected because skill selection is not a hard guarantee.
- Use Codex Memory as Base Semantic Layer: rejected because memory is generated background state, not a versioned semantic package.
- Let Git-authored YAML or Markdown publish packages directly: rejected because it bypasses the append-only ledger and package version gate.
