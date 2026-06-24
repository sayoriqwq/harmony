# 领域文档

本文档说明工程类 skill 在探索本仓库时应如何读取领域文档。

## 布局

本仓库使用 single-context 领域文档布局。

先读取根目录的 `CONTEXT.md`。它是当前面向 agent 的项目领域语言、产品立场和文档层级摘要。

## 探索前先读

- 根目录 `CONTEXT.md`。
- `docs/README.md`，用于确认文档层级、阅读顺序和权威关系。
- 与任务相关的 `docs/` 源文档。
- 如果 `docs/adr/` 存在，并且其中的 ADR 涉及当前修改范围，也要读取。

如果预期文件或目录不存在，静默继续。除非任务明确要求文档搭建或架构决策清理，否则不要把缺失本身当作问题报告。

## 当前源文档

- `docs/concept.md`
- `docs/theory/research-map.md`
- `docs/first-phase/mvp-loop-principles.md`
- `docs/first-phase/semantic-system-principles-v0.1.md`
- `docs/first-phase/v1-effect-implementation-alignment.md`
- `docs/engineering/effect.md`

## 使用项目词汇

在 issue 标题、实现计划、重构建议、假设或测试名中命名领域概念时，使用 `CONTEXT.md` 和源文档中已经定义的术语。

不要随意替换这些已建立的概念名：Vocabulary Source、Semantic Package、Active Semantic Environment、Semantic IR、Semantic Lint、Case、Correction、CaseSemanticEdit、Correction Diagnosis、Semantic Patch Candidate、Regression Case。

如果需要的概念还不在术语表中，要么说明这是文档语言缺口，要么重新判断当前工作是否正在引入新概念。

## 标出 ADR 冲突

如果输出与已有 ADR 冲突，必须显式指出，不要静默覆盖。
