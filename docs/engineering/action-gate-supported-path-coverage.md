# Action Gate Supported Path Coverage

## Current Strong Coverage

- `apply_patch` is treated as a supported write path when Codex runs the
  `PreToolUse` hook.
- The gate resolves policy through `turn_id -> case_id` binding recorded by
  Prompt Gate.
- Validate-only Cases with prohibited `rewrite` actions deny `apply_patch`.

## Current Read-Only Policy

- `mcp__semantic_runtime__semantic_status` is allowed as a read-only query.
- `mcp__semantic_runtime__semantic_get_case` is allowed as a read-only query.

## Non-Guarantees

This slice is not a complete filesystem sandbox. It does not claim to block
arbitrary shell writes, indirect scripts, custom binaries, or host execution when
the hook is unavailable, untrusted, timed out, or malformed.

Future hardening should add explicit reports for Bash best-effort coverage,
known bypasses, and core-enforcement coverage.
