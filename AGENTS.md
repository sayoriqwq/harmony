# AGENTS.md

@/Users/sayori/.codex/RTK.md

## Agent skills

### Issue tracker

Issue 和 PRD 统一记录在 `sayoriqwq/harmony` 的 GitHub Issues。详见 `docs/agents/issue-tracker.md`。

### Triage labels

本仓库使用 mattpocock/skills 的默认 triage label 词汇。详见 `docs/agents/triage-labels.md`。

### Domain docs

本仓库使用 single-context 领域文档布局。详见 `docs/agents/domain.md`。

<!-- effect-harness:start -->
# Effect Harness

This repo uses `/Users/sayori/Desktop/yume-infra/effect-harness` as its Effect harness root.

Before writing non-trivial Effect code, read:

- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/LLMS.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/harness/index.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect.subtree.json`
- `.effect-harness.json`

Runtime skills and agents installed by the harness:

- Use `.codex/skills/effect-code/SKILL.md` for Effect implementation and review.
- Use `.codex/skills/effect-feedback/SKILL.md` for reusable target feedback.
- Use `.codex/agents/effect-worker.md` when delegating focused Effect subagent work.

Use:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Do not import from `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect`.
Do not copy effect-harness `.codex/skills`; this target only uses the runtime installed under
`.codex/`.
<!-- effect-harness:end -->
