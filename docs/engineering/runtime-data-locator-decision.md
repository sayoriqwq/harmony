# RuntimeDataLocatorDecision

## Decision

V1.1 runtime adapters locate durable probe state through `RuntimeDataLocator`.
The locator takes an explicit data root, normally Codex `PLUGIN_DATA`, plus a
Harmony-owned `ProjectRef`. It does not derive durable project identity from the
adapter process `cwd`.

## Project Identity

`ProjectRef.projectId` is the stable project identity input. `ProjectRef.worktreeId`
is an optional partition for worktree-shaped state. `ProjectRef.canonicalRoot`
is recorded with probe metadata for diagnostics, but it is not used as the
filesystem partition key.

Hook and MCP caller `cwd` values are host provenance only. They can differ for
the same project and still resolve the same durable probe ledger.

## Probe Ledger

This slice uses a JSONL probe ledger under the located project data root:

```text
<dataRoot>/projects/<projectId-key>/default/probe-ledger.jsonl
<dataRoot>/projects/<projectId-key>/worktrees/<worktreeId-key>/probe-ledger.jsonl
```

Each probe record is schema encoded/decoded and includes:

- project reference
- operation id
- origin
- host provenance metadata

This is not the final durable Semantic Ledger. It only proves that peer hook and
MCP adapters can share durable state without sharing process memory.

## Follow-Up Slices

Durable Ledger should replace this JSONL probe with SQLite-backed append,
idempotency, sequence allocation, and corruption handling. Runtime Facade, Prompt
Gate, MCP Adapter, and Action Gate should depend on `RuntimeDataLocator` rather
than deriving their own storage roots.
