# 问题跟踪：GitHub

本仓库的 Issue 和 PRD 记录在 `sayoriqwq/harmony` 的 GitHub Issues。所有操作使用 `gh` CLI。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`。需要时同时获取 labels，并用 `jq` 过滤评论。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，按任务需要增加 `--label` 和 `--state`。
- **评论 issue**：`gh issue comment <number> --body "..."`
- **添加 / 移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭 issue**：`gh issue close <number> --comment "..."`

在当前 clone 内运行时，优先从 `git remote -v` 推断 repo。当前 origin 是 `https://github.com/sayoriqwq/harmony.git`。

## 当 skill 要求发布到问题跟踪系统

创建 GitHub issue。

## 当 skill 要求获取相关工单

运行 `gh issue view <number> --comments`。
