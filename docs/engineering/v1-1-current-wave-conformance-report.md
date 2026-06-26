# V1.1 Current-Wave Conformance Report

## Scope

This report covers the AFK-verifiable V1.1 runtime path after slices #18, #19,
#21, #22, #23, #24, #25, #27, and #28.

It does not claim live Codex plugin lifecycle or MCP approval behavior. Those
remain HITL blockers in #20 and #26 because this repository currently contains
no installable `.codex-plugin/plugin.json` package or plugin-scoped MCP manifest
to exercise against the Codex host.

## Pass

- `UserPromptSubmit` fixtures decode through the host event codec and preserve
  runtime provenance.
- `SemanticRuntimeFacade.evaluateAndRecordPrompt` appends Prompt Gate records,
  opens a Case, returns compact additional context, and exposes the committed
  record ids.
- `semantic_get_case` reconstructs the Case from durable JSONL ledger replay
  after creating a new runtime facade instance.
- The clarification path records pending clarification state, resolves a later
  answer in the same host session, and transitions the same Case.
- A validate-only Case denies supported `apply_patch` edit attempts through
  `PreToolUse` Action Gate using the recorded `turn_id -> case_id` binding.
- `semantic_compile_vocabulary_draft` records vocabulary source evidence and a
  draft without publish authority.
- `semantic_compile_and_publish_vocabulary` is a separate authority command and
  records source, draft, and package publication records.
- Retrying the same prompt operation id returns the prior Prompt Gate commit
  without duplicate prompt, case, or decision records.
- Retrying the same state-changing Action Gate operation id returns the prior
  recorded decision without duplicate action records.
- Concurrent sessions do not cross-bind Cases, and distinct `ProjectRef`
  worktree partitions do not share prompt or action records.
- Runtime storage unavailable is represented as degraded integration health.
  Managed Prompt Gate blocks, unmanaged projects no-op, managed Action Gate
  write paths deny, and read-only MCP query paths follow an explicit allow
  policy.
- Ledger busy is typed: Prompt Gate exposes `PromptGateLedgerBusyError`, and
  Action Gate returns a `defer` decision with `retryAfterMs`.
- Host hook timeout, crash, and malformed output are represented as host-level
  non-guarantee integration-health notes.

## Known Limitations

- The current durable substrate is JSONL under the runtime data root. It proves
  replay, partitioning, idempotency, and degraded behavior, but it is not the
  final SQLite Durable Ledger.
- Action Gate supported write coverage is limited to `apply_patch`. Other write
  vectors such as shell scripts, indirect binaries, and host execution while
  hooks are unavailable remain non-guarantees.
- Ledger corruption is represented through decode errors and degraded behavior,
  but there is no repair workflow in this wave.
- Vocabulary MCP support is facade-shaped and MCP-request-shaped, not a live
  Codex MCP server.

## HITL Blockers

- #20 must verify live Codex plugin install, enable, disable, update, uninstall,
  reinstall, hook trust, plugin data retention, and plugin-bundled MCP
  availability. No installable plugin package is present in this repo yet.
- #26 must verify live Codex MCP approval policy behavior for query tools and
  authority commands. Static metadata exists, but host approval UX is not
  verifiable without the live plugin/MCP package from #20.

## Verification

Passing commands:

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm knip
```

Latest passing test coverage: 17 test files, 43 tests.

`pnpm verify` reaches the final `effect:verify` step and then fails on
pre-existing Effect harness baseline drift:

- target packages are pinned to Effect `4.0.0-beta.83`; the harness expects
  `4.0.0-beta.90`
- `.effect-harness.json` source split and package baseline are behind the
  harness expectation
- local `.codex/skills/effect-code` and `effect-feedback` templates differ from
  the current harness runtime template

This report treats the harness drift as an environment/baseline blocker, not as
evidence of failure in the V1.1 current-wave runtime slices.
