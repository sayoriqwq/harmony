---
name: semantic-runtime
description: Use the Harmony semantic runtime MCP tools and host-hook context when working in the Harmony repository.
---

# Harmony Semantic Runtime

Use this skill when the user asks about the Harmony semantic runtime, active semantic cases, prompt/action gate behavior, or vocabulary compilation.

Before rewriting project files, prefer checking runtime state through the `semantic_status` MCP tool. When a case id is available from hook context, inspect it with `semantic_get_case` before deciding whether an edit is allowed.

The MCP server is named `semantic_runtime`. Read-only tools are:

- `semantic_status`
- `semantic_get_case`
- `semantic_tool_metadata`

Vocabulary write tools are:

- `semantic_compile_vocabulary_draft`
- `semantic_compile_and_publish_vocabulary`

Treat hook blocks as authoritative. If a `UserPromptSubmit` or `PreToolUse` hook returns a block/clarification message, answer that constraint instead of attempting to bypass it.
